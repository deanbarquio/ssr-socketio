// src/app/products.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { SocketService } from '../core/socket.service';

export interface Product {
  id: number;
  name: string;
  price: number | string;
  createdAt?: string;
  updatedAt?: string;
}

// While you're not behind Nginx yet:
const API_BASE = 'http://localhost:4000'; // later: '' and call /api/...

const CACHE_KEY = 'products_cache_v1';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private listSubject = new BehaviorSubject<Product[]>([]);
  list$ = this.listSubject.asObservable();

  private isBrowser = false;
  private loading = false;

  constructor(
    private http: HttpClient,
    private sockets: SocketService,
    @Inject(PLATFORM_ID) pid: Object
  ) {
    this.isBrowser = isPlatformBrowser(pid);

    // 1) Seed from cache immediately (browser only)
    if (this.isBrowser) {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        try {
          const cached = JSON.parse(raw) as Product[];
          if (Array.isArray(cached)) this.listSubject.next(cached);
        } catch {}
      }
    }

    // 2) Only fetch once if we have no cache yet
    if (this.isBrowser && this.listSubject.value.length === 0) {
      this.refresh(); // first load
    }

    // 3) Wire Socket.IO -> refetch on CRUD emits
    this.sockets.on('product:created', () => this.refresh());
    this.sockets.on('product:updated', () => this.refresh());
    this.sockets.on('product:deleted', () => this.refresh());
  }

  /** Hit the DB and refresh local cache; only called on socket emits or first load without cache */
  refresh() {
    if (this.loading) return;
    this.loading = true;
    this.http.get<Product[]>(`${API_BASE}/api/products`).subscribe({
      next: (rows) => {
        this.listSubject.next(rows ?? []);
        if (this.isBrowser) {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(rows ?? []));
          } catch {}
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  /** Client-side CRUD calls do NOT mutate cache; we wait for server emit then refresh. */
  create(name: string, price: number) {
    return this.http.post<Product>(`${API_BASE}/api/products`, { name, price });
  }
  update(id: number, data: { name: string; price: number }) {
    return this.http.put<Product>(`${API_BASE}/api/products/${id}`, data);
  }
  delete(id: number) {
    return this.http.delete<{ ok: boolean }>(`${API_BASE}/api/products/${id}`);
  }

  /** Optional: clear persisted cache (e.g., logout) */
  clearCache() {
    if (this.isBrowser) localStorage.removeItem(CACHE_KEY);
    this.listSubject.next([]);
  }
}

import { Component, inject, signal } from '@angular/core';
import { CommonModule, NgIf, NgFor, AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductsService, Product } from './products.service';

type SortKey = 'id' | 'name' | 'price' | 'createdAt';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIf, NgFor, AsyncPipe, CurrencyPipe, DatePipe],
  templateUrl: './products.html',
  styleUrls: ['./products.css'],
})
export class ProductsPageComponent {
  p = inject(ProductsService);

  // UI state
  search = signal<string>('');
  sortKey = signal<SortKey>('id');
  sortDir = signal<SortDir>('desc');

  // Modal state
  showForm = signal<boolean>(false);
  editing = signal<Product | null>(null);
  form = signal<{ name: string; price: string | number }>({ name: '', price: '' });

  // ---- Actions ----
  openCreate() {
    this.editing.set(null);
    this.form.set({ name: '', price: '' });
    this.showForm.set(true);
  }

  openEdit(row: Product) {
    this.editing.set(row);
    this.form.set({ name: row.name, price: String(row.price ?? '') });
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editing.set(null);
  }

  async save() {
    const { name, price } = this.form();
    const priceNum = Number(price);
    if (!name?.trim() || isNaN(priceNum)) return;

    if (this.editing()) {
      await this.p.update(this.editing()!.id, { name: name.trim(), price: priceNum }).toPromise();
    } else {
      await this.p.create(name.trim(), priceNum).toPromise();
    }
    this.closeForm();
  }

  async remove(row: Product) {
    if (!confirm(`Delete "${row.name}"?`)) return;
    await this.p.delete(row.id).toPromise();
  }

  // ---- Sorting / Filtering helpers ----
  setSort(key: SortKey) {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  filteredSorted(list: Product[] | null | undefined): Product[] {
    if (!list || !Array.isArray(list)) return [];
    const q = this.search().toLowerCase().trim();

    let out = q
      ? list.filter(
          (r) =>
            r.name?.toLowerCase().includes(q) ||
            String(r.price ?? '')
              .toLowerCase()
              .includes(q) ||
            String(r.id).includes(q)
        )
      : [...list];

    const key = this.sortKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;

    out.sort((a: any, b: any) => {
      const av = a[key] ?? '';
      const bv = b[key] ?? '';
      if (key === 'price' || key === 'id') {
        const na = Number(av);
        const nb = Number(bv);
        if (na < nb) return -1 * dir;
        if (na > nb) return 1 * dir;
        return 0;
      }
      const sa = String(av).toLowerCase();
      const sb = String(bv).toLowerCase();
      return sa < sb ? -1 * dir : sa > sb ? 1 * dir : 0;
    });

    return out;
  }

  // ---- Template input handlers ----
  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement)?.value ?? '';
    this.search.set(value);
  }

  onFormNameInput(event: Event) {
    const value = (event.target as HTMLInputElement)?.value ?? '';
    const current = this.form();
    this.form.set({ name: value, price: current.price });
  }

  onFormPriceInput(event: Event) {
    const value = (event.target as HTMLInputElement)?.value ?? '';
    const current = this.form();
    this.form.set({ name: current.name, price: value });
  }
}

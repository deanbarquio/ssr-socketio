import { Injectable, Inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket?: Socket;
  connected = signal(false);
  lastPong = signal<number | null>(null);

  constructor(@Inject(PLATFORM_ID) private pid: Object) {
    if (isPlatformBrowser(this.pid)) {
      this.socket = io('http://localhost:3000', {
        path: '/socket.io',
        transports: ['websocket'],
        withCredentials: true,
      });
      this.socket.on('connect', () => this.connected.set(true));
      this.socket.on('disconnect', () => this.connected.set(false));
      this.socket.on('pong', (payload) => this.lastPong.set(payload.at));
    }
  }

  ping(data: any = {}) {
    if (this.socket?.connected) this.socket.emit('ping', data);
  }

  on<T = any>(event: string, cb: (data: T) => void) {
    (this as any).socket?.on(event, cb);
  }
  off(event: string, cb?: (...a: any[]) => void) {
    (this as any).socket?.off(event, cb as any);
  }
}

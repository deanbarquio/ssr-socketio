import { Component, inject } from '@angular/core';
import { AsyncPipe, NgFor, NgIf, CurrencyPipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../core/socket.service';
import { ProductsService } from '../products/products.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe, FormsModule, NgFor, NgIf, CurrencyPipe, SlicePipe],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class HomeComponent {
  s = inject(SocketService);
  p = inject(ProductsService);

  name = '';
  price: any = '';

  ping() {
    this.s.ping({ at: Date.now() });
  }

  add() {
    const priceNum = Number(this.price);
    if (!this.name || isNaN(priceNum)) return;
    this.p.create(this.name, priceNum).subscribe(() => {
      this.name = '';
      this.price = '';
    });
  }
}

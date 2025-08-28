import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.page';
import { ProductsPageComponent } from './products/products.page';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'products', component: ProductsPageComponent },
];

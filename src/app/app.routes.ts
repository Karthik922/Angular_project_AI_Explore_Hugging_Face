import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'users' },
  { path: 'users', loadComponent: () => import('./users/user-list/user-list').then((m) => m.UserList) },
  { path: 'users/new', loadComponent: () => import('./users/user-form/user-form').then((m) => m.UserForm) },
  { path: 'users/:id/edit', loadComponent: () => import('./users/user-form/user-form').then((m) => m.UserForm) },
  { path: 'gallery', loadComponent: () => import('./gallery/gallery').then((m) => m.Gallery) },
  { path: '**', redirectTo: 'users' },
];

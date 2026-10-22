import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Drawer } from 'primeng/drawer';
import { Header } from './layout/header/header';
import { Sidebar } from './layout/sidebar/sidebar';

/** Matches Tailwind's `md` breakpoint, where the sidebar switches from drawer to rail. */
const DESKTOP_QUERY = '(min-width: 768px)';

@Component({
  imports: [RouterOutlet, Drawer, Header, Sidebar],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly sidebarCollapsed = signal(false);
  protected readonly mobileMenuOpen = signal(false);

  protected toggleMenu(): void {
    const desktop = typeof matchMedia === 'function' && matchMedia(DESKTOP_QUERY).matches;
    if (desktop) this.sidebarCollapsed.update((v) => !v);
    else this.mobileMenuOpen.update((v) => !v);
  }
}

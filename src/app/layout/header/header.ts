import { Component, inject, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ThemeService } from '../../core/theme.service';
import { ThemePanel } from '../theme-panel/theme-panel';

@Component({
  selector: 'app-header',
  imports: [RouterLink, ButtonModule, ThemePanel],
  template: `
    <header
      class="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-surface bg-surface-0 px-3 dark:bg-surface-900 sm:px-4"
    >
      <p-button
        icon="pi pi-bars"
        [text]="true"
        [rounded]="true"
        severity="secondary"
        ariaLabel="Toggle navigation"
        (onClick)="menuToggle.emit()"
      />
      <a routerLink="/users" class="brand flex items-center gap-2 text-lg font-semibold text-color no-underline">
        <span class="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-contrast">
          <i class="pi pi-shield"></i>
        </span>
        <span>User Admin</span>
      </a>

      <div class="ml-auto flex items-center gap-1">
        <p-button
          icon="pi pi-palette"
          [text]="true"
          [rounded]="true"
          severity="secondary"
          ariaLabel="Change color theme"
          title="Theme"
          (onClick)="toggleThemePanel($event)"
        />
        <p-button
          [icon]="settings().dark ? 'pi pi-sun' : 'pi pi-moon'"
          [text]="true"
          [rounded]="true"
          severity="secondary"
          [ariaLabel]="settings().dark ? 'Switch to light mode' : 'Switch to dark mode'"
          [title]="settings().dark ? 'Light mode' : 'Dark mode'"
          (onClick)="theme.toggleDarkMode()"
        />
      </div>
    </header>

    <!-- Popover, SelectButton and FormsModule load on first use, prefetched once the page is idle. -->
    @defer (when themePanelRequested(); prefetch on idle) {
      <app-theme-panel [openAt]="themePanelAnchor" />
    }
  `,
})
export class Header {
  protected readonly theme = inject(ThemeService);
  protected readonly settings = this.theme.settings;

  readonly menuToggle = output<void>();

  protected readonly themePanelRequested = signal(false);
  protected themePanelAnchor: HTMLElement | null = null;
  private readonly themePanel = viewChild(ThemePanel);

  protected toggleThemePanel(event: Event): void {
    const panel = this.themePanel();
    if (panel) {
      panel.toggle(event);
    } else {
      // First click: load the panel; it opens itself at this anchor once rendered.
      this.themePanelAnchor = event.currentTarget as HTMLElement;
      this.themePanelRequested.set(true);
    }
  }
}

import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Ripple } from 'primeng/ripple';
import { Tooltip } from 'primeng/tooltip';
import { NAV_ITEMS } from '../nav-items';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, Ripple, Tooltip],
  template: `
    <nav class="flex flex-col gap-1 p-3" aria-label="Main">
      @for (item of items; track item.link) {
        <a
          pRipple
          [routerLink]="item.link"
          routerLinkActive="bg-primary text-primary-contrast hover:bg-primary!"
          [routerLinkActiveOptions]="{ exact: !!item.exact }"
          [pTooltip]="collapsed() ? item.label : undefined"
          tooltipPosition="right"
          class="p-ripple flex items-center gap-3 rounded-md px-3 py-2.5 text-color no-underline transition-colors hover:bg-emphasis"
          [class.justify-center]="collapsed()"
          (click)="navigate.emit()"
        >
          <i [class]="item.icon" class="text-base"></i>
          @if (!collapsed()) {
            <span class="font-medium whitespace-nowrap">{{ item.label }}</span>
          }
        </a>
      }
    </nav>
  `,
})
export class Sidebar {
  /** Icon-only mode for the desktop rail. */
  readonly collapsed = input(false);
  readonly navigate = output<void>();

  protected readonly items = NAV_ITEMS;
}

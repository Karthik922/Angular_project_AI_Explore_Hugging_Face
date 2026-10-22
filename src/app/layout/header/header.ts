import { Component, computed, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Popover } from 'primeng/popover';
import { SelectButton } from 'primeng/selectbutton';
import { Tooltip } from 'primeng/tooltip';
import {
  PRESET_NAMES,
  PRIMARY_COLORS,
  SURFACE_COLORS,
  PresetName,
  ThemeService,
  palette,
} from '../../core/theme.service';

@Component({
  selector: 'app-header',
  imports: [FormsModule, RouterLink, ButtonModule, Popover, SelectButton, Tooltip],
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
          pTooltip="Theme"
          tooltipPosition="bottom"
          (onClick)="themePanel.toggle($event)"
        />
        <p-button
          [icon]="settings().dark ? 'pi pi-sun' : 'pi pi-moon'"
          [text]="true"
          [rounded]="true"
          severity="secondary"
          [ariaLabel]="settings().dark ? 'Switch to light mode' : 'Switch to dark mode'"
          [pTooltip]="settings().dark ? 'Light mode' : 'Dark mode'"
          tooltipPosition="bottom"
          (onClick)="theme.toggleDarkMode()"
        />
      </div>
    </header>

    <p-popover #themePanel>
      <div class="flex w-64 flex-col gap-4">
        <section>
          <h3 class="mb-2 text-sm font-semibold text-muted-color">Primary</h3>
          <div class="flex flex-wrap gap-2">
            @for (color of primaryColors; track color.name) {
              <button
                type="button"
                class="size-5 cursor-pointer rounded-full border-0 outline-offset-2"
                [style.background]="color.swatch"
                [class.outline-2]="settings().primary === color.name"
                [style.outline-color]="color.swatch"
                [attr.aria-label]="color.name"
                [title]="color.name"
                (click)="theme.setPrimary(color.name)"
              ></button>
            }
          </div>
        </section>

        <section>
          <h3 class="mb-2 text-sm font-semibold text-muted-color">Surface</h3>
          <div class="flex flex-wrap gap-2">
            @for (color of surfaceColors; track color.name) {
              <button
                type="button"
                class="size-5 cursor-pointer rounded-full border-0 outline-offset-2"
                [style.background]="color.swatch"
                [class.outline-2]="settings().surface === color.name"
                [style.outline-color]="color.swatch"
                [attr.aria-label]="color.name"
                [title]="color.name"
                (click)="theme.setSurface(color.name)"
              ></button>
            }
          </div>
        </section>

        <section>
          <h3 class="mb-2 text-sm font-semibold text-muted-color">Preset</h3>
          <p-selectbutton
            [options]="presets"
            [ngModel]="settings().preset"
            (ngModelChange)="onPresetChange($event)"
            [allowEmpty]="false"
            size="small"
          />
        </section>
      </div>
    </p-popover>
  `,
})
export class Header {
  protected readonly theme = inject(ThemeService);
  protected readonly settings = this.theme.settings;

  readonly menuToggle = output<void>();

  protected readonly presets = PRESET_NAMES;
  protected readonly primaryColors = PRIMARY_COLORS.map((name) => ({ name, swatch: palette(name)[500] }));
  protected readonly surfaceColors = SURFACE_COLORS.map((name) => ({ name, swatch: palette(name)[500] }));

  protected onPresetChange(preset: PresetName | null): void {
    if (preset) this.theme.setPreset(preset);
  }
}

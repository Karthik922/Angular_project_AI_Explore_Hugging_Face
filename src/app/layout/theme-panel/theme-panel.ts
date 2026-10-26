import { AfterViewInit, Component, inject, input, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Popover } from 'primeng/popover';
import { SelectButton } from 'primeng/selectbutton';
import {
  PRESET_NAMES,
  PRIMARY_COLORS,
  SURFACE_COLORS,
  PresetName,
  ThemeService,
  palette,
} from '../../core/theme.service';

/** Theme picker popover. Lazy-loaded by the header (`@defer`) so it stays out of the initial bundle. */
@Component({
  selector: 'app-theme-panel',
  imports: [FormsModule, Popover, SelectButton],
  template: `
    <p-popover>
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
export class ThemePanel implements AfterViewInit {
  protected readonly theme = inject(ThemeService);
  protected readonly settings = this.theme.settings;

  /** Element to anchor to when the panel opens right after it finishes loading. */
  readonly openAt = input<HTMLElement | null>(null);

  private readonly popover = viewChild.required(Popover);

  protected readonly presets = PRESET_NAMES;
  protected readonly primaryColors = PRIMARY_COLORS.map((name) => ({ name, swatch: palette(name)[500] }));
  protected readonly surfaceColors = SURFACE_COLORS.map((name) => ({ name, swatch: palette(name)[500] }));

  ngAfterViewInit(): void {
    const target = this.openAt();
    if (target) this.popover().show(null, target);
  }

  toggle(event: Event): void {
    this.popover().toggle(event);
  }

  protected onPresetChange(preset: PresetName | null): void {
    if (preset) this.theme.setPreset(preset);
  }
}

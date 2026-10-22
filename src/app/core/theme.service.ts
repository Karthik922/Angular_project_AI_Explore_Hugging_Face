import { Injectable, signal } from '@angular/core';
import { definePreset, updatePreset, usePreset } from '@primeuix/themes';
import type { PaletteDesignToken, Preset } from '@primeuix/themes/types';
import Aura from '@primeuix/themes/aura';

// Only Aura is bundled up front (it is also the source of the color palettes); others load on demand.
const PRESET_LOADERS = {
  Aura: async () => Aura,
  Lara: () => import('@primeuix/themes/lara').then((m) => m.default),
  Nora: () => import('@primeuix/themes/nora').then((m) => m.default),
} satisfies Record<string, () => Promise<unknown>>;

export type PresetName = keyof typeof PRESET_LOADERS;
export const PRESET_NAMES = Object.keys(PRESET_LOADERS) as PresetName[];

export const PRIMARY_COLORS = [
  'emerald', 'green', 'lime', 'orange', 'amber', 'yellow', 'teal', 'cyan',
  'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
] as const;
export type PrimaryColor = (typeof PRIMARY_COLORS)[number];

export const SURFACE_COLORS = ['slate', 'gray', 'zinc', 'neutral', 'stone'] as const;
export type SurfaceColor = (typeof SURFACE_COLORS)[number];

export interface ThemeSettings {
  dark: boolean;
  preset: PresetName;
  primary: PrimaryColor;
  surface: SurfaceColor;
}

/** Class toggled on <html>; must match `darkModeSelector` in app.config and the Tailwind `dark` variant. */
export const DARK_CLASS = 'app-dark';
const STORAGE_KEY = 'theme-settings';

export function loadThemeSettings(): ThemeSettings {
  const defaults: ThemeSettings = {
    dark: typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches,
    preset: 'Aura',
    primary: 'blue',
    surface: 'slate',
  };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<ThemeSettings>;
    return {
      dark: typeof saved.dark === 'boolean' ? saved.dark : defaults.dark,
      preset: saved.preset && PRESET_NAMES.includes(saved.preset) ? saved.preset : defaults.preset,
      primary: PRIMARY_COLORS.includes(saved.primary!) ? saved.primary! : defaults.primary,
      surface: SURFACE_COLORS.includes(saved.surface!) ? saved.surface! : defaults.surface,
    };
  } catch {
    return defaults;
  }
}

/** Swatch values come from the preset's primitive palette, so all presets share the same color names. */
export function palette(color: PrimaryColor | SurfaceColor): PaletteDesignToken {
  return (Aura.primitive as Record<string, PaletteDesignToken>)[color];
}

function colorOverrides(s: ThemeSettings): Preset {
  const surface = { 0: '#ffffff', ...palette(s.surface) };
  return {
    semantic: {
      primary: palette(s.primary),
      colorScheme: { light: { surface }, dark: { surface } },
    },
  } as Preset;
}

function loadPreset(name: PresetName): Promise<Preset> {
  return PRESET_LOADERS[name]() as Promise<Preset>;
}

/** Synchronous preset for providePrimeNG; a saved non-Aura preset is swapped in by `ThemeService.init()`. */
export function initialPreset(): Preset {
  return definePreset(Aura as Preset, colorOverrides(loadThemeSettings()));
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly state = signal<ThemeSettings>(loadThemeSettings());
  readonly settings = this.state.asReadonly();

  /** Run as an app initializer so the saved preset and mode are in place before the first render. */
  async init(): Promise<void> {
    this.applyDarkMode(this.state().dark);
    const { preset } = this.state();
    if (preset !== 'Aura') usePreset(definePreset(await loadPreset(preset), colorOverrides(this.state())));
  }

  toggleDarkMode(): void {
    this.patch({ dark: !this.state().dark });
    this.applyDarkMode(this.state().dark);
  }

  async setPreset(preset: PresetName): Promise<void> {
    this.patch({ preset });
    const base = await loadPreset(preset);
    // Ignore a slow load that a newer selection has already superseded; read colors after the await
    // so a color picked while loading isn't lost.
    if (this.state().preset === preset) usePreset(definePreset(base, colorOverrides(this.state())));
  }

  setPrimary(primary: PrimaryColor): void {
    this.patch({ primary });
    updatePreset(colorOverrides(this.state()));
  }

  setSurface(surface: SurfaceColor): void {
    this.patch({ surface });
    updatePreset(colorOverrides(this.state()));
  }

  private patch(change: Partial<ThemeSettings>): void {
    this.state.update((s) => ({ ...s, ...change }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
    } catch {
      // Storage can be unavailable (private mode); the theme still works for this session.
    }
  }

  private applyDarkMode(dark: boolean): void {
    const root = document.documentElement;
    root.classList.toggle(DARK_CLASS, dark);
    // AG Grid's built-in themes switch their color scheme from this attribute.
    root.setAttribute('data-ag-theme-mode', dark ? 'dark' : 'light');
  }
}

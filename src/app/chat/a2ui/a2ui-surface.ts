import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { A2uiNode } from './a2ui-node';
import { A2uiMessage, buildSurfaces } from './a2ui.model';

/** Draws the surfaces described by a reply's A2UI messages, starting at each surface's "root" component. */
@Component({
  selector: 'app-a2ui-surface',
  imports: [A2uiNode],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-3' },
  template: `
    @for (surface of surfaces(); track surface.id) {
      @if (surface.components.has('root')) {
        <app-a2ui-node [surface]="surface" id="root" (ask)="ask.emit($event)" />
      }
    }
  `,
})
export class A2uiSurfaceView {
  readonly messages = input.required<readonly A2uiMessage[]>();
  /** A follow-up button was clicked: the question to send. */
  readonly ask = output<string>();

  protected readonly surfaces = computed(() => buildSurfaces(this.messages()));
}

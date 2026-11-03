import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { A2uiComponent, Surface, childIds, listItems, resolveText } from './a2ui.model';

/**
 * Renders one A2UI component and, recursively, its children. Unknown component types draw
 * nothing, so a newer server catalog cannot break the page. Buttons with an "ask" action emit
 * their question, which the chat sends as the next message.
 */
@Component({
  selector: 'app-a2ui-node',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './a2ui-node.scss',
  host: { '[style.flex]': 'flex()', '[class.a2-cell]': 'cell()', '[attr.title]': 'cell() ? text() : null' },
  template: `
    @let c = component();
    @if (c) {
      @switch (c.component) {
        @case ('Column') {
          <div class="a2-col">
            @for (childId of children(); track childId) {
              <app-a2ui-node [surface]="surface()" [id]="childId" [item]="item()" (ask)="ask.emit($event)" />
            }
          </div>
        }
        @case ('Row') {
          <div class="a2-row">
            @for (childId of children(); track childId) {
              <app-a2ui-node [surface]="surface()" [id]="childId" [item]="item()" (ask)="ask.emit($event)" />
            }
          </div>
        }
        @case ('Card') {
          @if (c.child) {
            <div class="a2-card"><app-a2ui-node [surface]="surface()" [id]="c.child" [item]="item()" (ask)="ask.emit($event)" /></div>
          }
        }
        @case ('List') {
          <div class="a2-list" role="list">
            @for (entry of items(); track $index) {
              <app-a2ui-node role="listitem" [surface]="surface()" [id]="templateId()" [item]="entry" (ask)="ask.emit($event)" />
            }
          </div>
        }
        @case ('Text') {
          @switch (c.variant) {
            @case ('h2') { <h2 class="a2-h2">{{ text() }}</h2> }
            @case ('h3') { <h3 class="a2-h3">{{ text() }}</h3> }
            @case ('body') { <p class="a2-body">{{ text() }}</p> }
            @case ('caption') { <span class="a2-caption">{{ text() }}</span> }
            @case ('label') { <span class="a2-label">{{ text() }}</span> }
            @default { <span>{{ text() }}</span> }
          }
        }
        @case ('Divider') {
          <hr class="a2-divider" />
        }
        @case ('Button') {
          <button type="button" class="a2-btn" [disabled]="!question()" (click)="ask.emit(question())">
            @if (c.child) {
              <app-a2ui-node [surface]="surface()" [id]="c.child" [item]="item()" />
            }
          </button>
        }
      }
    }
  `,
})
export class A2uiNode {
  readonly surface = input.required<Surface>();
  readonly id = input.required<string>();
  /** The current List item, for relative paths. */
  readonly item = input<unknown>(undefined);
  readonly ask = output<string>();

  protected readonly component = computed<A2uiComponent | undefined>(() => this.surface().components.get(this.id()));
  protected readonly children = computed(() => {
    const c = this.component();
    return c ? childIds(c) : [];
  });
  protected readonly items = computed(() => {
    const c = this.component();
    return c ? listItems(c, this.surface().data, this.item()) : [];
  });
  protected readonly templateId = computed(() => {
    const children = this.component()?.children;
    return children && !Array.isArray(children) ? children.componentId : '';
  });
  protected readonly text = computed(() => resolveText(this.component()?.text, this.surface().data, this.item()));
  protected readonly question = computed(() => {
    const event = this.component()?.action?.event;
    return event?.name === 'ask' ? (event.context?.question ?? '') : '';
  });
  /** A weighted Text in a Row is a table cell: it shares the row by weight and stays on one line. */
  protected readonly cell = computed(() => this.component()?.component === 'Text' && !!this.component()?.weight);
  /** Row children grow by `weight`. Cells start from 0 so a row never wraps; cards get a basis so narrow screens wrap them. */
  protected readonly flex = computed(() => {
    const weight = this.component()?.weight;
    if (!weight) return null;
    return this.cell() ? `${weight} 1 0` : `${weight} 1 ${weight * 7}rem`;
  });
}

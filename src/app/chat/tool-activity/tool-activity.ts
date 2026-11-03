import { DatePipe, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { ToolActivity } from '../chat.model';

interface UserRow {
  id: number;
  name: string;
  email: string;
  age: number | null;
  created_at: string;
}

/** How a tool result is displayed, decided from its shape. */
type View =
  | { kind: 'users'; rows: UserRow[]; total: number | null }
  | { kind: 'count'; total: number }
  | { kind: 'stats'; items: { label: string; value: string }[] }
  | { kind: 'json'; value: unknown };

/**
 * One tool step in a Data Chat reply: what was called, its status, and the result.
 * User lists render as a table straight from the database rows, so the data is exact
 * even when the model's written summary is not.
 */
@Component({
  selector: 'app-tool-activity',
  imports: [DatePipe, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './tool-activity.scss',
  template: `
    @let tool = activity();
    <div class="ta" [class.ta-error]="tool.status === 'error'">
      <button type="button" class="ta-head" [attr.aria-expanded]="open()" (click)="open.set(!open())">
        @switch (tool.status) {
          @case ('running') { <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> }
          @case ('done') { <i class="pi pi-database" aria-hidden="true"></i> }
          @case ('error') { <i class="pi pi-exclamation-triangle" aria-hidden="true"></i> }
        }
        <span class="ta-name">{{ tool.name }}</span>
        <span class="ta-args">{{ argsText() }}</span>
        <span class="ta-status">{{ statusText() }}</span>
        <i class="pi ta-caret" [class.pi-chevron-down]="!open()" [class.pi-chevron-up]="open()" aria-hidden="true"></i>
      </button>

      @if (open() && tool.status !== 'running') {
        @if (tool.status === 'error') {
          <p class="ta-message">{{ tool.error }}</p>
        } @else {
          @let v = view();
          @switch (v.kind) {
            @case ('users') {
              @if (v.rows.length === 0) {
                <p class="ta-message">No users found.</p>
              } @else {
                <div class="ta-table">
                  <table>
                    <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Age</th><th>Created</th></tr></thead>
                    <tbody>
                      @for (u of v.rows; track u.id) {
                        <tr><td>{{ u.id }}</td><td>{{ u.name }}</td><td>{{ u.email }}</td><td>{{ u.age ?? '—' }}</td><td>{{ u.created_at | date: 'mediumDate' }}</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
                @if (v.total !== null && v.total > v.rows.length) {
                  <p class="ta-message">Showing {{ v.rows.length }} of {{ v.total }} users.</p>
                }
              }
            }
            @case ('count') {
              <p class="ta-count"><strong>{{ v.total }}</strong> {{ v.total === 1 ? 'user' : 'users' }}</p>
            }
            @case ('stats') {
              <dl class="ta-stats">
                @for (item of v.items; track item.label) {
                  <dt>{{ item.label }}</dt><dd>{{ item.value }}</dd>
                }
              </dl>
            }
            @case ('json') {
              <pre class="ta-json">{{ v.value | json }}</pre>
            }
          }
        }
      }
    </div>
  `,
})
export class ToolActivityView {
  readonly activity = input.required<ToolActivity>();
  /** Expanded by default; the A2UI page collapses it once its own UI shows the data. */
  readonly startOpen = input(true);
  protected readonly open = linkedSignal(() => this.startOpen());

  protected readonly argsText = computed(() => {
    const entries = Object.entries(this.activity().arguments);
    return entries.length ? `(${entries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')})` : '()';
  });

  protected readonly statusText = computed(() => {
    const tool = this.activity();
    if (tool.status === 'running') return 'Querying…';
    if (tool.status === 'error') return 'Failed';
    const v = this.view();
    return v.kind === 'users' ? `${v.rows.length} ${v.rows.length === 1 ? 'row' : 'rows'}` : 'Done';
  });

  protected readonly view = computed<View>(() => toView(this.activity().data));
}

function toView(data: unknown): View {
  if (!isRecord(data)) return { kind: 'json', value: data };
  if (Array.isArray(data['users'])) {
    return { kind: 'users', rows: data['users'] as UserRow[], total: typeof data['total'] === 'number' ? data['total'] : null };
  }
  if (isUser(data)) return { kind: 'users', rows: [data], total: null };
  if (Object.keys(data).length === 1 && typeof data['total'] === 'number') return { kind: 'count', total: data['total'] };
  if ('average_age' in data) {
    const person = (u: unknown) => (isUser(u) ? `${u.name} (#${u.id}, ${u.age ?? 'no age'})` : '—');
    return {
      kind: 'stats',
      items: [
        { label: 'Total users', value: String(data['total']) },
        { label: 'Average age', value: data['average_age'] === null ? '—' : String(data['average_age']) },
        { label: 'Youngest', value: person(data['youngest']) },
        { label: 'Oldest', value: person(data['oldest']) },
        { label: 'Newest', value: person(data['newest']) },
      ],
    };
  }
  return { kind: 'json', value: data };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUser(value: unknown): value is UserRow {
  return isRecord(value) && typeof value['id'] === 'number' && typeof value['email'] === 'string';
}

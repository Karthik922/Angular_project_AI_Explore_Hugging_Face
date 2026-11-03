/**
 * A2UI (agent-to-UI) client side: the backend streams messages describing a surface
 * (A2UI v0.9 shape: createSurface → updateDataModel → updateComponents) and the page renders it.
 * Components are a flat list linked by id; text is a literal or a JSON Pointer into the data model.
 */

/** A literal string, or a JSON Pointer into the data model. Inside a List template, a path without "/" is a field of the current item. */
export type DynamicString = string | { path: string };

export interface A2uiComponent {
  id: string;
  component: string;
  children?: string[] | { componentId: string; path: string };
  child?: string;
  text?: DynamicString;
  variant?: 'h2' | 'h3' | 'body' | 'caption' | 'label';
  weight?: number;
  action?: { event: { name: string; context?: { question?: string } } };
}

export type A2uiMessage = { version: string } & (
  | { createSurface: { surfaceId: string; catalogId: string } }
  | { updateDataModel: { surfaceId: string; path: string; value: unknown } }
  | { updateComponents: { surfaceId: string; components: A2uiComponent[] } }
);

export interface Surface {
  id: string;
  components: ReadonlyMap<string, A2uiComponent>;
  data: unknown;
}

/** Replays the messages in order into surfaces (one per reply, usually). Messages for an unknown surface are ignored. */
export function buildSurfaces(messages: readonly A2uiMessage[]): Surface[] {
  const surfaces = new Map<string, { id: string; components: Map<string, A2uiComponent>; data: unknown }>();
  for (const message of messages) {
    if ('createSurface' in message) {
      const id = message.createSurface.surfaceId;
      surfaces.set(id, { id, components: new Map(), data: {} });
    } else if ('updateDataModel' in message) {
      const surface = surfaces.get(message.updateDataModel.surfaceId);
      if (surface) surface.data = setPointer(surface.data, message.updateDataModel.path, message.updateDataModel.value);
    } else if ('updateComponents' in message) {
      const surface = surfaces.get(message.updateComponents.surfaceId);
      for (const component of surface ? message.updateComponents.components : []) surface!.components.set(component.id, component);
    }
  }
  return [...surfaces.values()];
}

/** The text to show: a literal as is, a path read from the data model ("/x") or from the current list item ("x"). */
export function resolveText(text: DynamicString | undefined, data: unknown, item: unknown): string {
  if (text === undefined) return '';
  if (typeof text === 'string') return text;
  const value = text.path.startsWith('/') ? getPointer(data, text.path) : getPointer(item, `/${text.path}`);
  if (value === null || value === undefined) return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/** The ids a Column / Row draws, in order (a List's template is handled by {@link listItems}). */
export function childIds(component: A2uiComponent): string[] {
  return Array.isArray(component.children) ? component.children : [];
}

/** A List's items: the array its template path points at (absolute, or relative to the current item). */
export function listItems(component: A2uiComponent, data: unknown, item: unknown): unknown[] {
  const template = component.children;
  if (!template || Array.isArray(template)) return [];
  const value = template.path.startsWith('/') ? getPointer(data, template.path) : getPointer(item, `/${template.path}`);
  return Array.isArray(value) ? value : [];
}

/** RFC 6901 JSON Pointer read ("/rows/0/email"); undefined when any step is missing. */
export function getPointer(root: unknown, pointer: string): unknown {
  if (pointer === '' || pointer === '/') return root;
  let node = root;
  for (const raw of pointer.split('/').slice(1)) {
    const key = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

/** Returns a new root with `value` written at `pointer` ("/" replaces the whole model). */
function setPointer(root: unknown, pointer: string, value: unknown): unknown {
  if (pointer === '' || pointer === '/') return value;
  const keys = pointer.split('/').slice(1).map((k) => k.replace(/~1/g, '/').replace(/~0/g, '~'));
  const copy: Record<string, unknown> = root && typeof root === 'object' ? { ...(root as Record<string, unknown>) } : {};
  let node = copy;
  keys.forEach((key, i) => {
    if (i === keys.length - 1) node[key] = value;
    else {
      const next = node[key];
      node[key] = next && typeof next === 'object' ? { ...(next as Record<string, unknown>) } : {};
      node = node[key] as Record<string, unknown>;
    }
  });
  return copy;
}

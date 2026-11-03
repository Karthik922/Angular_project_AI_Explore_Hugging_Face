import { A2uiMessage, buildSurfaces, getPointer, listItems, resolveText } from './a2ui.model';
import { toEvents } from '../chat-api';

const messages: A2uiMessage[] = [
  { version: 'v0.9', createSurface: { surfaceId: 's1', catalogId: 'basic' } },
  { version: 'v0.9', updateDataModel: { surfaceId: 's1', path: '/', value: { title: 'Users', rows: [{ name: 'Kumar', email: 'k@x.com' }] } } },
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: 's1',
      components: [
        { id: 'root', component: 'Column', children: ['title', 'list'] },
        { id: 'title', component: 'Text', text: { path: '/title' }, variant: 'h2' },
        { id: 'list', component: 'List', children: { componentId: 'row', path: '/rows' } },
        { id: 'row', component: 'Text', text: { path: 'email' } },
      ],
    },
  },
  { version: 'v0.9', updateDataModel: { surfaceId: 's1', path: '/title', value: 'All users' } },
  { version: 'v0.9', updateComponents: { surfaceId: 'unknown', components: [{ id: 'x', component: 'Text' }] } },
];

describe('buildSurfaces', () => {
  it('replays messages in order: components by id, data model updates at their path', () => {
    const [surface, ...rest] = buildSurfaces(messages);
    expect(rest).toHaveLength(0);
    expect([...surface.components.keys()]).toEqual(['root', 'title', 'list', 'row']);
    expect(surface.data).toEqual({ title: 'All users', rows: [{ name: 'Kumar', email: 'k@x.com' }] });
  });
});

describe('resolveText and listItems', () => {
  const [surface] = buildSurfaces(messages);

  it('reads literals, absolute paths and paths relative to the list item', () => {
    expect(resolveText('Hello', surface.data, undefined)).toBe('Hello');
    expect(resolveText({ path: '/title' }, surface.data, undefined)).toBe('All users');
    expect(resolveText({ path: 'email' }, surface.data, { email: 'k@x.com' })).toBe('k@x.com');
    expect(resolveText({ path: '/missing/value' }, surface.data, undefined)).toBe('');
  });

  it('returns the array a List template is bound to', () => {
    expect(listItems(surface.components.get('list')!, surface.data, undefined)).toEqual([{ name: 'Kumar', email: 'k@x.com' }]);
    expect(listItems(surface.components.get('root')!, surface.data, undefined)).toEqual([]);
  });

  it('follows JSON Pointer escapes', () => {
    expect(getPointer({ 'a/b': { '~c': 1 } }, '/a~1b/~0c')).toBe(1);
  });
});

describe('toEvents: A2UI payloads', () => {
  it('maps an a2ui payload to an a2ui event', () => {
    expect(toEvents({ a2ui: messages[0] })).toEqual([{ type: 'a2ui', message: messages[0] }]);
  });
});

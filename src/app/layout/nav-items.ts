export interface NavItem {
  label: string;
  icon: string;
  link: string;
  /** Exact match, so "/users" isn't highlighted while on "/users/new". */
  exact?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Users', icon: 'pi pi-users', link: '/users', exact: true },
  { label: 'Add User', icon: 'pi pi-user-plus', link: '/users/new' },
  { label: 'Image Gallery', icon: 'pi pi-images', link: '/gallery' },
  { label: 'Chat', icon: 'pi pi-comments', link: '/chat' },
  { label: 'Data Chat', icon: 'pi pi-database', link: '/data-chat' },
  { label: 'A2UI', icon: 'pi pi-objects-column', link: '/a2ui' },
];

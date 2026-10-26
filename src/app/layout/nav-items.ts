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
];

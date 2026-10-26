import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { ButtonModule } from 'primeng/button';
import { Message } from 'primeng/message';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  IDatasource,
  IGetRowsParams,
  InfiniteRowModelModule,
  ModuleRegistry,
  PaginationModule,
  ValidationModule,
  themeQuartz,
} from 'ag-grid-community';
import { ActionsCell, ActionsCellContext } from '../actions-cell/actions-cell';
import { User } from '../user.model';
import { UserService, apiErrorMessage } from '../user.service';

// Registered here (not in main.ts) so AG Grid ships in this lazy chunk, not the initial bundle.
// Only the features this grid uses: AllCommunityModule pulled in filters, editors, export, etc.
// ValidationModule (dev builds only, tree-shaken in production) logs a console error naming any
// module a newly used grid feature needs.
ModuleRegistry.registerModules([
  InfiniteRowModelModule,
  PaginationModule,
  ...(ngDevMode ? [ValidationModule] : []),
]);

const PAGE_SIZE = 50;

// Built on PrimeNG tokens so the grid follows the selected preset, colors and dark mode.
const GRID_THEME = themeQuartz.withParams({
  accentColor: 'var(--p-primary-color)',
  backgroundColor: 'var(--p-content-background)',
  foregroundColor: 'var(--p-text-color)',
  borderColor: 'var(--p-content-border-color)',
  chromeBackgroundColor: 'var(--p-content-hover-background)',
  fontFamily: 'inherit',
  borderRadius: 6,
  wrapperBorderRadius: 8,
});

@Component({
  selector: 'app-user-list',
  imports: [AgGridAngular, RouterLink, ButtonModule, Message],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserList {
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private gridApi?: GridApi<User>;

  protected readonly total = signal<number | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly pageSize = PAGE_SIZE;
  protected readonly gridTheme = GRID_THEME;

  protected readonly columnDefs: ColDef<User>[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
    { field: 'email', headerName: 'Email', flex: 1.5, minWidth: 200 },
    { field: 'age', headerName: 'Age', width: 90 },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 190,
      valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleString() : ''),
    },
    { headerName: 'Actions', width: 170, cellRenderer: ActionsCell, pinned: 'right' },
  ];

  // The API only orders by id and has no filters, so don't let the grid imply otherwise.
  protected readonly defaultColDef: ColDef<User> = { sortable: false, resizable: true };

  protected readonly context: ActionsCellContext = {
    onEdit: (user) => this.router.navigate(['/users', user.id, 'edit']),
    onDelete: (user) => this.deleteUser(user),
  };

  // Infinite row model: the grid requests one block (= one page) at a time,
  // so each request fetches only PAGE_SIZE rows, even with lakhs of users.
  private readonly datasource: IDatasource = {
    getRows: (params: IGetRowsParams) => {
      const limit = params.endRow - params.startRow;
      const page = params.startRow / limit + 1;
      this.userService.list(page, limit).subscribe({
        next: (res) => {
          this.error.set(null);
          this.total.set(res.meta.total);
          params.successCallback(res.data, res.meta.total);
        },
        error: (err) => {
          this.error.set(apiErrorMessage(err));
          params.failCallback();
        },
      });
    },
  };

  protected onGridReady(event: GridReadyEvent<User>): void {
    this.gridApi = event.api;
    this.gridApi.setGridOption('datasource', this.datasource);
  }

  protected refresh(): void {
    this.gridApi?.refreshInfiniteCache();
  }

  private deleteUser(user: User): void {
    if (!confirm(`Delete ${user.name} (${user.email})?`)) return;
    this.userService.delete(user.id).subscribe({
      next: () => this.refresh(),
      error: (err) => this.error.set(apiErrorMessage(err)),
    });
  }
}

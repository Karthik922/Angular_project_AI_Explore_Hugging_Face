import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { ButtonModule } from 'primeng/button';
import { User } from '../user.model';

export interface ActionsCellContext {
  onEdit(user: User): void;
  onDelete(user: User): void;
}

@Component({
  selector: 'app-actions-cell',
  imports: [ButtonModule],
  template: `
    @if (user) {
      <p-button label="Edit" icon="pi pi-pencil" size="small" severity="secondary" [outlined]="true" (onClick)="context.onEdit(user)" />
      <p-button label="Delete" icon="pi pi-trash" size="small" severity="danger" [outlined]="true" (onClick)="context.onDelete(user)" />
    }
  `,
  styles: `
    :host { display: flex; gap: 6px; align-items: center; height: 100%; }
  `,
})
export class ActionsCell implements ICellRendererAngularComp {
  protected user: User | undefined;
  protected context!: ActionsCellContext;

  agInit(params: ICellRendererParams<User, unknown, ActionsCellContext>): void {
    this.user = params.data;
    this.context = params.context;
  }

  refresh(params: ICellRendererParams<User, unknown, ActionsCellContext>): boolean {
    this.agInit(params);
    return true;
  }
}

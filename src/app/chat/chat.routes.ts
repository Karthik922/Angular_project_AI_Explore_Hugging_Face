import { Routes } from '@angular/router';
import { Chat } from './chat';
import { A2UI_CHAT, DATA_CHAT, GENERAL_CHAT, provideChat } from './chat.config';

// Route-level providers live as long as the app, so a reply keeps streaming (and the
// conversation stays) while you visit other pages. Each route gets its own ChatStore.
export const CHAT_ROUTES: Routes = [{ path: '', component: Chat, providers: provideChat(GENERAL_CHAT) }];
export const DATA_CHAT_ROUTES: Routes = [{ path: '', component: Chat, providers: provideChat(DATA_CHAT) }];
export const A2UI_CHAT_ROUTES: Routes = [{ path: '', component: Chat, providers: provideChat(A2UI_CHAT) }];

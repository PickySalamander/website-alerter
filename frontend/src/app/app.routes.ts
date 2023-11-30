import { Routes } from '@angular/router';
import {LoginComponent} from "./login/login.component";

export const routes: Routes = [
  {
    path: "login",
    component: LoginComponent
  },
  { path: '', redirectTo: 'index', pathMatch: 'full' },
  { path: '**', redirectTo: 'index' }
];

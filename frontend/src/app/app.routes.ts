import {Routes} from '@angular/router';
import {LoginComponent} from "./login/login.component";
import {IndexComponent} from "./index/index.component";
import {LoginService} from "./services/login.service";

export const routes:Routes = [
	{
		path: "login",
		component: LoginComponent
	},
	{
		path: "",
		component: IndexComponent,
		canActivate: [LoginService.canActivateLoggedIn]
	},
	{
		path: '**',
		redirectTo: ''
	}
];

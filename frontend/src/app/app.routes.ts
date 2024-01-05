import {Routes} from '@angular/router';
import {LoginComponent} from "./login/login.component";
import {SiteListComponent} from "./site-list/site-list.component";
import {LoginService} from "./services/login.service";
import {SiteInfoComponent} from "./site-info/site-info.component";
import {SiteService} from "./services/site.service";

export const routes:Routes = [
	{
		path: "login",
		component: LoginComponent
	},
	{
		path: "list",
		component: SiteListComponent,
		resolve: {sites: SiteService.resolve},
		canActivate: [LoginService.canActivateLoggedIn]
	},
	{
		path: "site",
		resolve: {sites: SiteService.resolve},
		children: [
			{
				path: "",
				component: SiteInfoComponent
			},
			{
				path: ":siteID",
				component: SiteInfoComponent
			}
		]
	},

	// {
	// 	path: "runs",
	// 	component: RunListComponent,
	// 	canActivate: [LoginService.canActivateLoggedIn],
	// 	children: [
	// 		{
	// 			path: ":runID",
	// 			component: RunListComponent
	// 		}
	// 	]
	// },

	{path: '', redirectTo: 'list', pathMatch: 'full'},
	{path: '**', redirectTo: 'list'}
];

import {Routes} from '@angular/router';
import {LoginComponent} from "./login/login.component";
import {SiteListComponent} from "./site-list/site-list.component";
import {LoginService} from "./services/login.service";
import {SiteInfoComponent} from "./site-info/site-info.component";
import {SiteService} from "./services/site.service";
import {RunListComponent} from "./run-list/run-list.component";
import {RunService} from "./services/run.service";
import {RunDetailComponent} from "./run-list/run-detail/run-detail.component";

// @ts-ignore
export const routes:Routes = [
	{
		path: "login",
		component: LoginComponent
	},
	{
		path: "list",
		component: SiteListComponent,
		resolve: {sites: SiteService.resolve},
		canActivate: [LoginService.canActivateLoggedIn],
	},
	{
		path: "site",
		resolve: {sites: SiteService.resolve},
		canActivate: [LoginService.canActivateLoggedIn],
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
	{
		path: "runs",
		component: RunListComponent,
		resolve: {sites: SiteService.resolve, runs: RunService.resolve},
		canActivate: [LoginService.canActivateLoggedIn],
		children: [
			{
				path: ":runID",
				component: RunDetailComponent
			}
		]
	},
	{path: '**', redirectTo: 'list'}
];

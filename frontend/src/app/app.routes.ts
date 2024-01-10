import {Routes} from '@angular/router';
import {LoginComponent} from "./login/login.component";
import {SiteListComponent} from "./site-list/site-list.component";
import {LoginService} from "./services/login.service";
import {SiteInfoComponent} from "./site-info/site-info.component";
import {SiteService} from "./services/site.service";
import {RunListComponent} from "./run-list/run-list.component";
import {RunService} from "./services/run.service";
import {RunDetailComponent} from "./run-list/run-detail/run-detail.component";
import {RevisionDetailComponent} from "./revision-detail/revision-detail.component";

/** All routes used by the application */
export const routes:Routes = [
	{
		path: "login",
		title: "Alerter - Login",
		component: LoginComponent
	},
	{
		path: "list",
		title: "Alerter - Websites",
		component: SiteListComponent,
		resolve: {sites: SiteService.resolve},
		canActivate: [LoginService.canActivateLoggedIn],
	},
	{
		path: "site",
		title: "Alerter - Website",
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
		title: "Alerter - Run Throughs",
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
	{
		path: "revision/:revisionID",
		title: "Alerter - Revision",
		component: RevisionDetailComponent,
		resolve: {sites: SiteService.resolve},
		canActivate: [LoginService.canActivateLoggedIn],
	},
	{path: '**', redirectTo: 'list'}
];

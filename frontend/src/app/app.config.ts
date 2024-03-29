import {ApplicationConfig} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {provideAnimations} from '@angular/platform-browser/animations';
import {HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi} from "@angular/common/http";
import {LoginService} from "./services/login.service";

/** Main application configuration */
export const appConfig:ApplicationConfig = {
	providers: [
		provideHttpClient(withInterceptorsFromDi()),
		provideRouter(routes),
		provideAnimations(),

		//add login service and interceptors for handling logging in / out and maintaining session
		LoginService,
		{provide: HTTP_INTERCEPTORS, useExisting: LoginService, multi: true}
	]
};

import {inject, Injectable, signal} from '@angular/core';
import {CanActivateFn, Router} from "@angular/router";
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from "@angular/common/http";
import {from, lastValueFrom, Observable} from "rxjs";
import {environment} from "../../environments/environment";
import {Amplify} from "aws-amplify";
import {AuthSession, AuthUser, fetchAuthSession, getCurrentUser, signOut} from "aws-amplify/auth";

/** Service for maintaining the user's logged-in state and Cognito session */
@Injectable({
	providedIn: 'root'
})
export class LoginService implements HttpInterceptor {
	/** Stored redirection for the user to go to after they log in */
	private initialUrl:string[];

	/** The current Cognito user */
	private user:AuthUser;

	/** The current Cognito session */
	private session:AuthSession;

	private _isLoggedIn = signal(false);

	constructor(private router:Router) {
		//get the initial url the user wanted to go to
		this.initialUrl = location.pathname.split('/').filter(value => value.length > 0);
		if(this.initialUrl[0] == "login" || this.initialUrl.length == 0) {
			this.initialUrl = undefined;
		}

		//configure the login routine
		Amplify.configure({
			Auth: {
				Cognito: {
					userPoolId: environment.cognitoUserPoolId,
					userPoolClientId: environment.cognitoClientId
				}
			}
		});
	}

	/** Get a stored session from Amplify */
	private async getSession() {
		this.user = await getCurrentUser();
		this.session = await fetchAuthSession();

		if(!this.user || !this.session) {
			throw new Error("No user returned");
		}

		this._isLoggedIn.set(true);
	}

	/** Is the user logged in? Or has a stored session */
	private async canActivate() {
		try {
			await this.getSession();
			return true;
		} catch(e) {
			return this.router.createUrlTree(["login"]);
		}
	}

	/** Log out the current user and redirect to log in */
	async logout() {
		await signOut();

		this.session = undefined;
		this.user = undefined;

		this._isLoggedIn.set(false);

		//nav to the login page
		await this.router.navigate(['login']);
	}

	/** Intercept all REST calls and make sure an auth header is added if it is to the backend API */
	intercept(request:HttpRequest<any>, next:HttpHandler):Observable<HttpEvent<any>> {
		//if an api request
		if(request.url.startsWith(environment.apiUrl)) {
			return from(this.handleApiRequest(request, next));
		}

		return next.handle(request);
	}

	/** Handle an API request and make sure we have a fresh session */
	private async handleApiRequest(request:HttpRequest<any>, next:HttpHandler) {
		//make sure the session is fresh
		await this.getSession();

		const authorizedRequest:HttpRequest<any> = request.clone({
			setHeaders: {
				Authorization: this.session.tokens.idToken.toString()
			}
		});

		return lastValueFrom(next.handle(authorizedRequest));
	}

	/** Redirect to the initial url that the user wanted to go to after login. */
	redirectAfterLogin() {
		const initial = this.initialUrl ?? ["/"];
		this.initialUrl = undefined;

		return this.router.navigate(initial);
	}

	get isLoggedIn() {
		return this._isLoggedIn.asReadonly();
	}

	/** Return whether the user can view a page if already logged in */
	public static canActivateLoggedIn:CanActivateFn = () => {
		return inject(LoginService).canActivate();
	}
}

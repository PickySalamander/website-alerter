import {inject, Injectable} from '@angular/core';
import {CanActivateFn, Router, UrlTree} from "@angular/router";
import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from "@angular/common/http";
import {catchError, Observable, Subject, throwError} from "rxjs";
import {environment} from "../../environments/environment";

/** Service for maintaining the user's logged in state and JWT session */
@Injectable({
	providedIn: 'root'
})
export class LoginService implements HttpInterceptor {
	/** The current signed JWT being used */
	private _session:string;

	/** Stored redirection for the user to go to after they login */
	private initialUrl:string[];

	/** Event issued when the user logs out or is logged out */
	private logoutSubject:Subject<void> = new Subject<void>();

	constructor(private router:Router) {
		//get the initial url the user wanted to go to
		this.initialUrl = window.location.pathname.split('/').filter(value => value.length > 0);
		if(this.initialUrl[0] == "login") {
			this.clearInitial();
		}

		//determine if login token is still good
		const timeout = parseInt(localStorage.getItem("sessionTimeout"));
		if(isNaN(timeout) || new Date().getTime() > timeout) {
			return;
		}

		//get any previously stored JWT from the local storage
		this._session = localStorage.getItem("session");
	}

	/** Return whether the user can view a page if already logged in */
	private canActivate():boolean | UrlTree {
		if(this.hasSession) {
			return true;
		}

		return this.router.createUrlTree(["login"]);
	}

	/** Intercept all HTTP requests made by the application */
	intercept(request:HttpRequest<any>, next:HttpHandler):Observable<HttpEvent<any>> {
		//if an api request
		if(request.url.startsWith(environment.apiUrl) && this._session) {
			let headers = request.headers;

			//set the JWT session
			headers = headers.set('Authorization', `Bearer ${this._session}`);

			//clone the request to add the header and withCredentials (required for cors)
			const authReq = request.clone({headers, withCredentials: true});
			return next.handle(authReq).pipe(
				catchError((error:HttpErrorResponse) => {
					if(error.status == 403 || error.status == 0) {
						console.log("Authorization error", error);
						this.logout(false);
					}

					return throwError(() => error);
				})
			);
		}

		return next.handle(request);
	}

	/** Log the user out of the App and redirect to the login page */
	logout(clearInitial:boolean = true):void {
		this._session = undefined;

		this.logoutSubject.next();

		if(clearInitial) {
			this.clearInitial();
		}

		//nav to the login page
		this.router.navigate(['login']);
	}

	/** Redirect to the initial url that the user wanted to go to or the root location */
	sendInitialUrl() {
		const initial = this.initialUrl;
		this.clearInitial();
		return this.router.navigate(initial);
	}

	/** Reset the initial url to the root of the site */
	private clearInitial() {
		this.initialUrl = ["list"];
	}

	/** Set the current session saving it in {@link localStorage} */
	set session(value:string) {
		this._session = value
		localStorage.setItem("session", this._session);

		//current time + hours - 6 minutes for leeway
		const timeout = new Date().getTime() + (environment.sessionTimeout * 3.6e+6) - 3e+5;
		localStorage.setItem("sessionTimeout", timeout.toString());
	}

	/** Does the user have a JWT session set? */
	get hasSession() {
		return this._session != null;
	}

	/** Event issued when the user logs out or is logged out */
	get onLogout():Observable<void> {
		return this.logoutSubject.asObservable();
	}

	/** Return whether the user can view a page if already logged in */
	public static canActivateLoggedIn:CanActivateFn = () => {
		return inject(LoginService).canActivate();
	}
}

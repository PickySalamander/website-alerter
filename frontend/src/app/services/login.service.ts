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

	/** Event issued when the user logs out or is logged out */
	private logoutSubject:Subject<void> = new Subject<void>();

	constructor(private router:Router) {
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
					if(error.status == 403) {
						console.log("Authorization error", error);
						this.logout();
					}

					return throwError(() => error);
				})
			);
		}

		return next.handle(request);
	}

	/** Log the user out of the App and redirect to the login page */
	logout():void {
		this._session = undefined;

		this.logoutSubject.next();

		//nav to the login page
		this.router.navigate(['login']);
	}

	/** Set the current session saving it in {@link localStorage} */
	set session(value:string) {
		this._session = value
		localStorage.setItem("session", this._session);
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
	public static canActivateLoggedIn:CanActivateFn = route => {
		return inject(LoginService).canActivate();
	}
}

import {inject, Injectable} from '@angular/core';
import {CanActivateFn, Router, UrlTree} from "@angular/router";
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from "@angular/common/http";
import {Observable} from "rxjs";
import {environment} from "../../environments/environment";

@Injectable({
	providedIn: 'root'
})
export class LoginService implements HttpInterceptor {
	private _session:string;

	constructor(private router:Router) {
		this._session = localStorage.getItem("session");
	}

	private canActivate():boolean | Promise<boolean | UrlTree> {
		return Promise.resolve(this.router.createUrlTree(["login"]));
	}

	public static canActivateLoggedIn:CanActivateFn = route => {
		return inject(LoginService).canActivate();
	}

	intercept(request:HttpRequest<any>, next:HttpHandler):Observable<HttpEvent<any>> {
		//if an api request
		if(request.url.startsWith(environment.apiUrl) && this._session) {
			let headers = request.headers;

			//set the jwt session
			headers = headers.set('Authorization', `Bearer ${this._session}`);

			//clone the request to add the header and withCredentials (required for cors)
			const authReq = request.clone({headers, withCredentials: true});
			return next.handle(authReq);
		}

		return next.handle(request);
	}

	set session(value:string) {
		this._session = value
		localStorage.setItem("session", this._session);
	}

	get hasSession() {
		return this._session != null;
	}
}

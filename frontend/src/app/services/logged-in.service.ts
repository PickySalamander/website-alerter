import {inject, Injectable} from '@angular/core';
import {CanActivate, CanActivateFn, Router, UrlTree} from "@angular/router";

@Injectable({
  providedIn: 'root'
})
export class LoggedInService {

  constructor(private router:Router) { }

  private canActivate(): boolean | Promise<boolean | UrlTree> {
    return Promise.resolve(this.router.createUrlTree(["login"]));
  }

  public static canActivateLoggedIn: CanActivateFn = route => {
    return inject(LoggedInService).canActivate();
  }
}

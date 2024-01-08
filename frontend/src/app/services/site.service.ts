import {inject, Injectable} from '@angular/core';
import {LoginService} from "./login.service";
import {WebsiteItem} from "website-alerter-shared";
import {ResolveFn} from "@angular/router";
import {HttpClient} from "@angular/common/http";
import {environment} from "../../environments/environment";

@Injectable({
	providedIn: 'root'
})
export class SiteService {
	private sites:Map<string, WebsiteItem>;

	constructor(private http:HttpClient,
	            private login:LoginService) {
		this.login.onLogout.subscribe(() => {
			this.sites = undefined;
		});
	}

	private getSites():Promise<SiteService> | SiteService {
		if(this.sites) {
			return this;
		}

		return new Promise<SiteService>(resolve => {
			this.http.get<WebsiteItem[]>(`${environment.apiUrl}/sites`).subscribe(items => {
				if(items && items.length > 0) {
					this.sites = new Map<string, WebsiteItem>(items.map(value => [value.siteID, value]));
				}

				resolve(this);
			});
		});
	}

	getSite(siteID:string) {
		return this.sites.get(siteID);
	}

	putSite(site:WebsiteItem) {
		this.sites.set(site.siteID, site);
	}

	deleteSite(siteID:string) {
		this.sites.delete(siteID);
	}

	get allItems():WebsiteItem[] {
		return Array.from(this.sites.values());
	}

	public static resolve:ResolveFn<SiteService> = () => {
		return inject(SiteService).getSites();
	};
}

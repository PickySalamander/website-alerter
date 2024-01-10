import {inject, Injectable} from '@angular/core';
import {LoginService} from "./login.service";
import {WebsiteItem} from "website-alerter-shared";
import {ResolveFn} from "@angular/router";
import {HttpClient} from "@angular/common/http";
import {environment} from "../../environments/environment";

/** Service that downloads and stores {@link WebsiteItem}s downloaded from the server. */
@Injectable({
	providedIn: 'root'
})
export class SiteService {
	/** All sites mapped to their site ID */
	private sites:Map<string, WebsiteItem>;

	constructor(private http:HttpClient,
	            private login:LoginService) {
		//delete the sites when logging out
		this.login.onLogout.subscribe(() => {
			this.sites = undefined;
		});
	}

	/** Get all {@link WebsiteItem}s from the server if not already loaded */
	private getSites():Promise<SiteService> | SiteService {
		//return immediately if loaded
		if(this.sites) {
			return this;
		}

		//download the sites
		return new Promise<SiteService>(resolve => {
			this.http.get<WebsiteItem[]>(`${environment.apiUrl}/sites`).subscribe(items => {
				if(items && items.length > 0) {
					//store in the map
					this.sites = new Map<string, WebsiteItem>(items.map(value => [value.siteID, value]));
				}

				resolve(this);
			});
		});
	}

	/** Get a {@link WebsiteItem} by its ID */
	getSite(siteID:string) {
		return this.sites.get(siteID);
	}

	/** Put a new {@link WebsiteItem} in the map */
	putSite(site:WebsiteItem) {
		this.sites.set(site.siteID, site);
	}

	/** Delete a {@link WebsiteItem} from the map */
	deleteSite(siteID:string) {
		this.sites.delete(siteID);
	}

	/** Get all {@link WebsiteItem}s */
	get allItems():WebsiteItem[] {
		return Array.from(this.sites.values());
	}

	/** Get all {@link WebsiteItem}s from the server if not already loaded */
	public static resolve:ResolveFn<SiteService> = () => {
		return inject(SiteService).getSites();
	};
}

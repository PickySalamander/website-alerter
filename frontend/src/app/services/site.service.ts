import {effect, inject, Injectable} from '@angular/core';
import {LoginService} from "./login.service";
import {WebsiteItem} from "website-alerter-shared";
import {ResolveFn} from "@angular/router";
import {HttpClient} from "@angular/common/http";
import {environment} from "../../environments/environment";
import {firstValueFrom} from "rxjs";

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
		effect(() => {
			if(!this.login.isLoggedIn()) {
				this.sites = undefined;
			}
		});
	}

	/** Get all {@link WebsiteItem}s from the server if not already loaded */
	private async getSites():Promise<SiteService> {
		if(!this.sites) {
			//download the sites
			const items = await firstValueFrom(this.http.get<WebsiteItem[]>(`${environment.apiUrl}/sites`));

			if(items && items.length > 0) {
				//store in the map
				this.sites = new Map<string, WebsiteItem>(items.map(value => [value.siteID, value]));
			}
		}

		return this;
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

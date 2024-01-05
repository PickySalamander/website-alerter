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

		// return new Promise<SiteService>(resolve => {
		// 	this.http.get<WebsiteItem[]>(`${environment.apiUrl}/sites`).subscribe(items => {
		// 		if(items && items.length > 0) {
		// 			this.sites = new Map<string, WebsiteItem>(items.map(value => [value.siteID, value]));
		// 		}
		//
		// 		resolve(this);
		// 	});
		// })

		const items = [
			{
				"siteID": "b",
				"site": "https://unknownworlds.com/jobs/",
				"selector": "#content-holder > section > div",
				"enabled": false
			},
			{
				"options": {
					"ignoreAttributes": true,
					"ignoreCss": true
				},
				"siteID": "c",
				"site": "https://www.privatedivision.com/jobs/",
				"selector": "#post-5548 > div",
				"last": {
					"revisionID": "d64eee14-316f-4e15-8e8b-acada3a64495",
					"runID": "09f0b959-4671-40de-b38a-cb72db65a8cb",
					"time": 1704400415098,
					"siteState": 2
				},
				"enabled": true
			},
			{
				"siteID": "a",
				"site": "https://firaxis.com/careers/",
				"selector": ".firaxis-careers-component ul.jobGrid",
				"last": {
					"revisionID": "c65f03a3-f0ad-4411-9c24-f29dd61a8e1c",
					"runID": "09f0b959-4671-40de-b38a-cb72db65a8cb",
					"time": 1704399981978,
					"siteState": 0
				},
				"enabled": true
			}
		] as WebsiteItem[];

		this.sites = new Map<string, WebsiteItem>(items.map(value => [value.siteID, value]));

		return this;
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

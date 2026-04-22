import {SiteRevisionState, WebsiteItem} from "website-alerter-shared";

export class NotificationEmail {
	private changed:number = 0;
	private errored:number = 0;

	constructor(private runID:string, private sites:WebsiteItem[]) {
		//go through each site and check its last state
		for(const site of this.sites) {
			//if the site wasn't updated during the last run don't process it
			if(site.last.runID != this.runID) {
				console.warn(`Site ${site.siteID} (${site.site}) was not updated for run ${this.runID}`);
				continue;
			}

			//update the sets
			switch(site.last.siteState) {
				case SiteRevisionState.Open:
				case SiteRevisionState.Polled:
					this.errored++;
					break;
				case SiteRevisionState.Changed:
					this.changed++;
					break;
			}
		}
	}

}

import {WebsiteItem} from "website-alerter-shared";

/** Data to be passed to the {@link PollSite} lambda */
export interface PollSiteData {
	/** The id of the run this data is for */
	runID:string;

	/** The sites to poll */
	sites:WebsiteItem[];
}

/** The state of a check of a site in a {@link RunThrough} */
export interface SiteRevision {
	/** the run this revision was apart of */
	runID:string;

	/** The site's owner */
	userID:string;

	/** The site's url */
	site:string;

	/** Last time it was updated */
	time:number;

	/** The state of the site's polling and change detection */
	siteState:SiteRevisionState,

	/** the revision of any changes found in S3 */
	revisionID?:string;
}

/** The state of the site's polling and change detection */
export enum SiteRevisionState {
	/** The website is getting ready to be polled by Puppeteer */
	Open,

	/** The website was polled by Puppeteer and is awaiting changed detection */
	Polled,

	/** The website was checked by change detection and is done */
	Complete
}
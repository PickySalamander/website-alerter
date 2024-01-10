/** The state of a check of a site in a {@link RunThrough} */
export interface SiteRevision {
	/** The id of the revision */
	revisionID:string;

	/** The run this revision was apart of */
	runID:string;

	/** The id of the site that was checked */
	siteID:string;

	/** The time the revision was created */
	time:number;

	/** The state of the site's polling and change detection */
	siteState:SiteRevisionState;
}

/** The state of the site's polling and change detection */
export enum SiteRevisionState {
	/** The website is getting ready to be polled by Puppeteer */
	Open,

	/** The website was polled by Puppeteer and is awaiting changed detection */
	Polled,

	/** The website was checked by change detection and has no changes */
	Unchanged,

	/** The website was checked by change detection and has changes */
	Changed
}
/** A website's configuration stored in the database */
export interface WebsiteItem {
	/** The site's owner */
	userID:string;

	/** The site's url */
	site:string;

	/**
	 * A CSS selector of the part of the DOM to check for changes, this should only return <u><b>one</b></u> element
	 */
	selector?:string;

	/** Options for detecting changes on the page */
	options?:ChangeOptions;

	/** The last time the site was polled */
	lastCheck?:number;

	/** The last revision of the website */
	updates?:WebsiteCheck[];
}

/** A revision of a polled website */
export interface WebsiteCheck {
	/** The time it was polled */
	time:number;

	/** The id of the revision stored in S3 */
	revisionID:string;

	/** ID of the run this check was performed in */
	runID:string;
}

/** Options for detecting changes on the page */
export interface ChangeOptions {
	/** Ignore CSS on the page (anything in "class" and "style" attributes, plus "style" tags) (default:false) */
	ignoreCss?:boolean;

	/** Ignore <b>all</b> html attributes (default:false)*/
	ignoreAttributes?:boolean;

	/** ignore script tags on the page (default:true) */
	ignoreScripts?:boolean;
}
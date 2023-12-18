/** A website's configuration stored in the database */
export interface WebsiteItem {
	/** unique ID for the site */
	siteID:string;

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

	/** The time the site was created */
	created:number;

	/** The last run the site was polled */
	lastRunID?:number;

	/** Frequency to check the site for changes */
	frequency:ChangeFrequency;
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

export enum ChangeFrequency {
	Never = "NEVER",
	Weekly = "WEEKLY",
	SemiWeekly = "SEMI-WEEKLY"
}
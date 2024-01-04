import {SiteRevision} from "./site-revision";

/** A website's configuration stored in the database */
export interface WebsiteItem {
	/** unique ID for the site */
	siteID:string;

	/** The site's url */
	site:string;

	/** Is the site enabled for checking? */
	enabled:boolean;

	/**
	 * A CSS selector of the part of the DOM to check for changes, this should only return <u><b>one</b></u> element
	 */
	selector?:string;

	/** Options for detecting changes on the page */
	options?:ChangeOptions;

	/** The time the site was created */
	created:number;

	/** The last time the site was polled */
	last:SiteRevision;

	/** The last check on this site */
	updates:{ [revisionID:string]:SiteRevision };
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

export function getOrderedSiteRevisions(site:WebsiteItem, ascending:boolean = true) {
	return Object.entries(site.updates)
		.map(([, revision]) => revision)
		.sort((a, b) => ascending ? a.time - b.time : b.time - a.time);
}
import {SiteRevision} from "./site-revision";

/** A website's configuration stored in the database */
export interface WebsiteItem {
	/** Unique ID for the site */
	siteID:string;

	/** The site's url */
	site:string;

	/** Is the site enabled for checking? */
	enabled:boolean;

	/**
	 * A CSS selector of the part of the DOM to check for changes, this should only return <u><b>one</b></u> element
	 */
	selector?:string;

	/** The time the site was created */
	created:number;

	/** The last revision of the site when it was polled */
	last?:SiteRevision;
}

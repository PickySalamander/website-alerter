import {ChangeOptions} from "./website-item";

/** Request to put a new or edit a website in the database */
export interface WebsiteItemRequest {
	/** The site to update (undefined if putting a new site) */
	siteID?:string;

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
}
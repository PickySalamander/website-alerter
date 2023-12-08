import {ChangeFrequency, ChangeOptions} from "./website-item";

export interface WebsiteItemRequest {
	/** The site's url */
	site:string;

	/**
	 * A CSS selector of the part of the DOM to check for changes, this should only return <u><b>one</b></u> element
	 */
	selector?:string;

	/** Options for detecting changes on the page */
	options?:ChangeOptions;

	/** Frequency to check the site for changes */
	frequency:ChangeFrequency;
}
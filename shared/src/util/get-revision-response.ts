import {SiteRevision} from "./site-revision";

/** Response to getting a revision from the REST API */
export interface GetRevisionResponse {
	/** The revision returned */
	revision:SiteRevision;

	/** A series of pre-signed urls for downloaded data from S3 */
	urls: RevisionUrls;
}

/** A series of pre-signed urls for downloaded data from S3 */
export interface RevisionUrls {
	/** Link to download an image of the polling */
	screenshot:string;

	/** Link to download an image of the previous polling */
	previousScreenshot?:string;

	/** Link to download HTML of the polling */
	html:string;

	/** Link to download HTML of the previous polling */
	previousHtml?:string;
}

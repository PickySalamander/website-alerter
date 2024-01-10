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

	/** Link to download a unified dif of the polling, if there was a change */
	diff?:string;

	/** Link to download HTML of the polling */
	html:string;
}
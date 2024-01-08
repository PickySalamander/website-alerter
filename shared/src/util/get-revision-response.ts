import {SiteRevision} from "./site-revision";

export interface GetRevisionResponse {
	revision:SiteRevision;

	urls: RevisionUrls;
}

export interface RevisionUrls {
	screenshot:string;
	diff?:string;
	html:string;
}
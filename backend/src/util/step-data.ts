import {ChangeFrequency} from "website-alerter-shared";

export interface SiteToProcess {
	/** The current run operation */
	runID:string;

	/** The website that should currently be checked */
	siteID:string;
}

export interface RevisionToProcess extends SiteToProcess {
	/** Current revision id being worked on */
	revisionID:string;
}

export interface StartingData {
	executionID:string;
}

export interface ScheduledStartData {
	runID:string;
	shouldRun:GetItemsData[];
	isEmpty:boolean;
}

export interface GetItemsData {
	frequency:ChangeFrequency;
	runID:string;
	lastEvaluatedKey?:any;
}

export interface QueryStartData extends GetItemsData {
	items:SiteToProcess[],
	count:number;
	lastEvaluatedKey:any;
}

export interface ScheduledEndData {
	runID:string;
	lastEvaluatedKey?:any;
}
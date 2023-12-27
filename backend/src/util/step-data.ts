import {ChangeFrequency} from "website-alerter-shared";

export interface SiteToProcess {
	/** The current run operation */
	runID:string;

	/** The website that should currently be checked */
	siteID:string;
}

export interface ScheduledStartData {
	frequency:ChangeFrequency;
	runID:string;
	lastEvaluatedKey?:Record<string, any>;
}
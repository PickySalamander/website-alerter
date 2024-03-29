/** Data passed from DetectChanges to ProcessSite */
export interface DetectChangesData {
	/** The current run operation */
	runID:string;

	/** The website that should currently be checked */
	siteID:string;

	/** Current revision id being worked on */
	revisionID:string;

	/** Was the site successfully polled? */
	wasPolled:boolean;
}
export interface SiteToProcess {
	/** The owner of the website that's being scraped */
	userID:string;

	/** The current run operation */
	runID:string;

	/** The website url that should currently be checked */
	site:string;
}
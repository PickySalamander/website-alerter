/** A website's configuration stored in the database */
export interface WebsiteItem {
	/** The site's owner */
	userID:string;

	/** The site's url */
	site:string;

	/** The last time the site was polled */
	lastCheck:number;

	/** The last revision of the website */
	updates:WebsiteCheck[];
}

/** A revision of a polled website */
export interface WebsiteCheck {
	/** The time it was polled */
	time:number;

	/** The id of the revision stored in S3 */
	revisionID:string;

	/** ID of the run this check was performed in */
	runID:string;
}
/** Event that is sent to Lambda functions from SQS from other functions */
export interface SqsSiteEvent {
	/** The current run operation */
	runID:string;

	/** The website url that should currently be checked */
	site:string;
}
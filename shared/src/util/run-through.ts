import {SiteRevision} from "./site-revision";

/** A run through of the website alerter tool in the database */
export interface RunThrough {
	/** The id of the run through */
	runID:string;

	/** The time the run was started */
	time:number;

	/** Step functions execution ID */
	executionID:string;

	/** Sites that were checked during the run */
	sites:string[];

	/** Statistics for the front end */
	stats?:RunThroughStats;

	/** The state of the entire run */
	runState:RunThroughState;
}

/** Statistics for the front end */
export interface RunThroughStats {
	unchanged:number;

	changed:number;

	errored:number;
}

/** The state of an entire {@link RunThrough} */
export enum RunThroughState {
	/** The run is open and being sent through the flow */
	Open,

	/** The run through is complete without errors */
	Complete,

	/** The run through is complete with errors */
	Expired
}
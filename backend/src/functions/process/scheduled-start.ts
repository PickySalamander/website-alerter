import {Handler} from "aws-lambda";
import {LambdaBase} from "../../util/lambda-base";
import {v4} from "uuid";
import {RunThroughState, WebsiteItem} from "website-alerter-shared";

/**
 * Start the entire flow of polling websites for changes. Called from EventBridge, this function will queue up all the
 * enabled {@link WebsiteItem}'s in the database to be polled.
 */
class ScheduledStart extends LambdaBase {

	/**
	 * Entry point from the state machine
	 * @param data data from the start of the state machine
	 */
	public handler:Handler<StartingData, StartingOutput> = async(data) => {
		console.log("Starting scheduled queuing of websites");

		await this.setupServices();

		//get all the enabled sites
		const sites = await this.database.getSitesForRun();

		//put a new run in the database
		const runID = v4();
		await this.database.putRunThrough({
			runID: runID,
			executionID: data.executionID,
			time: new Date().getTime(),
			sites,
			runState: RunThroughState.Open
		})

		console.log(`Starting new run ${runID} and queueing ${sites.length} sites.`);

		//return the sites that are being parsed
		return {
			runID,
			sites
		};
	}
}

/** Starting data from the state machine */
interface StartingData {
	/** The executionID of the current execution in AWS step functions */
	executionID:string;
}

/** Data to return back to the state machine */
interface StartingOutput {
	/** The new run's ID */
	runID:string;

	/** The {@link WebsiteItem}'s that need to be parsed */
	sites:string[];
}


// noinspection JSUnusedGlobalSymbols
export const handler = new ScheduledStart().handler;
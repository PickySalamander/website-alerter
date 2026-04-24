import {DurableChild} from "../../util/durable-child";
import {DurableContext} from "@aws/durable-execution-sdk-js";
import {PollSiteData} from "../../util/poll-site-data";
import {randomUUID} from "crypto";
import {RunThroughState} from "website-alerter-shared";

/**
 * Get all the websites that should be polled for changes
 */
export class GetWebsites extends DurableChild {
	constructor(context:DurableContext) {
		super(context);
	}

	/** Get all the websites that should be polled for changes */
	async getWebsites():Promise<PollSiteData> {
		//get all the enabled sites
		const sites = await this.database.getSitesForRun();

		//if there are no sites, then we can end
		if(sites.length == 0) {
			this.context.logger.info("No sites found, ending");
			return;
		}

		//put a new run in the database
		const runID = randomUUID();

		await this.database.putRunThrough({
			runID,
			time: new Date().getTime(),
			sites: sites.map(value => value.siteID),
			runState: RunThroughState.Open
		});

		return {
			runID,
			sites
		};
	}
}

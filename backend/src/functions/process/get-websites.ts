import {DurableChild} from "../../util/durable-child";
import {DurableContext} from "@aws/durable-execution-sdk-js";
import {PollSiteData} from "./poll-site-data";
import {randomUUID} from "crypto";
import {RunThroughState} from "website-alerter-shared";

export class GetWebsites extends DurableChild {
	constructor(context:DurableContext) {
		super(context);
	}

	async getWebsites():Promise<PollSiteData> {
		//get all the enabled sites
		const sites = await this.database.getSitesForRun();

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

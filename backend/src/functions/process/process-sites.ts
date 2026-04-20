import {LambdaBase} from "../../util/lambda-base";
import {Logger} from "@aws-lambda-powertools/logger";
import {DurableContext, withDurableExecution} from "@aws/durable-execution-sdk-js";
import {ScheduledEvent} from "aws-lambda/trigger/cloudwatch-events";
import {randomUUID} from "crypto";
import {RunThroughState, WebsiteItem} from "website-alerter-shared";
import {EnvironmentVars} from "../../util/environment-vars";
import {PollSiteData} from "./poll-site-data";
import {DetectChanges} from "./detect-changes";

const logger = new Logger({serviceName: 'process-sites'});

export class ProcessSites extends LambdaBase {
	async handle(event:ScheduledEvent, context:DurableContext) {
		logger.info("Starting scheduled queuing of websites", JSON.stringify(event));

		const durableContext = context as unknown as DurableContext;

		const data = await durableContext.step("get-items", () => this.getItems());

		logger.info(`Triggering parsing of ${data.sites.length} for run ${data.runID}.`);

		const results = await durableContext.invoke('parse-sites', EnvironmentVars.pollSitesArn, data) as WebsiteItem[];

		logger.info(`Triggering change detection with ${results.length} sites that were polled.`)

		const changed = await durableContext.step("detect-changes",
			() => new DetectChanges(this, results).run());

		logger.info(`Finalizing after ${changed.length} sites were found to have changed`)
	};

	private async getItems():Promise<PollSiteData> {
		//get all the enabled sites
		const sites = await this.database.getSitesForRun();

		if(sites.length == 0) {
			console.log("No sites found, ending");
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

export const handler = withDurableExecution(new ProcessSites().handle)
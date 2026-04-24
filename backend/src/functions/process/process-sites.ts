import {LambdaBase} from "../../util/lambda-base";
import {DurableContext, RetryDecision, withDurableExecution} from "@aws/durable-execution-sdk-js";
import {ScheduledEvent} from "aws-lambda/trigger/cloudwatch-events";
import {WebsiteItem} from "website-alerter-shared";
import {EnvironmentVars} from "../../util/environment-vars";
import {DetectChanges} from "./detect-changes";
import {GetWebsites} from "./get-websites";
import {Cleanup} from "./cleanup";

/**
 * Durable function that processes all enabled {@link WebsiteItem}'s in the database to be polled. This is started by a
 * CloudWatch Event.
 */
export class ProcessSites extends LambdaBase {
	async handle(event:ScheduledEvent, context:DurableContext) {
		context.logger.info("Starting scheduled queuing of websites", JSON.stringify(event));

		//get all the websites that should be polled
		const data = await context.step("get-items",
			() => new GetWebsites(context).getWebsites(),
			{retryStrategy: () => <RetryDecision>{shouldRetry: false}}
		);

		//no websites to process
		if(data == undefined) {
			return;
		}

		context.logger.info(`Triggering parsing of ${data.sites.length} for run ${data.runID}.`);

		// parse the websites
		const results = await context.invoke('parse-sites', EnvironmentVars.pollSitesArn, data) as WebsiteItem[];

		context.logger.info(`Triggering change detection with ${results.length} sites that were polled.`)

		// use AI to detect changes
		await context.step("detect-changes", () => new DetectChanges(context, results).run());

		context.logger.info("Cleaning up after processing run");

		await context.step("cleanup", () => new Cleanup(context, data.runID).run());
	};
}

// noinspection JSUnusedGlobalSymbols
export const handler = withDurableExecution(new ProcessSites().handle)

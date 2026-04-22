import {LambdaBase} from "../../util/lambda-base";
import {DurableContext, RetryDecision, withDurableExecution} from "@aws/durable-execution-sdk-js";
import {ScheduledEvent} from "aws-lambda/trigger/cloudwatch-events";
import {WebsiteItem} from "website-alerter-shared";
import {EnvironmentVars} from "../../util/environment-vars";
import {DetectChanges} from "./detect-changes";
import {GetWebsites} from "./get-websites";

export class ProcessSites extends LambdaBase {
	async handle(event:ScheduledEvent, context:DurableContext) {
		context.logger.info("Starting scheduled queuing of websites", JSON.stringify(event));

		const data = await context.step("get-items",
			() => new GetWebsites(context).getWebsites(),
			{retryStrategy: () => <RetryDecision>{shouldRetry: false}}
		);

		if(data == undefined) {
			return;
		}

		context.logger.info(`Triggering parsing of ${data.sites.length} for run ${data.runID}.`);

		const results = await context.invoke('parse-sites', EnvironmentVars.pollSitesArn, data) as WebsiteItem[];

		context.logger.info(`Triggering change detection with ${results.length} sites that were polled.`)

		const changed = await context.step("detect-changes",
			() => new DetectChanges(context, results).run());

		context.logger.info(`Finalizing after ${changed.length} sites were found to have changed`);
	};
}

// noinspection JSUnusedGlobalSymbols
export const handler = withDurableExecution(new ProcessSites().handle)

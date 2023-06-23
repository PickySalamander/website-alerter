import {EventBridgeHandler} from "aws-lambda";
import {Utils} from "../util/utils";
import {LambdaBase} from "../util/lambda-base";
import {RunThrough, RunThroughState, SiteRunState} from "../services/database.service";
import {v4} from "uuid";
import {SqsSiteEvent} from "../util/sqs-site-event";

class ScheduledStart extends LambdaBase {
	public handler:EventBridgeHandler<string, any, void> = async() => {
		console.log("Starting scheduled queuing of websites");

		await this.setupServices();

		await this.queueSiteChecks();

		console.log("Done.");
	}

	private async queueSiteChecks() {
		console.log(`Queueing ${this.config.websites.length} websites to be checked.`);

		const runThrough:RunThrough = {
			id: v4(),
			time: new Date().getTime(),
			state: RunThroughState.Open,
			sites: {}
		};

		for(const siteConfig of this.config.websites) {
			let siteItem = await this.database.getWebsite(siteConfig.site);
			if(!siteItem) {
				console.log(`Site ${siteConfig.site} doesn't exist yet, adding to database`);

				siteItem = {
					site: siteConfig.site,
					lastCheck: 0,
					updates: []
				};

				await this.database.putWebsite(siteItem);
			}

			runThrough.sites[siteConfig.site] = {
				state: SiteRunState.Open,
				messages: []
			};

			const event:SqsSiteEvent = {
				site: siteConfig.site,
				runID: runThrough.id
			}

			if(Utils.isProduction) {
				await this.sqs.sendMessage({
					QueueUrl: process.env.WEBSITE_QUEUE_NAME,
					MessageBody: JSON.stringify(event)
				}).promise();
			} else {
				console.log(`Would have queued ${siteConfig.site} to be checked, but this isn't production.`);
			}
		}

		await this.database.putRunThrough(runThrough);

		if(Utils.isProduction) {
			await this.sqs.sendMessage({
				QueueUrl: process.env.END_QUEUE,
				MessageBody: `{\"runID\":\"${runThrough.id}\"}`
			}).promise();
		}
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new ScheduledStart().handler;
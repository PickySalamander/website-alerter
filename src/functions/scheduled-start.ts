import {EventBridgeHandler} from "aws-lambda";
import {Utils} from "../util/utils";
import {LambdaBase} from "../util/lambda-base";
import {RunThrough, RunThroughState, SiteRunState} from "../services/database.service";
import {v4} from "uuid";
import {SqsSiteEvent} from "../util/sqs-site-event";

/**
 * Start the entire flow of polling websites for changes. Called from EventBridge, this function will go through a JSON
 * config file in S3 and queue up sites into SQS for checking.
 */
class ScheduledStart extends LambdaBase {
	public handler:EventBridgeHandler<string, any, void> = async() => {
		console.log("Starting scheduled queuing of websites");

		await this.setupServices();

		//queue up the sites from the config
		await this.queueSiteChecks();

		console.log("Done.");
	}

	/** Queue up the sites from the config */
	private async queueSiteChecks() {
		console.log(`Queueing ${this.config.websites.length} websites to be checked.`);

		//create a new run through for the database
		const runThrough:RunThrough = {
			id: v4(),
			time: new Date().getTime(),
			runState: RunThroughState.Open,
			sites: {}
		};

		const events:SqsSiteEvent[] = [];

		//go through each site in the config
		for(const siteConfig of this.config.websites) {
			//get the site from the database, if it doesn't exist then add it
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

			//add the site to the run through
			runThrough.sites[siteConfig.site] = {
				siteState: SiteRunState.Open
			};

			//create the event to trigger the polling
			events.push({
				site: siteConfig.site,
				runID: runThrough.id
			});
		}

		//put the new run in the database
		await this.database.putRunThrough(runThrough);

		if(Utils.isProduction) {
			//queue the maintenance check of the whole flow
			await this.sqs.sendMessage({
				QueueUrl: process.env.END_QUEUE,
				MessageBody: `{\"runID\":\"${runThrough.id}\"}`
			}).promise();

			//queue each of the sites to be polled
			for(const event of events) {
				await this.sqs.sendMessage({
					QueueUrl: process.env.WEBSITE_QUEUE_NAME,
					MessageBody: JSON.stringify(event)
				}).promise();
			}
		} else {
			console.log(`Would have queued ${events.length} events to be checked, but this isn't production.`);
		}

		console.log(`Started run ${runThrough.id}.`);
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new ScheduledStart().handler;
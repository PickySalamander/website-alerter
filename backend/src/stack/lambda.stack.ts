import {WebsiteAlerterStack} from "../website-alerter.stack";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {DockerImageCode, FunctionBase} from "aws-cdk-lib/aws-lambda";
import {Duration} from "aws-cdk-lib";
import {AlerterDockerFunction, AlerterJsFunction} from "./alerter-js-function";

export class LambdaStack {
	public readonly scheduledStart:FunctionBase;

	public readonly processSite:FunctionBase;

	public readonly detectChanges:FunctionBase;

	public readonly scheduledEnd:FunctionBase;

	constructor(stack:WebsiteAlerterStack) {
		const environment = {
			"CONFIG_S3": stack.configBucket.bucketName,
			"USERS_TABLE": stack.dynamo.usersTable.tableName,
			"WEBSITE_TABLE": stack.dynamo.websiteTable.tableName,
			"RUN_TABLE": stack.dynamo.runThroughTable.tableName,
			"NUM_REVISIONS_ALLOWED": "5",
			"IS_PRODUCTION": "true"
		};

		// create the scheduled start function which starts the whole process when hit with the event bridge rule
		this.scheduledStart = new AlerterJsFunction(stack, "ScheduledStart", {
			description: "Scheduled start of the scraping process this will select what type of sites to query",
			entry: "src/functions/process/scheduled-start.ts",
			environment
		});

		// create the docker image lambda function that triggers the website polling with Puppeteer. This needs to be
		// built with "npm run build" first.
		this.processSite = new AlerterDockerFunction(stack, "ProcessSite", {
			code: DockerImageCode.fromImageAsset("build/process-site"),
			description: "Scheduled call to the function to start scrapping process",
			environment,
			//bigger memory size and timeout to give a chance for puppeteer to run
			memorySize: 1024,
			timeout: Duration.minutes(1)
		});

		// detect changes from the recently polled website
		this.detectChanges = new AlerterJsFunction(stack, "DetectChanges", {
			description: "Detect the changes from the browser processing",
			entry: "src/functions/process/detect-changes.ts",
			environment
		});

		// called after the whole flow is finished to follow up on the whole process
		this.scheduledEnd = new AlerterJsFunction(stack, "ScheduledEnd", {
			description: "Finalize the whole flow by finishing up any lingering tasks, email the user via SNS, and " +
				"perform some final maintenance.",
			entry: "src/functions/process/scheduled-end.ts",
			environment
		});
	}
}
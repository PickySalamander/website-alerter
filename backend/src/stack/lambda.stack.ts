import {WebsiteAlerterStack} from "../website-alerter.stack";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {DockerImageCode, DockerImageFunction, FunctionBase, Runtime} from "aws-cdk-lib/aws-lambda";
import {Duration} from "aws-cdk-lib";
import {RetentionDays} from "aws-cdk-lib/aws-logs";
import {SqsEventSource} from "aws-cdk-lib/aws-lambda-event-sources";
import {Construct} from "constructs";

export class LambdaStack {
	public readonly scheduledStart:FunctionBase;

	public readonly processSite:FunctionBase;

	public readonly detectChanges:FunctionBase;

	public readonly scheduledEnd:FunctionBase;

	public readonly login:FunctionBase;

	constructor(stack:WebsiteAlerterStack) {
		// creat the scheduled start function which starts the whole process when hit with the event bridge rule
		this.scheduledStart = new NodejsFunction(stack, "ScheduledStart", {
			description: "Scheduled start of the scraping process this will parse the config files and queue all " +
				"the sites to SQS",
			runtime: Runtime.NODEJS_18_X,
			entry: "src/functions/scheduled-start.ts",
			handler: "handler",
			role: stack.iam.role,
			environment: {
				"CONFIG_S3": stack.configBucket.bucketName,
				"WEBSITE_TABLE": stack.dynamo.websiteTable.tableName,
				"WEBSITE_QUEUE_NAME": stack.sqs.websiteQueue.queueUrl,
				"RUN_TABLE": stack.dynamo.runThroughTable.tableName,
				"END_QUEUE": stack.sqs.endQueue.queueUrl,
				"IS_PRODUCTION": "true"
			},
			timeout: Duration.seconds(30),
			logRetention: RetentionDays.ONE_MONTH
		});

		//TODO re-add schedule
		// create the event bridge rule that starts up the whole process every 7 days
		// new Rule(this, "ScheduledStartRule", {
		// 	description: "Schedule the lambda to queue up the websites",
		// 	schedule: Schedule.rate(Duration.days(7)),
		// 	targets: [new LambdaFunction(scheduledStartFunc)]
		// });

		// create the docker image lambda function that triggers the website polling with Puppeteer. This needs to be
		// built with "npm run build" first.
		this.processSite = new DockerImageFunction(stack, "ProcessSite", {
			code: DockerImageCode.fromImageAsset("build/process-site"),
			description: "Scheduled call to the function to start scrapping process",
			role: stack.iam.role,
			environment: {
				"CONFIG_S3": stack.configBucket.bucketName,
				"WEBSITE_TABLE": stack.dynamo.websiteTable.tableName,
				"CHANGE_QUEUE_NAME": stack.sqs.changeQueue.queueUrl,
				"RUN_TABLE": stack.dynamo.runThroughTable.tableName,
				"IS_PRODUCTION": "true"
			},
			logRetention: RetentionDays.ONE_MONTH,
			events: [
				new SqsEventSource(stack.sqs.websiteQueue)
			],
			//bigger memory size and timeout to give a chance for puppeteer to run
			memorySize: 1024,
			timeout: Duration.minutes(1)
		});

		// detect changes from the recently polled website
		this.detectChanges = new NodejsFunction(stack, "DetectChanges", {
			description: "Detect the changes from the browser processing",
			runtime: Runtime.NODEJS_18_X,
			entry: "src/functions/detect-changes.ts",
			handler: "handler",
			role: stack.iam.role,
			environment: {
				"CONFIG_S3": stack.configBucket.bucketName,
				"WEBSITE_TABLE": stack.dynamo.websiteTable.tableName,
				"RUN_TABLE": stack.dynamo.runThroughTable.tableName,
				"IS_PRODUCTION": "true"
			},
			events: [
				new SqsEventSource(stack.sqs.changeQueue)
			],
			timeout: Duration.seconds(30),
			logRetention: RetentionDays.ONE_MONTH
		});

		// called after the whole flow is finished to follow up on the whole process
		this.scheduledEnd = new NodejsFunction(stack, "ScheduledEnd", {
			description: "Finalize the whole flow by finishing up any lingering tasks, email the user via SNS, and " +
				"perform some final maintenance.",
			runtime: Runtime.NODEJS_18_X,
			entry: "src/functions/scheduled-end.ts",
			handler: "handler",
			role: stack.iam.role,
			environment: {
				"CONFIG_S3": stack.configBucket.bucketName,
				"WEBSITE_TABLE": stack.dynamo.websiteTable.tableName,
				"RUN_TABLE": stack.dynamo.runThroughTable.tableName,
				"IS_PRODUCTION": "true"
			},
			events: [
				new SqsEventSource(stack.sqs.endQueue)
			],
			timeout: Duration.seconds(30),
			logRetention: RetentionDays.ONE_MONTH
		});

		this.login = new NodejsFunction(stack, "Login", {
			description: "Login with JWT process",
			runtime: Runtime.NODEJS_18_X,
			entry: "src/functions/login.ts",
			handler: "handler",
			role: stack.iam.role,
			environment: {
				"CONFIG_S3": stack.configBucket.bucketName,
				"IS_PRODUCTION": "true"
			},
			logRetention: RetentionDays.ONE_MONTH
		});
	}
}
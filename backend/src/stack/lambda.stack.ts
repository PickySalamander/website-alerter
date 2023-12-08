import {WebsiteAlerterStack} from "../website-alerter.stack";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {DockerImageCode, DockerImageFunction, FunctionBase, Runtime} from "aws-cdk-lib/aws-lambda";
import {Duration} from "aws-cdk-lib";
import {RetentionDays} from "aws-cdk-lib/aws-logs";
import {SqsEventSource} from "aws-cdk-lib/aws-lambda-event-sources";
import {NodejsFunctionProps} from "aws-cdk-lib/aws-lambda-nodejs/lib/function";
import {DockerImageFunctionProps} from "aws-cdk-lib/aws-lambda/lib/image-function";

export class LambdaStack {
	public readonly scheduledStart:FunctionBase;

	public readonly processSite:FunctionBase;

	public readonly detectChanges:FunctionBase;

	public readonly scheduledEnd:FunctionBase;

	public readonly login:FunctionBase;

	public readonly cors:FunctionBase;

	public readonly auth:FunctionBase;

	public readonly getSites:FunctionBase;

	public readonly putSite:FunctionBase;

	public readonly deleteSites:FunctionBase;

	constructor(stack:WebsiteAlerterStack) {
		// creat the scheduled start function which starts the whole process when hit with the event bridge rule
		this.scheduledStart = new AlerterJsFunction(stack, "ScheduledStart", {
			description: "Scheduled start of the scraping process this will parse the config files and queue all " +
				"the sites to SQS",
			entry: "src/functions/process/scheduled-start.ts",
			environment: {
				"CONFIG_S3": stack.configBucket.bucketName,
				"WEBSITE_TABLE": stack.dynamo.websiteTable.tableName,
				"WEBSITE_QUEUE_NAME": stack.sqs.websiteQueue.queueUrl,
				"RUN_TABLE": stack.dynamo.runThroughTable.tableName,
				"END_QUEUE": stack.sqs.endQueue.queueUrl,
				"IS_PRODUCTION": "true"
			}
		});

		// create the docker image lambda function that triggers the website polling with Puppeteer. This needs to be
		// built with "npm run build" first.
		this.processSite = new AlerterDockerFunction(stack, "ProcessSite", {
			code: DockerImageCode.fromImageAsset("build/process-site"),
			description: "Scheduled call to the function to start scrapping process",
			environment: {
				"CONFIG_S3": stack.configBucket.bucketName,
				"WEBSITE_TABLE": stack.dynamo.websiteTable.tableName,
				"CHANGE_QUEUE_NAME": stack.sqs.changeQueue.queueUrl,
				"RUN_TABLE": stack.dynamo.runThroughTable.tableName,
				"IS_PRODUCTION": "true"
			},
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
			entry: "src/functions/process/detect-changes.ts",
			environment: {
				"CONFIG_S3": stack.configBucket.bucketName,
				"WEBSITE_TABLE": stack.dynamo.websiteTable.tableName,
				"RUN_TABLE": stack.dynamo.runThroughTable.tableName,
				"IS_PRODUCTION": "true"
			},
			events: [
				new SqsEventSource(stack.sqs.changeQueue)
			]
		});

		// called after the whole flow is finished to follow up on the whole process
		this.scheduledEnd = new AlerterJsFunction(stack, "ScheduledEnd", {
			description: "Finalize the whole flow by finishing up any lingering tasks, email the user via SNS, and " +
				"perform some final maintenance.",
			runtime: Runtime.NODEJS_18_X,
			entry: "src/functions/process/scheduled-end.ts",
			environment: {
				"CONFIG_S3": stack.configBucket.bucketName,
				"WEBSITE_TABLE": stack.dynamo.websiteTable.tableName,
				"RUN_TABLE": stack.dynamo.runThroughTable.tableName,
				"IS_PRODUCTION": "true"
			},
			events: [
				new SqsEventSource(stack.sqs.endQueue)
			]
		});

		this.login = new AlerterDockerFunction(stack, "Login", {
			code: DockerImageCode.fromImageAsset("build/login"),
			description: "Login users to the API using JWT",
			environment: {
				"CONFIG_S3": stack.configBucket.bucketName,
				"USERS_TABLE": stack.dynamo.usersTable.tableName,
				"IS_PRODUCTION": "true"
			}
		});

		this.cors = new AlerterJsFunction(stack, "Cors", {
			description: "Handle general cors requests to the backend",
			entry: "src/functions/api/cors.ts",
			environment: {
				"CONFIG_S3": stack.configBucket.bucketName,
				"IS_PRODUCTION": "true"
			}
		});

		this.auth = new AlerterJsFunction(stack, "Auth", {
			description: "JWT authorizor for API",
			entry: "src/functions/api/auth.ts",
			environment: {
				"CONFIG_S3": stack.configBucket.bucketName,
				"IS_PRODUCTION": "true"
			}
		});

		//TODO get sites
		this.getSites = new AlerterJsFunction(stack, "GetSites", {
			description: "Get a list of sites for the user already configured in the backend",
			entry: "src/functions/api/get-sites.ts",
			environment: {
				"CONFIG_S3": stack.configBucket.bucketName,
				"WEBSITE_TABLE": stack.dynamo.websiteTable.tableName,
				"IS_PRODUCTION": "true"
			}
		});

		this.putSite = new AlerterJsFunction(stack, "PutSite", {
			description: "Put a new site into the backend for a user",
			entry: "src/functions/api/put-site.ts",
			environment: {
				"CONFIG_S3": stack.configBucket.bucketName,
				"WEBSITE_TABLE": stack.dynamo.websiteTable.tableName,
				"IS_PRODUCTION": "true"
			}
		});

		this.deleteSites = new AlerterJsFunction(stack, "DeleteSites", {
			description: "Delete site in the backend for a user",
			entry: "src/functions/api/delete-sites.ts",
			environment: {
				"CONFIG_S3": stack.configBucket.bucketName,
				"WEBSITE_TABLE": stack.dynamo.websiteTable.tableName,
				"IS_PRODUCTION": "true"
			}
		})
	}
}

class AlerterJsFunction extends NodejsFunction {

	constructor(stack:WebsiteAlerterStack, id:string, props?:NodejsFunctionProps) {
		super(stack, id,
			Object.assign({
				timeout: Duration.seconds(30),
				logRetention: RetentionDays.ONE_MONTH,
				runtime: Runtime.NODEJS_18_X,
				handler: "handler",
				role: stack.iam.role,
			}, props));
	}
}

class AlerterDockerFunction extends DockerImageFunction {

	constructor(stack:WebsiteAlerterStack, id:string, props?:DockerImageFunctionProps) {
		super(stack, id,
			Object.assign({
				timeout: Duration.seconds(30),
				logRetention: RetentionDays.ONE_MONTH,
				role: stack.iam.role,
			}, props));
	}
}
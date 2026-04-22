import {WebsiteAlerterStack} from "./website-alerter.stack";
import {DockerImageCode, DockerImageFunction, FunctionBase, Runtime} from "aws-cdk-lib/aws-lambda";
import {Duration, RemovalPolicy} from "aws-cdk-lib";
import {LogGroup, RetentionDays} from "aws-cdk-lib/aws-logs";
import {Construct} from "constructs";
import {NodejsFunction, NodejsFunctionProps} from "aws-cdk-lib/aws-lambda-nodejs";

/**
 * Part of the CDK stack that concerns all lambda functions for the REST API
 */
export class LambdaStack extends Construct {
	private readonly environment:{ [p:string]:string };

	/** Get all sites in the database */
	readonly getSites:FunctionBase;

	/** Put or edit a site in the database */
	readonly putSite:FunctionBase;

	/** Delete a series of sites */
	readonly deleteSites:FunctionBase;

	/** Get all runs */
	readonly getRuns:FunctionBase;

	/** Get all revisions in a run */
	readonly getRunRevisions:FunctionBase;

	/** Get all revisions for a site */
	readonly getSiteRevisions:FunctionBase;

	/** Get a specific revision */
	readonly getRevision:FunctionBase;

	readonly pollSites:FunctionBase;

	readonly processSites:FunctionBase;

	/** Create the stack */
	constructor(private stack:WebsiteAlerterStack) {
		super(stack, "Lambdas");

		//TODO re-enable
		// //allowed origins allowed for cors
		// let allowOrigins = `https://${stack.cdn.cdn.distributionDomainName}`;
		//
		// //if the env variable is set add localhost
		// if(stack.isLocal) {
		// 	allowOrigins += ",http://localhost:4200";
		// }

		//setup default environmental variables for the functions
		this.environment = {
			"CONFIG_S3": stack.configBucket.bucketName,
			"RUN_TABLE": stack.dynamo.runThroughTable.tableName,
			"WEBSITE_TABLE": stack.dynamo.websiteTable.tableName,
			"REVISION_TABLE": stack.dynamo.revisionTable.tableName,
			"NODE_OPTIONS": "--enable-source-maps",
			"IS_PRODUCTION": "true",
			// TODO re-enable
			// "ALLOWED_ORIGINS": allowOrigins
		};

		//TODO re-enable all when site back up (also remove from tsconfig.json)
		// this.getSites = this.addFunction("GetSites", {
		// 	description: "Get a list of sites for the user already configured in the backend",
		// 	entry: "src/functions/api/get-sites.ts"
		// });
		//
		// this.putSite = this.addFunction("PutSite", {
		// 	description: "Put or edit a site into the backend for a user",
		// 	entry: "src/functions/api/put-site.ts"
		// });
		//
		// this.deleteSites = this.addFunction("DeleteSites", {
		// 	description: "Delete site(s) in the backend for a user",
		// 	entry: "src/functions/api/delete-sites.ts"
		// });
		//
		// this.getSiteRevisions = this.addFunction("GetSiteRevisions", {
		// 	description: "Get all revisions for a website",
		// 	entry: "src/functions/api/get-site-revisions.ts"
		// });
		// ``
		// this.getRuns = this.addFunction("GetRuns", {
		// 	description: "Get all runs in the database",
		// 	entry: "src/functions/api/get-runs.ts"
		// });
		//
		// this.getRunRevisions = this.addFunction("GetRunRevisions", {
		// 	description: "Get all the revisions in a particular run",
		// 	entry: "src/functions/api/get-run-revisions.ts"
		// });
		//
		// this.getRevision = this.addFunction("GetRevision", {
		// 	description: "Get the revision and pre-signed urls for accessing the data",
		// 	entry: "src/functions/api/get-revision.ts"
		// });

		this.pollSites = new DockerImageFunction(this, 'PollSites', {
			functionName: "website-alerter-poll-sites",
			timeout: Duration.minutes(15),
			memorySize: 1024,
			role: this.stack.iam.lambdaRole,
			code: DockerImageCode.fromImageAsset("build/process-site"),
			environment: this.environment,
			logGroup: this.createLogGroup("PollSites")
		})

		this.processSites = this.addFunction("ProcessSites", {
			description: "Durable function that runs periodically to check for changes",
			entry: "src/functions/process/process-sites.ts",
			durableConfig: {
				executionTimeout: Duration.hours(1),
				retentionPeriod: Duration.days(30)
			},
			environment: {
				...this.environment,
				POLL_SITES_ARN: this.pollSites.functionArn
			}
		});
	}

	addFunction(name:string, props:NodejsFunctionProps) {
		const functionProps:NodejsFunctionProps = Object.assign({
			functionName: `website-alerter-${LambdaStack.kebabCase(name)}`,
			timeout: Duration.seconds(30),
			logGroup: this.createLogGroup(name),
			runtime: Runtime.NODEJS_24_X,
			handler: "handler",
			role: this.stack.iam.lambdaRole,
			bundling: {
				externalModules: this.stack.isLocal ? [] : ["@aws-sdk/*"],
				metafile: true,
				minify: true,
				sourceMap: true
			},
			environment: this.environment
		}, props);

		return new NodejsFunction(this, name, functionProps);
	}

	createLogGroup(name:string) {
		return new LogGroup(this, `${name}Logs`, {
			logGroupName: `website-alerter/lambda/website-alerter-${LambdaStack.kebabCase(name)}`,
			retention: RetentionDays.ONE_MONTH,
			removalPolicy: RemovalPolicy.DESTROY
		})
	}

	/** Turn a name into kebab case */
	private static kebabCase(name:string) {
		return name.replace(/[A-Z]+(?![a-z])|[A-Z]/g, (
			substring, args) => (args ? "-" : "") + substring.toLowerCase())
	}
}

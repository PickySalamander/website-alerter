import {WebsiteAlerterStack} from "../website-alerter.stack";
import {DockerImageCode, FunctionBase} from "aws-cdk-lib/aws-lambda";
import {AlerterDockerFunction, AlerterJsFunction} from "./alerter-js-function";

/**
 * Part of the CDK stack that concerns all lambda functions for the REST API
 */
export class ApiLambdaStack {
	/** The login lambda function */
	public readonly login:FunctionBase;

	/** The custom lambda authorizer */
	public readonly auth:FunctionBase;

	/** Get all sites in the database */
	public readonly getSites:FunctionBase;

	/** Put or edit a site in the database */
	public readonly putSite:FunctionBase;

	/** Delete a series of sites */
	public readonly deleteSites:FunctionBase;

	/** Get all runs */
	public readonly getRuns:FunctionBase;

	/** Get all revisions in a run */
	public readonly getRunRevisions:FunctionBase;

	/** Get all revisions for a site */
	public readonly getSiteRevisions:FunctionBase;

	/** Get a specific revision */
	public readonly getRevision:AlerterJsFunction;

	/** Create the stack */
	constructor(stack:WebsiteAlerterStack) {
		//allowed origins allowed for cors
		let allowOrigins = `https://${stack.cdn.cdn.attrDomainName}`;

		//if the env variable is set add localhost
		if(process.env.INCLUDE_LOCAL_CORS === "true") {
			allowOrigins += ",http://localhost:4200";
		}

		//setup default environmental variables for the functions
		const environment = {
			"CONFIG_S3": stack.configBucket.bucketName,
			"USERS_TABLE": stack.dynamo.usersTable.tableName,
			"RUN_TABLE": stack.dynamo.runThroughTable.tableName,
			"WEBSITE_TABLE": stack.dynamo.websiteTable.tableName,
			"REVISION_TABLE": stack.dynamo.revisionTable.tableName,
			"ALLOWED_ORIGINS": allowOrigins,
			"IS_PRODUCTION": "true"
		};

		// create the docker image lambda function that logs in users. This needs to be built with "npm run build" first.
		this.login = new AlerterDockerFunction(stack, "Login", {
			code: DockerImageCode.fromImageAsset("build/login"),
			description: "Login users to the API using JWT",
			environment
		});

		this.auth = new AlerterJsFunction(stack, "Auth", {
			description: "JWT authorizer for API",
			entry: "src/functions/api/auth.ts",
			environment
		});

		this.getSites = new AlerterJsFunction(stack, "GetSites", {
			description: "Get a list of sites for the user already configured in the backend",
			entry: "src/functions/api/get-sites.ts",
			environment
		});

		this.putSite = new AlerterJsFunction(stack, "PutSite", {
			description: "Put or edit a site into the backend for a user",
			entry: "src/functions/api/put-site.ts",
			environment
		});

		this.deleteSites = new AlerterJsFunction(stack, "DeleteSites", {
			description: "Delete site(s) in the backend for a user",
			entry: "src/functions/api/delete-sites.ts",
			environment
		});

		this.getSiteRevisions = new AlerterJsFunction(stack, "GetSiteRevisions", {
			description: "Get all revisions for a website",
			entry: "src/functions/api/get-site-revisions.ts",
			environment
		});

		this.getRuns = new AlerterJsFunction(stack, "GetRuns", {
			description: "Get all runs in the database",
			entry: "src/functions/api/get-runs.ts",
			environment
		});

		this.getRunRevisions = new AlerterJsFunction(stack, "GetRunRevisions", {
			description: "Get all the revisions in a particular run",
			entry: "src/functions/api/get-run-revisions.ts",
			environment
		});

		this.getRevision = new AlerterJsFunction(stack, "GetRevision", {
			description: "Get the revision and pre-signed urls for accessing the data",
			entry: "src/functions/api/get-revision.ts",
			environment
		});
	}
}
/** Get common environmental variables that the website alerter relies on */
export abstract class EnvironmentVars {
	/** Is this a production build (Retrieved from environmental variables) */
	static get isProduction():boolean {
		return process.env.IS_PRODUCTION == "true";
	}

	/** The path of the S3 bucket used by the alerter */
	static get configS3Path():string {
		return process.env.CONFIG_S3;
	}

	/** The name of the dynamo user's table */
	static get usersTableName():string {
		return process.env.USERS_TABLE;
	}

	/** The name of the dynamo website table */
	static get websiteTableName():string {
		return process.env.WEBSITE_TABLE;
	}

	/** The name of the dynamo run through table */
	static get runTableName():string {
		return process.env.RUN_TABLE;
	}

	/** The name of the dynamo revision table */
	static get revisionTableName():string {
		return process.env.REVISION_TABLE;
	}

	/** The allowed CORS origin for the REST API */
	static get allowedOrigins():string[] {
		return process.env.ALLOWED_ORIGINS.split(",");
	}

	/** The arn of the SNS stream to send emails on */
	static get notificationSNS():string {
		return process.env.NOTIFICATION_SNS;
	}

	/** The url of the website alerter frontend */
	static get websiteUrl():string {
		return process.env.WEBSITE_URL;
	}

	/** The maximum number of runs allowed in the database and S3 */
	static get numRunsAllowed():number {
		const parsed = parseInt(process.env.NUM_RUNS_ALLOWED);
		return isNaN(parsed) ? 5 : parsed;
	}
}
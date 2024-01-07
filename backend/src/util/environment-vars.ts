/** Get common environmental variables that the webiste alerter relies on */
export abstract class EnvironmentVars {
	/** Is this a production build (Retrieved from environmental variables) */
	static get isProduction():boolean {
		return process.env.IS_PRODUCTION == "true";
	}

	static get configS3Path():string {
		return process.env.CONFIG_S3;
	}

	static get usersTableName():string {
		return process.env.USERS_TABLE;
	}

	static get websiteTableName():string {
		return process.env.WEBSITE_TABLE;
	}

	static get runTableName():string {
		return process.env.RUN_TABLE;
	}

	static get revisionTableName():string {
		return process.env.REVISION_TABLE;
	}

	static get allowedOrigins():string[] {
		return process.env.ALLOWED_ORIGINS.split(",");
	}

	static get notificationSNS():string {
		return process.env.NOTIFICATION_SNS;
	}

	static get numRevisions():number {
		const parsed = parseInt(process.env.NUM_RUNS_ALLOWED);
		return isNaN(parsed) ? 5 : parsed;
	}
}
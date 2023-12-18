/** Get common environmental variables that the webiste alerter relies on */
export abstract class EnvironmentVars {
	/** Is this a production build (Retrieved from environmental variables) */
	public static get isProduction():boolean {
		return process.env.IS_PRODUCTION == "true";
	}

	public static get isAlwaysRunSemiWeekly():boolean {
		return process.env.ALWAYS_RUN_SEMI_WEEKLY == "true";
	}

	public static get configS3Path():string {
		return process.env.CONFIG_S3;
	}

	public static get usersTableName():string {
		return process.env.USERS_TABLE;
	}

	public static get websiteTableName():string {
		return process.env.WEBSITE_TABLE;
	}

	public static get runTableName():string {
		return process.env.RUN_TABLE;
	}

	public static get revisionTableName():string {
		return process.env.REVISION_TABLE;
	}

	public static get allowedOrigins():string[] {
		return process.env.ALLOWED_ORIGINS.split(",");
	}
}
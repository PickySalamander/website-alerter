import {GetObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {ChangeOptions} from "website-alerter-shared";

/**
 * Helper service for getting the configuration JSON from S3. It won't reload a fresh JSON if already loaded.
 */
export class ConfigurationService {
	/** Saved S3 service to be reused */
	private s3:S3Client;

	/** Preloaded configuration if already loaded */
	private cachedConfig:Config;

	/** Preloaded jwt key file */
	private cachedJwt?:Buffer;

	/** The bucket used to load the JSON */
	private readonly configurationPath:string;

	/**
	 * Construct the service either with a pre-existed S3 or a new instance
	 * @param s3 use a pre-existing S3
	 */
	constructor(s3?:S3Client) {
		this.configurationPath = process.env.CONFIG_S3 as string;
		if(!this.configurationPath) {
			throw "Failed to get configuration s3 bucket from environment";
		}

		this.s3 = s3 ?? new S3Client({});
	}

	/** Load the configuration from S3 if not already loaded, otherwise the old will be returned */
	public async load():Promise<Config> {
		//if no cached version, then load a new one
		if(this.cachedConfig == null) {
			console.log(`Loading config from s3://${this.configurationPath}/config.json`);

			const s3Response = await this.s3.send(new GetObjectCommand({
				Key: "config.json",
				Bucket: this.configurationPath
			}));

			if(!s3Response.Body) {
				throw `S3 result from ${this.configurationPath}/config.json was empty`;
			}

			this.cachedConfig = JSON.parse(await s3Response.Body.transformToString("utf8"));
		}

		return this.cachedConfig;
	}

	public async loadJwt():Promise<Buffer> {
		if(!this.cachedJwt) {
			console.log(`Loading jwt key from s3://${this.configurationPath}/jwt.key`);

			const s3Response = await this.s3.send(new GetObjectCommand({
				Key: "jwt.key",
				Bucket: this.configurationPath
			}));

			if(!s3Response.Body) {
				throw `S3 result from ${this.configurationPath}/jwt.key was empty`;
			}

			this.cachedJwt = Buffer.from(await s3Response.Body.transformToByteArray());
		}

		return this.cachedJwt;
	}

	/** Get the configuration for a particular website */
	public getConfig(site:string) {
		return this.cachedConfig.websites.find(value => value.site == site);
	}

	/** Get the bucket the configuration is loaded from */
	get configPath():string {
		return this.configurationPath;
	}

	/** Returns the loaded configuration if already loaded */
	get config():Config {
		return this.cachedConfig;
	}
}

/** The configuration for the website alerter tool */
export interface Config {
	/** number of revisions to keep in the database and S3 */
	numRevisions:number;

	/** The websites to poll */
	websites:SiteConfig[];
}

/** Configuration of a website to poll */
export interface SiteConfig {
	/** The url of the site to poll */
	site:string;

	/**
	 * A CSS selector of the part of the DOM to check for changes, this should only return <u><b>one</b></u> element
	 */
	selector?:string;

	/** Options for detecting changes on the page */
	options:ChangeOptions;
}
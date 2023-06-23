import {S3} from "aws-sdk";

export class ConfigurationService {
	private s3:S3;

	private config:Config;

	private readonly configurationPath:string;

	constructor(s3?:S3) {
		this.configurationPath = process.env.CONFIG_S3 as string;
		if(!this.configurationPath) {
			throw "Failed to get configuration s3 bucket from environment";
		}

		this.s3 = s3 ?? new S3();
	}

	public async load():Promise<Config> {
		if(this.config == null) {
			console.log(`Loading config from s3://${this.configurationPath}/config.json`);

			const s3Response = await this.s3.getObject({
				Key: "config.json",
				Bucket: this.configurationPath
			}).promise();

			if(!s3Response.Body) {
				throw `S3 result from ${this.configurationPath}/config.json was empty`;
			}

			this.config = JSON.parse(s3Response.Body.toString());
		}

		return this.config;
	}

	public getConfig(site:string) {
		return this.config.websites.find(value => value.site == site);
	}

	get configPath():string {
		return this.configurationPath;
	}
}

export interface Config {
	numRevisions:number;
	websites:SiteConfig[];
}

export interface SiteConfig {
	site:string;
	selector?:string;
}
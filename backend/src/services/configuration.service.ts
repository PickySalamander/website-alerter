import {GetObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {EnvironmentVars} from "../util/environment-vars";

/**
 * Helper service for interacting with S3 assets
 */
export class ConfigurationService {
	/** Saved S3 service to be reused */
	private s3:S3Client;

	/** Preloaded jwt key file */
	private cachedJwt?:Buffer;

	/** The bucket used to load the JSON */
	private readonly configurationPath:string;

	/**
	 * Construct the service either with a pre-existed S3 or a new instance
	 * @param s3 use a pre-existing S3
	 */
	constructor(s3?:S3Client) {
		this.configurationPath = EnvironmentVars.configS3Path;
		if(!this.configurationPath) {
			throw "Failed to get configuration s3 bucket from environment";
		}

		this.s3 = s3 ?? new S3Client({});
	}

	/** Load the JWT signature in S3 */
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

	/** Get the bucket for this project */
	get configPath():string {
		return this.configurationPath;
	}
}
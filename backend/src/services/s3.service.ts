import {EnvironmentVars} from "../util/environment-vars";
import {DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";

/**
 * Helper service for interfacing with a S3
 */
export class S3Service {
	/** Stored client to use */
	private readonly client:S3Client = new S3Client();

	/**
	 * Retrieve an object from S3 as a string
	 * @param key the key of the object in the {@link EnvironmentVars.configS3Path} bucket
	 * @returns the object as a string
	 */
	async getString(key:string):Promise<string> {
		//get the html from S3
		const s3Result = await this.client.send(new GetObjectCommand({
			Bucket: EnvironmentVars.configS3Path,
			Key: key
		}));

		//get the html string
		return await s3Result.Body.transformToString("utf8");
	}

	/**
	 * Retrieve an object from S3 as a json
	 * @param key the key of the object in the {@link EnvironmentVars.configS3Path} bucket
	 * @returns the object as a json object
	 */
	async getJson<T>(key:string):Promise<T> {
		const str = await this.getString(key);
		return typeof str === "string" ? JSON.parse(str) as T : undefined;
	}

	/**
	 * Retrieve a pre-signed url to an S3 object
	 * @param key the key of the object in the {@link EnvironmentVars.configS3Path} bucket
	 * @returns the pre-signed url
	 */
	async getPreSigned(key:string):Promise<string> {
		return getSignedUrl(this.client, new GetObjectCommand({
				Bucket: EnvironmentVars.configS3Path,
				Key: key
			}));
	}

	/**
	 * Put an object into S3
	 * @param key the key of the object in the {@link EnvironmentVars.configS3Path} bucket
	 * @param body the body to put in S3
	 */
	async putObject(key:string, body:string | Buffer) {
		await this.client.send(new PutObjectCommand({
			Bucket: EnvironmentVars.configS3Path,
			Key: key,
			Body: body
		}));
	}

	/**
	 * Delete an object from S3
	 * @param key the key of the object in the {@link EnvironmentVars.configS3Path} bucket
	 */
	async deleteObject(key:string) {
		try {
			await this.client.send(new DeleteObjectCommand({
				Bucket: EnvironmentVars.configS3Path,
				Key: key
			}));
		} catch(e) {
			console.warn(`Failed to delete s3://${EnvironmentVars.configS3Path}/${key}`);
		}
	}


}

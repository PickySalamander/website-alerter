import {DatabaseService} from "../services/database.service";
import {ConfigurationService} from "../services/configuration.service";
import {S3Client} from "@aws-sdk/client-s3";
import {SQSClient} from "@aws-sdk/client-sqs";

/** Base class for all Lambda functions in tool */
export abstract class LambdaBase {
	/** Cached configuration from S3 */
	private _configService:ConfigurationService;

	/** Cached database connection to Dynamo */
	private _database:DatabaseService;

	/** Cached S3 client */
	private _s3:S3Client;

	/** Cached SQS client */
	private _sqs:SQSClient;

	/** Have all the services been loaded? */
	private init:boolean = false;

	/** Load and setup all the services required */
	protected async setupServices():Promise<void> {
		if(!this.init) {
			this._database = new DatabaseService();
			this._s3 = new S3Client({});
			this._configService = new ConfigurationService(this.s3);

			await this._configService.load();

			this.init = true;
		}
	}

	/** Get the bucket the configuration is loaded from */
	get configPath() {
		return this._configService.configPath;
	}

	/** Get the configuration service for loading from S3 */
	get configService() {
		return this._configService;
	}

	/** Returns the loaded configuration if already loaded */
	get config() {
		return this._configService.config;
	}

	/** Cached S3 client */
	get s3() {
		return this._s3;
	}

	/** Cached database connection to Dynamo */
	get database() {
		return this._database;
	}

	/** Cached SQS client */
	get sqs() {
		if(!this._sqs) {
			this._sqs = new SQSClient({});
		}

		return this._sqs;
	}
}
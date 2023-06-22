import {DatabaseService} from "../services/database.service";
import {S3, SQS} from "aws-sdk";
import {Config, ConfigurationService} from "../services/configuration.service";

export abstract class LambdaBase {
	private _configService:ConfigurationService;
	private _database:DatabaseService;
	private _s3:S3;
	private _config:Config;
	private _sqs:SQS;

	private init:boolean = false;

	protected async setupServices():Promise<void> {
		if(!this.init) {
			this._database = new DatabaseService();
			this._s3 = new S3();
			this._configService = new ConfigurationService(this.s3);

			this._config = await this._configService.load();
		}
	}

	get configPath() {
		return this._configService.configPath;
	}

	get configService() {
		return this._configService;
	}

	get config() {
		return this._config;
	}

	get s3() {
		return this._s3;
	}

	get database() {
		return this._database;
	}

	get sqs() {
		if(!this._sqs) {
			this._sqs = new SQS();
		}

		return this._sqs;
	}

}
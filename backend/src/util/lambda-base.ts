import {DatabaseService} from "../services/database.service";
import {SNSClient} from "@aws-sdk/client-sns";
import {S3Service} from "../services/s3.service";

/** Base class for all Lambda functions in the tool */
export abstract class LambdaBase {

	/** Cached database connection to Dynamo */
	private _database:DatabaseService;

	/** Cached S3 service */
	private _s3:S3Service;

	/** Cached SNS client */
	private _sns:SNSClient;

	/** Cached S3 service */
	get s3() {
		if(!this._s3) {
			this._s3 = new S3Service();
		}

		return this._s3;
	}

	/** Cached database connection to Dynamo */
	get database() {
		if(!this._database) {
			this._database = new DatabaseService();
		}

		return this._database;
	}

	/** Cached SNS client */
	get sns() {
		if(!this._sns) {
			this._sns = new SNSClient();
		}

		return this._sns;
	}
}

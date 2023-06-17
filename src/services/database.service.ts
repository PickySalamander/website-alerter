import {DocumentClient} from "aws-sdk/lib/dynamodb/document_client";
import {Utils} from "../util/utils";
import {DynamoDB} from "aws-sdk";

export class DatabaseService {
	private client:DocumentClient;

	constructor() {
		if(Utils.isProduction) {
			this.client = new DynamoDB.DocumentClient();
		} else {
			//if a dev environment try to connect to docker
			this.client = new DynamoDB.DocumentClient({
				endpoint: 'http://host.docker.internal:8000'
			});
		}
	}

	public async getWebsite(siteName:string) {
		const response = await this.client.get({
			TableName: process.env.WEBSITE_TABLE,
			Key: {
				site: siteName
			}
		}).promise();

		return response.Item as WebsiteItem;
	}

	public async putWebsite(item:WebsiteItem) {
		await this.client.put({
			TableName: process.env.WEBSITE_TABLE,
			Item: item
		}).promise();
	}
}

export interface WebsiteItem {
	site:string;
	lastCheck:number;
	lastChanged?:number;
}
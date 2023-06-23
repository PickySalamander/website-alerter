import {Utils} from "../util/utils";
import {DocumentClient} from "aws-sdk/clients/dynamodb";
import {DynamoDB} from "aws-sdk";
import UpdateItemInput = DocumentClient.UpdateItemInput;

export class DatabaseService {
	private client:DocumentClient;

	constructor() {
		if(Utils.isProduction) {
			this.client = new DynamoDB.DocumentClient();
		} else {
			console.log("Dynamo connecting to localhost");

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

	public async putRunThrough(runThrough:RunThrough) {
		await this.client.put({
			TableName: process.env.RUN_TABLE,
			Item: runThrough
		}).promise();
	}

	public async getRunThrough(runID:string) {
		const response = await this.client.get({
			TableName: process.env.RUN_TABLE,
			Key: {
				id: runID
			}
		}).promise();

		return response?.Item as RunThrough;
	}

	public async updateRunSiteState(runID:string, site:string, state:SiteRunState, revision?:string) {
		const params:UpdateItemInput = {
			TableName: process.env.RUN_TABLE,
			Key: {
				id: runID
			},
			UpdateExpression: "SET sites.#site.siteState = :state",
			ExpressionAttributeNames: {
				"#site": site
			},
			ExpressionAttributeValues: {
				":state": state
			}
		};

		if(typeof revision == "string") {
			params.UpdateExpression += ", sites.#site.revision = :revision";
			params.ExpressionAttributeValues[":revision"] = revision;
		}

		await this.client.update(params).promise();
	}

	public async updateRunState(runID:string, state:RunThroughState) {
		await this.client.update({
			TableName: process.env.RUN_TABLE,
			Key: {
				id: runID
			},
			UpdateExpression: "SET runState = :state",
			ExpressionAttributeValues: {
				":state": state
			}
		}).promise()
	}
}

export interface WebsiteItem {
	site:string;
	lastCheck:number;
	lastChanged?:number;
	updates:WebsiteCheck[];
}

export interface WebsiteCheck {
	time:number;
	id:string;
}

export interface RunThrough {
	id:string;
	time:number;
	sites:{ [site:string]:SiteRun };
	runState:RunThroughState;
}

export interface SiteRun {
	siteState:SiteRunState,
	revision?:string;
}

export enum RunThroughState {
	Open,
	Complete,
	Expired
}

export enum SiteRunState {
	Open,
	Polled,
	Complete
}
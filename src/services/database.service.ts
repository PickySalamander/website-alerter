import {Utils} from "../util/utils";
import {DocumentClient} from "aws-sdk/clients/dynamodb";
import {DynamoDB} from "aws-sdk";
import UpdateItemInput = DocumentClient.UpdateItemInput;

/**
 * Helper service for interfacing with a DynamoDB database storing tables for the tool.
 */
export class DatabaseService {
	/** Stored client to use */
	private client:DocumentClient;

	constructor() {
		//if production we use the account's database
		if(Utils.isProduction) {
			this.client = new DynamoDB.DocumentClient();
		}

		//if not production use the local docker dynamodb
		else {
			console.log("Dynamo connecting to localhost");

			//if a dev environment try to connect to docker
			this.client = new DynamoDB.DocumentClient({
				endpoint: 'http://host.docker.internal:8000'
			});
		}
	}

	/**
	 * Get a website's configuration from the database
	 * @param siteName the url of the site to get
	 */
	public async getWebsite(siteName:string) {
		const response = await this.client.get({
			TableName: process.env.WEBSITE_TABLE,
			Key: {
				site: siteName
			}
		}).promise();

		return response.Item as WebsiteItem;
	}

	/**
	 * Put a new website's configuration in the database
	 * @param item the new website's configuration
	 */
	public async putWebsite(item:WebsiteItem) {
		await this.client.put({
			TableName: process.env.WEBSITE_TABLE,
			Item: item
		}).promise();
	}

	/**
	 * Add a polled revision to the website's configuration ({@link WebsiteItem.updates})
	 * @param site the site to update
	 * @param revision the revision to add to the table
	 */
	public async addRevision(site:string, revision:WebsiteCheck) {
		//get the time of the latest revision
		const revisionTime = revision.time;

		//run the update
		await this.client.update({
			TableName: process.env.WEBSITE_TABLE,
			Key: {
				site
			},
			UpdateExpression: "SET lastCheck = :revisionTime, #updates = list_append(#updates, :revision)",
			ExpressionAttributeValues: {
				":revisionTime": revisionTime,
				":revision": [revision]
			},
			ExpressionAttributeNames: {
				"#updates": "updates"
			}
		}).promise();
	}

	/**
	 * Put a new run in the database
	 * @param runThrough the new run to add
	 */
	public async putRunThrough(runThrough:RunThrough) {
		await this.client.put({
			TableName: process.env.RUN_TABLE,
			Item: runThrough
		}).promise();
	}

	/**
	 * Get a run through from the database
	 * @param runID the run's id to get
	 */
	public async getRunThrough(runID:string) {
		const response = await this.client.get({
			TableName: process.env.RUN_TABLE,
			Key: {
				id: runID
			}
		}).promise();

		return response?.Item as RunThrough;
	}

	/**
	 * Update a website's state in a run, in the database
	 * @param runID the id of the run to update
	 * @param site the site url to update
	 * @param state the state to set the site to
	 * @param revision a revision id if the site changed
	 */
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

		//if the revision was set add it to the update
		if(typeof revision == "string") {
			params.UpdateExpression += ", sites.#site.revision = :revision";
			params.ExpressionAttributeValues[":revision"] = revision;
		}

		await this.client.update(params).promise();
	}

	/**
	 * Update the entire run's state
	 * @param runID the run to update
	 * @param state the state to set to
	 */
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

/** A website's configuration stored in the database */
export interface WebsiteItem {
	/** The site's url */
	site:string;

	/** The last time the site was polled */
	lastCheck:number;

	/** The last revision of the website */
	updates:WebsiteCheck[];
}

/** A revision of a polled website */
export interface WebsiteCheck {
	/** The time it was polled */
	time:number;

	/** the id of the revision stored in S3 */
	id:string;
}

/** A run through of the website alerter tool in the database */
export interface RunThrough {
	/** The id of the run through */
	id:string;

	/** The time the run was started */
	time:number;

	/** The sites that were checked */
	sites:{ [site:string]:SiteRun };

	/** The state of the entire run */
	runState:RunThroughState;
}

/** The state of a check of a site in a {@link RunThrough} */
export interface SiteRun {
	/** The state of the site's polling and change detection */
	siteState:SiteRunState,

	/** the revision of any changes found in S3 */
	revision?:string;
}

/** The state of an entire {@link RunThrough} */
export enum RunThroughState {
	/** The run is open and being sent through the flow */
	Open,

	/** The run through is complete without errors */
	Complete,

	/** The run through is complete with errors */
	Expired
}

/** The state of the site's polling and change detection */
export enum SiteRunState {
	/** The website is getting ready to be polled by Puppeteer */
	Open,

	/** The website was polled by Puppeteer and is awaiting changed detection */
	Polled,

	/** The website was checked by change detection and is done */
	Complete
}
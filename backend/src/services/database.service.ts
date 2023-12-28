import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {
	BatchGetCommand,
	BatchGetCommandInput,
	BatchWriteCommand,
	BatchWriteCommandInput,
	DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
	QueryCommand,
	UpdateCommand, UpdateCommandInput
} from "@aws-sdk/lib-dynamodb";
import {ChangeFrequency, SiteRevision, SiteRevisionState, WebsiteItem} from "website-alerter-shared";
import {RunThrough, RunThroughState} from "website-alerter-shared/dist/util/run-through";
import {EnvironmentVars} from "../util/environment-vars";

/**
 * Helper service for interfacing with a DynamoDB database storing tables for the tool.
 */
export class DatabaseService {
	/** Stored client to use */
	private client:DynamoDBDocumentClient;

	constructor() {
		let client:DynamoDBClient;

		//if production we use the account's database
		if(EnvironmentVars.isProduction) {
			client = new DynamoDBClient({});
		}

		//if not production use the local docker dynamodb
		else {
			console.log("Dynamo connecting to localhost");

			//if a dev environment try to connect to docker
			client = new DynamoDBClient({
				endpoint: 'http://host.docker.internal:8000'
			});
		}

		this.client = DynamoDBDocumentClient.from(client);
	}

	public async getUser(email:string):Promise<UserItem> {
		const response = await this.client.send(new QueryCommand({
			TableName: EnvironmentVars.usersTableName,
			IndexName: "user-name-index",
			KeyConditionExpression: "email = :email",
			ExpressionAttributeValues: {
				":email": email
			},
			Limit: 1
		}));

		return response.Items && response.Items.length > 0 ? response.Items[0] as UserItem : undefined;
	}

	/**
	 * Get a website's configuration from the database
	 * @param siteID the url of the site to get
	 */
	public async getSite(siteID:string) {
		const response = await this.client.send(new GetCommand({
			TableName: EnvironmentVars.websiteTableName,
			Key: {
				siteID
			}
		}));

		return response.Item as WebsiteItem;
	}

	public async getAllSites(frequency:ChangeFrequency, exclusiveStartKey?:Record<string, any>) {
		return await this.client.send(new QueryCommand({
			TableName: EnvironmentVars.websiteTableName,
			IndexName: "frequency-index",
			KeyConditionExpression: "frequency = :frequency",
			ExpressionAttributeValues: {
				":frequency": frequency
			},
			ProjectionExpression: "userID, siteID, frequency",
			ExclusiveStartKey: exclusiveStartKey
		}));
	}

	public async getSites(userID:string) {
		const response = await this.client.send(new QueryCommand({
			TableName: EnvironmentVars.websiteTableName,
			IndexName: "user-index",
			KeyConditionExpression: "userID = :userID",
			ExpressionAttributeValues: {
				":userID": userID
			},
			ProjectionExpression: "siteID, userID, site, lastRunID, frequency"
		}));

		return response.Items && response.Items.length > 0 ? response.Items as WebsiteItem[] : [];
	}

	/**
	 * Put a new website's configuration in the database
	 * @param item the new website's configuration
	 */
	async putWebsite(item:WebsiteItem) {
		await this.client.send(new PutCommand({
			TableName: EnvironmentVars.websiteTableName,
			Item: item
		}));
	}

	async editWebsite(item:WebsiteItem) {
		await this.client.send(new UpdateCommand({
			TableName: EnvironmentVars.websiteTableName,
			Key: {
				siteID: item.siteID
			},
			UpdateExpression: "SET selector = :selector, frequency = :frequency, options.ignoreCss = :ignoreCss, " +
				"options.ignoreAttributes = :ignoreAttributes, options.ignoreScripts = :ignoreScripts",
			ExpressionAttributeValues: {
				":selector": item.selector,
				":frequency": item.frequency,
				":ignoreAttributes": item.options.ignoreAttributes,
				":ignoreScripts": item.options.ignoreScripts,
				":ignoreCss": item.options.ignoreCss
			}
		}));
	}

	async getSitesByID(sitesIDs:Set<string>) {
		if(sitesIDs.size > 25) {
			throw new Error("Can only batch get 25 at a time");
		}

		const params:BatchGetCommandInput = {
			RequestItems: {
				[EnvironmentVars.websiteTableName]: {
					ProjectionExpression: "siteID, userID, site, lastRunID, frequency",
					Keys: []
				}
			}
		}

		const requestItems = params.RequestItems[EnvironmentVars.websiteTableName].Keys;

		for(const siteID of sitesIDs) {
			requestItems.push({siteID});
		}

		console.debug(`Deleting ${sitesIDs.size} sites: ${JSON.stringify(params)}`);

		const get = await this.client.send(new BatchGetCommand(params));
		return get.Responses[EnvironmentVars.websiteTableName] as WebsiteItem[];
	}

	async deleteSites(sitesIDs:Set<string>) {
		if(sitesIDs.size > 25) {
			throw new Error("Can only batch delete 25 at a time");
		}

		const params:BatchWriteCommandInput = {
			RequestItems: {
				[EnvironmentVars.websiteTableName]: []
			}
		}

		const deleteRequests = params.RequestItems[EnvironmentVars.websiteTableName];

		for(const siteID of sitesIDs) {
			deleteRequests.push({
				DeleteRequest: {
					Key: {
						siteID
					}
				}
			})
		}

		console.debug(`Deleting ${sitesIDs.size} sites: ${JSON.stringify(params)}`);

		await this.client.send(new BatchWriteCommand(params));
	}

	/**
	 * Put a new run in the database
	 * @param runThrough the new run to add
	 */
	public async putRunThrough(runThrough:RunThrough) {
		await this.client.send(new PutCommand({
			TableName: EnvironmentVars.runTableName,
			Item: runThrough
		}));
	}

	/**
	 * Get a run through from the database
	 * @param runID the run's id to get
	 */
	public async getRunThrough(runID:string) {
		const response = await this.client.send(new GetCommand({
			TableName: EnvironmentVars.runTableName,
			Key: {
				id: runID
			}
		}));

		return response?.Item as RunThrough;
	}

	public async putSiteRevision(revision:SiteRevision) {
		await this.client.send(new PutCommand({
			TableName: EnvironmentVars.revisionTableName,
			Item: revision
		}));
	}

	async getSiteRevision(revisionID:string):Promise<SiteRevision> {
		const response = await this.client.send(new GetCommand({
			TableName: EnvironmentVars.revisionTableName,
			Key: {
				revisionID
			}
		}));

		return response?.Item as SiteRevision;
	}

	async getSiteRevisions(siteID:string):Promise<SiteRevision[]> {
		const response = await this.client.send(new QueryCommand({
			TableName: EnvironmentVars.revisionTableName,
			IndexName: "site-index",
			ScanIndexForward: false,
			KeyConditionExpression: "siteID = :siteID",
			ExpressionAttributeValues: {
				":siteID": siteID
			},
		}));

		return response.Items && response.Items.length > 0 ? response.Items as SiteRevision[] : [];
	}

	public async updateSiteRevision(revisionID:string, state:SiteRevisionState) {
		const time = new Date().getTime();

		await this.client.send(new UpdateCommand({
			TableName: EnvironmentVars.revisionTableName,
			Key: {
				revisionID
			},
			UpdateExpression: "SET #time = :time, siteState = :siteState",
			ExpressionAttributeValues: {
				":time": time,
				":siteState": state
			},
			ExpressionAttributeNames: {
				"#time": "time"
			}
		}));
	}

	public async updateSiteRunDetails(siteID:string, runID:string) {
		const time = new Date().getTime();

		await this.client.send(new UpdateCommand({
			TableName: EnvironmentVars.websiteTableName,
			Key: {
				siteID
			},
			UpdateExpression: "SET lastCheck = :lastCheck, lastRunID = :lastRunID",
			ExpressionAttributeValues: {
				":lastCheck": time,
				":lastRunID": runID
			}
		}));
	}

	/**
	 * Update the entire run's state
	 * @param runID the run to update
	 * @param state the state to set to
	 */
	public async updateRunState(runID:string, state:RunThroughState) {
		await this.client.send(new UpdateCommand({
			TableName: EnvironmentVars.runTableName,
			Key: {
				id: runID
			},
			UpdateExpression: "SET runState = :state",
			ExpressionAttributeValues: {
				":state": state
			}
		}));
	}
}

export interface UserItem {
	userID:string;

	email:string;

	password:string;
}
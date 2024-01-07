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
	ScanCommand,
	UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import {RunThroughStats, SiteRevision, SiteRevisionState, WebsiteItem} from "website-alerter-shared";
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

	async getUser(email:string):Promise<UserItem> {
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
	async getSite(siteID:string) {
		const response = await this.client.send(new GetCommand({
			TableName: EnvironmentVars.websiteTableName,
			Key: {
				siteID
			}
		}));

		return response.Item as WebsiteItem;
	}

	async getSites() {
		const response = await this.client.send(new ScanCommand({
			TableName: EnvironmentVars.websiteTableName,
			ProjectionExpression: "siteID, site, enabled, selector, options, created, #last",
			ExpressionAttributeNames: {
				"#last": "last"
			}
		}));

		return response.Items && response.Items.length > 0 ? response.Items as WebsiteItem[] : [];
	}

	async getSitesForRun() {
		const response = await this.client.send(new ScanCommand({
			TableName: EnvironmentVars.websiteTableName,
			FilterExpression: "#enabled = :true",
			ExpressionAttributeNames: {
				"#enabled": "enabled"
			},
			ExpressionAttributeValues: {
				":true": true
			},
			ProjectionExpression: "siteID"
		}));

		if(response.Items && response.Items.length > 0) {
			const items = response.Items as WebsiteItem[];
			return items.map(value => value.siteID);
		}

		return [];
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
			UpdateExpression: "SET selector = :selector, enabled = :enabled, options = :options",
			ExpressionAttributeValues: {
				":selector": item.selector,
				":enabled": item.enabled,
				":options": item.options
			}
		}));
	}

	async deleteSites(sitesIDs:Set<string>) {
		if(sitesIDs.size > 25) {
			throw new Error("Can only batch delete 25 at a time");
		}

		const sitesToDelete:DeleteRequestElement[] = [];
		for(const siteID of sitesIDs) {
			sitesToDelete.push(DatabaseService.createDeleteItems("siteID", siteID));
		}

		const params:BatchWriteCommandInput = {
			RequestItems: {
				[EnvironmentVars.websiteTableName]: sitesToDelete
			}
		}

		console.debug(`Deleting ${sitesIDs.size} sites: ${JSON.stringify(params)}`);

		await this.client.send(new BatchWriteCommand(params));
	}

	async getSitesByID(sitesIDs:Set<string>) {
		const keys:Record<string, any>[] = [];
		for(const siteID of sitesIDs) {
			keys.push({siteID});
		}

		const params:BatchGetCommandInput = {
			RequestItems: {
				[EnvironmentVars.websiteTableName]: {
					Keys: keys
				}
			}
		};

		console.debug(`Batch getting ${sitesIDs.size} sites: ${JSON.stringify(params)}`);

		const get = await this.client.send(new BatchGetCommand(params));
		return get.Responses[EnvironmentVars.websiteTableName] as WebsiteItem[];
	}

	/**
	 * Put a new run in the database
	 * @param runThrough the new run to add
	 */
	async putRunThrough(runThrough:RunThrough) {
		await this.client.send(new PutCommand({
			TableName: EnvironmentVars.runTableName,
			Item: runThrough
		}));
	}

	/**
	 * Update the entire run's state
	 * @param runID the run to update
	 * @param stats statistics for the front end
	 * @param state the state to set to
	 */
	async updateRunState(runID:string, stats:RunThroughStats, state:RunThroughState) {
		await this.client.send(new UpdateCommand({
			TableName: EnvironmentVars.runTableName,
			Key: {
				runID: runID
			},
			UpdateExpression: "SET runState = :state, stats = :stats",
			ExpressionAttributeValues: {
				":state": state,
				":stats": stats
			}
		}));
	}

	/**
	 * Get a run through from the database
	 * @param runID the run's id to get
	 */
	async getRunThrough(runID:string) {
		const response = await this.client.send(new GetCommand({
			TableName: EnvironmentVars.runTableName,
			Key: {
				runID: runID
			}
		}));

		return response?.Item as RunThrough;
	}

	async getRunThroughs() {
		const response = await this.client.send(new ScanCommand({
			TableName: EnvironmentVars.runTableName
		}));

		return response.Items && response.Items.length > 0 ? response.Items as RunThrough[] : [];
	}

	async putSiteRevision(revision:SiteRevision) {
		await this.client.send(new PutCommand({
			TableName: EnvironmentVars.revisionTableName,
			Item: revision
		}));

		await this.client.send(new UpdateCommand({
			TableName: EnvironmentVars.websiteTableName,
			Key: {
				siteID: revision.siteID
			},
			UpdateExpression: "SET #last = :revision",
			ExpressionAttributeValues: {
				":revision": revision
			},
			ExpressionAttributeNames: {
				"#last": "last"
			}
		}));
	}

	async updateSiteRevision(siteID:string, revisionID:string, state:SiteRevisionState) {
		await this.client.send(new UpdateCommand({
			TableName: EnvironmentVars.revisionTableName,
			Key: {
				revisionID
			},
			UpdateExpression: "SET siteState = :siteState",
			ExpressionAttributeValues: {
				":siteState": state
			}
		}));

		await this.client.send(new UpdateCommand({
			TableName: EnvironmentVars.websiteTableName,
			Key: {
				siteID
			},
			UpdateExpression: "SET #last.siteState = :state",
			ExpressionAttributeValues: {
				":state": state
			},
			ExpressionAttributeNames: {
				"#last": "last"
			}
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

	async getSiteRevisionsInRun(runID:string):Promise<SiteRevision[]> {
		const response = await this.client.send(new QueryCommand({
			TableName: EnvironmentVars.revisionTableName,
			IndexName: "run-index",
			KeyConditionExpression: "runID = :runID",
			ExpressionAttributeValues: {
				":runID": runID
			},
		}));

		return response.Items && response.Items.length > 0 ? response.Items as SiteRevision[] : [];
	}

	async getSiteRevisionsForSite(siteID:string):Promise<SiteRevision[]> {
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

	async getSiteRevisionAfter(siteID:string, time:number):Promise<SiteRevision> {
		const response = await this.client.send(new QueryCommand({
			TableName: EnvironmentVars.revisionTableName,
			IndexName: "site-index",
			ScanIndexForward: false,
			KeyConditionExpression: "siteID = :siteID and #time < :time",
			FilterExpression: " siteState <> :notOpen",
			ExpressionAttributeNames: {
				"#time": "time"
			},
			ExpressionAttributeValues: {
				":siteID": siteID,
				":time": time,
				":notOpen": SiteRevisionState.Open
			}
		}));

		return response.Items && response.Items.length > 0 ? response.Items[0] as SiteRevision : undefined;
	}

	async deleteRunsAndRevisions(runsToDelete:string[], revisionsToDelete:string[]) {
		if(runsToDelete.length + revisionsToDelete.length > 25) {
			throw new Error("Can only batch delete 25 at a time");
		}

		const runDelete:DeleteRequestElement[] =
			runsToDelete.map(value => DatabaseService.createDeleteItems("runID", value));

		const revisionDelete:DeleteRequestElement[] =
			revisionsToDelete.map(value => DatabaseService.createDeleteItems("revisionID", value));

		const request:BatchWriteCommandInput = {
			RequestItems: {
				[EnvironmentVars.runTableName]: runDelete,
				[EnvironmentVars.revisionTableName]: revisionDelete
			}
		}

		console.debug(`Deleting runs and revisions: ${JSON.stringify(request)}`);

		await this.client.send(new BatchWriteCommand(request));
	}

	private static createDeleteItems(key:string, value:string | number):DeleteRequestElement {
		return {
			DeleteRequest: {
				Key: {
					[key]: value
				}
			}
		}
	}
}

export interface UserItem {
	userID:string;

	email:string;

	password:string;
}

declare type DeleteRequestElement = { DeleteRequest:{ Key:Record<string, any> } };
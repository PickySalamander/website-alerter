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
import {
	RunThrough,
	RunThroughState,
	RunThroughStats,
	SiteRevision,
	SiteRevisionState,
	WebsiteItem
} from "website-alerter-shared";
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

	/**
	 * Get a user from the database by email
	 * @param email the email to get the user by
	 */
	async getUser(email:string):Promise<UserItem> {
		//query the database
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
	 * @param siteID the site's ID in the database
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

	/** Get all the sites in the database */
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

	/** Get all enabled sites in the database by ID*/
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

	/**
	 * Edit an existing website's configuration in the database
	 * @param item the website to edit
	 */
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

	/**
	 * Delete a series of sites in the database
	 * @param sitesIDs the site IDs of the sites to delete
	 */
	async deleteSites(sitesIDs:Set<string>) {
		if(sitesIDs.size > 25) {
			throw new Error("Can only batch delete 25 at a time");
		}

		//set up the deletion query
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

	/**
	 * Batch get a series of {@link WebsiteItem}s from the database
	 * @param sitesIDs the id's of the sites to get
	 */
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
	 * Update the a {@link RunThrough}s state and stats in the database
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
	 * Get a {@link RunThrough} from the database
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

	/** Get all {@link RunThrough}s from the database */
	async getRunThroughs() {
		const response = await this.client.send(new ScanCommand({
			TableName: EnvironmentVars.runTableName
		}));

		return response.Items && response.Items.length > 0 ? response.Items as RunThrough[] : [];
	}

	/**
	 * Put a new {@link SiteRevision} into the database. This will also update the {@link WebsiteItem.last} value in
	 * the database that this revision concerns.
	 * @param revision the revision to put in
	 */
	async putSiteRevision(revision:SiteRevision) {
		//put the new revision
		await this.client.send(new PutCommand({
			TableName: EnvironmentVars.revisionTableName,
			Item: revision
		}));

		//update the site's last
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

	/**
	 * Update a {@link SiteRevision} in the database. This will also update the {@link WebsiteItem.last} value in
	 * the database that this revision concerns.
	 * @param siteID the site this revision is for
	 * @param revisionID the revision to update
	 * @param state the new state of the revision
	 */
	async updateSiteRevision(siteID:string, revisionID:string, state:SiteRevisionState) {
		//update the revision
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

		//update the site's last
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

	/**
	 * Get a {@link SiteRevision} from the database
	 * @param revisionID the id of the revision to get
	 */
	async getSiteRevision(revisionID:string):Promise<SiteRevision> {
		const response = await this.client.send(new GetCommand({
			TableName: EnvironmentVars.revisionTableName,
			Key: {
				revisionID
			}
		}));

		return response?.Item as SiteRevision;
	}

	/**
	 * Get all the {@link SiteRevision}s in a {@link RunThrough}
	 * @param runID the run's ID to get revisions for
	 */
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

	/**
	 * Get all the {@link SiteRevision}s for a {@link WebsiteItem}
	 * @param siteID the site's ID to get revisions for
	 */
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

	/**
	 * Get all the successful polled {@link SiteRevision}s for a {@link WebsiteItem} made after a certain time
	 * @param siteID the site's ID to get revisions for
	 * @param time the epoch time to get revisions after
	 */
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

	/**
	 * Batch delete a series of runs and revisions
	 * @param runsToDelete the runs to delete
	 * @param revisionsToDelete the revisions to delete
	 */
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

	/**
	 * Helper function to create a batch delete request in DynamoDB
	 * @param key the name of the partition key
	 * @param value the value of the partition key to delete
	 * @returns the portion of the delete request
	 */
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

/** A user in the website alerter */
export interface UserItem {
	/** The user's ID */
	userID:string;

	/** The user's email */
	email:string;

	/** The user's encrypted password */
	password:string;
}

/** Portion of dynamo batch delete operation */
declare type DeleteRequestElement = { DeleteRequest:{ Key:Record<string, any> } };
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
import {SiteRevision, SiteRevisionState, WebsiteItem} from "website-alerter-shared";
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
			ProjectionExpression: "siteID, site, enabled, selector, options, created, last"
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

	/**
	 * Add a polled revision to the website's configuration ({@link WebsiteItem.updates})
	 * @param siteID the site to update
	 * @param revision the revision to add to the table
	 */
	async addSiteRevision(siteID:string, revision:SiteRevision) {
		//run the update
		await this.client.send(new UpdateCommand({
			TableName: EnvironmentVars.websiteTableName,
			Key: {
				siteID
			},
			UpdateExpression: "SET #last = :revision, #updates.#revisionID = :revision",
			ExpressionAttributeValues: {
				":revision": revision
			},
			ExpressionAttributeNames: {
				"#updates": "updates",
				"#revisionID": revision.revisionID,
				"#last": "last"
			}
		}));
	}

	async updateSiteRevision(siteID:string, revisionID:string, siteState:SiteRevisionState) {
		//run the update
		await this.client.send(new UpdateCommand({
			TableName: EnvironmentVars.websiteTableName,
			Key: {
				siteID
			},
			UpdateExpression: "SET #last.siteState = :siteState, #updates.#revisionID.siteState = :siteState",
			ExpressionAttributeValues: {
				":siteState": siteState
			},
			ExpressionAttributeNames: {
				"#updates": "updates",
				"#revisionID": revisionID,
				"#last": "last"
			}
		}));
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

	async deleteRevisions(siteID:string, toDelete:string[]) {
		let toRemoveExpression = "REMOVE ";
		let toRemoveNames:Record<string, string> = {};

		for(let i = 0; i < toDelete.length; i++) {
			toRemoveExpression += `#updates.#rev${i}`;
			toRemoveNames[`#rev${i}`] = toDelete[i];

			if(i != toDelete.length - 1) {
				toRemoveExpression += ", ";
			}
		}

		console.debug(`Deleting revisions for ${siteID} with expression:${toRemoveExpression} and names:${JSON.stringify(toRemoveNames)}`);

		//run the update
		await this.client.send(new UpdateCommand({
			TableName: EnvironmentVars.websiteTableName,
			Key: {
				siteID
			},
			UpdateExpression: toRemoveExpression,
			ExpressionAttributeNames: {
				"#updates": "updates",
				...toRemoveNames
			}
		}));
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
	 * @param state the state to set to
	 */
	async updateRunState(runID:string, state:RunThroughState) {
		await this.client.send(new UpdateCommand({
			TableName: EnvironmentVars.runTableName,
			Key: {
				runID: runID
			},
			UpdateExpression: "SET runState = :state",
			ExpressionAttributeValues: {
				":state": state
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
}

export interface UserItem {
	userID:string;

	email:string;

	password:string;
}
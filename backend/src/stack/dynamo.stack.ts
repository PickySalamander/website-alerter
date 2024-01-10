import {WebsiteAlerterStack} from "../website-alerter.stack";
import {AttributeType, BillingMode, Table} from "aws-cdk-lib/aws-dynamodb";
import {RemovalPolicy} from "aws-cdk-lib";

/**
 * Part of the CDK stack that concerns the DynamoDB database tables
 */
export class DynamoStack {
	/** Table for each website */
	public readonly websiteTable:Table;

	/** Table for each run through of the state machine */
	public readonly runThroughTable:Table;

	/** Table for users that can access the frontend */
	public readonly usersTable:Table;

	/** Table for each revision of a website in a run */
	public readonly revisionTable:Table;

	/** Create the stack */
	constructor(stack:WebsiteAlerterStack) {
		// create the website table
		this.websiteTable = new Table(stack, "WebsiteTable", {
			partitionKey: {
				name: "siteID",
				type: AttributeType.STRING
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY
		});

		// create the run table
		this.runThroughTable = new Table(stack, "RunThroughTable", {
			partitionKey: {
				name: "runID",
				type: AttributeType.STRING,
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY
		});

		//create the user's table
		this.usersTable = new Table(stack, "UserTable", {
			partitionKey: {
				name: "userID",
				type: AttributeType.STRING,
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY
		});

		//add an index for getting user's by their email address
		this.usersTable.addGlobalSecondaryIndex({
			indexName: "user-name-index",
			partitionKey: {
				name: "email",
				type: AttributeType.STRING
			},
			sortKey: {
				name: "userID",
				type: AttributeType.STRING,
			}
		});

		// create the revision table
		this.revisionTable = new Table(stack, "RevisionTable", {
			partitionKey: {
				name: "revisionID",
				type: AttributeType.STRING,
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY
		});

		//create an index for getting revisions by their site
		this.revisionTable.addGlobalSecondaryIndex({
			indexName: "site-index",
			partitionKey: {
				name: "siteID",
				type: AttributeType.STRING
			},
			sortKey: {
				name: "time",
				type: AttributeType.NUMBER
			}
		});

		//create an index for getting revisions by their run
		this.revisionTable.addGlobalSecondaryIndex({
			indexName: "run-index",
			partitionKey: {
				name: "runID",
				type: AttributeType.STRING
			},
			sortKey: {
				name: "time",
				type: AttributeType.NUMBER
			}
		});
	}
}
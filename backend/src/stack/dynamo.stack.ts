import {WebsiteAlerterStack} from "../website-alerter.stack";
import {AttributeType, BillingMode, Table} from "aws-cdk-lib/aws-dynamodb";
import {RemovalPolicy} from "aws-cdk-lib";

export class DynamoStack {
	/** Website dynamo table*/
	public readonly websiteTable:Table;

	/** Alerter run dynamo table*/
	public readonly runThroughTable:Table;

	public readonly usersTable:Table;

	public readonly revisionTable:Table;

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

		this.websiteTable.addGlobalSecondaryIndex({
			indexName: "frequency-index",
			partitionKey: {
				name: "frequency",
				type: AttributeType.STRING
			},
			sortKey: {
				name: "userID",
				type: AttributeType.STRING
			}
		});

		this.websiteTable.addGlobalSecondaryIndex({
			indexName: "user-index",
			partitionKey: {
				name: "userID",
				type: AttributeType.STRING
			},
			sortKey: {
				name: "site",
				type: AttributeType.STRING
			}
		});

		// create the run table
		this.runThroughTable = new Table(stack, "RunThroughTable", {
			partitionKey: {
				name: "runID",
				type: AttributeType.STRING,
			},
			sortKey: {
				name: "time",
				type: AttributeType.NUMBER,
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY
		});

		this.usersTable = new Table(stack, "UserTable", {
			partitionKey: {
				name: "userID",
				type: AttributeType.STRING,
			},
			sortKey: {
				name: "email",
				type: AttributeType.STRING
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY
		});

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
	}
}
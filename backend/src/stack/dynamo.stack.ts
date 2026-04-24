import {WebsiteAlerterStack} from "./website-alerter.stack";
import {AttributeType, BillingMode, Table} from "aws-cdk-lib/aws-dynamodb";
import {RemovalPolicy} from "aws-cdk-lib";
import {Construct} from "constructs";

/**
 * Part of the CDK stack that concerns the DynamoDB database tables
 */
export class DynamoStack extends Construct {
	/** Table for each website */
	public readonly websiteTable:Table;

	/** Table for each run through of the state machine */
	public readonly runThroughTable:Table;

	/** Table for each revision of a website in a run */
	public readonly revisionTable:Table;

	/** Create the stack */
	constructor(stack:WebsiteAlerterStack) {
		super(stack, "Dynamo");

		// create the website table
		this.websiteTable = new Table(this, "WebsiteTable", {
			tableName: "website-alerter-sites",
			partitionKey: {
				name: "siteID",
				type: AttributeType.STRING
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY
		});

		// create the run table
		this.runThroughTable = new Table(this, "RunThroughTable", {
			tableName: "website-alerter-runs",
			partitionKey: {
				name: "runID",
				type: AttributeType.STRING,
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY
		});

		// create the revision table
		this.revisionTable = new Table(this, "RevisionTable", {
			tableName: "website-alerter-revisions",
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

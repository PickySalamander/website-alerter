import {WebsiteAlerterStack} from "../website-alerter.stack";
import {AttributeType, BillingMode, Table} from "aws-cdk-lib/aws-dynamodb";
import {RemovalPolicy} from "aws-cdk-lib";

export class DynamoStack {
	/** Website dynamo table*/
	public readonly websiteTable:Table;

	/** Alerter run dynamo table*/
	public readonly runThroughTable:Table;

	constructor(stack:WebsiteAlerterStack) {
		// create the website table
		this.websiteTable = new Table(stack, "WebsiteTable", {
			partitionKey: {
				name: "site",
				type: AttributeType.STRING
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY
		});

		// create the run table
		this.runThroughTable = new Table(stack, "RunThroughTable", {
			partitionKey: {
				name: "id",
				type: AttributeType.STRING,
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY
		});

		this.users = new Table(stack, "UserTable", {

		});
	}
}
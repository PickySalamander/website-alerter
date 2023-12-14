import {WebsiteAlerterStack} from "../website-alerter.stack";
import {LambdaInvoke} from "aws-cdk-lib/aws-stepfunctions-tasks";
import {
	Choice,
	Condition,
	CustomState,
	DefinitionBody,
	Fail,
	Map,
	Pass,
	StateMachine
} from "aws-cdk-lib/aws-stepfunctions";
import {Duration} from "aws-cdk-lib";
import {QueryCommandInput} from "@aws-sdk/lib-dynamodb";

export class StepStack {
	constructor(stack:WebsiteAlerterStack) {
		const start = new LambdaInvoke(stack, "StartProcessing", {
			lambdaFunction: stack.lambda.scheduledStart,
			outputPath: "$.Payload"
		});

		const query = new LambdaInvoke(stack, "QueryFrequency", {
			lambdaFunction: stack.lambda.queryStart,
			outputPath: "$.Payload",
			comment: "Start the whole routine, by getting what items to query"
		});

		const dynamoMap = new Map(stack, "GetItems", {
			maxConcurrency: 1,
			comment: "Query the frequencies from the database and return the items to check",
			itemsPath: "$.shouldRun",
			resultPath: "$.items"
		}).iterator(query
			.next(new Choice(stack, "HasElements")
				.when(Condition.numberGreaterThan("$.count", 0),
					new Pass(stack, "GoOn"))
				.otherwise(new Pass(stack, "NoElements"))));

		const definition = start
			.next(new Choice(stack, "IsEmpty")
				.when(Condition.booleanEquals("$.isEmpty", true),
					new Fail(stack, "IsEmptyFail", {
						cause: "No frequencies are ready to be checked"
					}))
				.otherwise(dynamoMap));

		new StateMachine(stack, "WebsiteAlerterStateMachine", {
			definitionBody: DefinitionBody.fromChainable(definition),
			timeout: Duration.minutes(5),
			comment: "Website Alerter processing chain",
			role: stack.iam.stateMachineRole
		});
	}
}
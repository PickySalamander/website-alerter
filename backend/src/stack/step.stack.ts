import {WebsiteAlerterStack} from "../website-alerter.stack";
import {LambdaInvoke} from "aws-cdk-lib/aws-stepfunctions-tasks";
import {
	Choice,
	Condition,
	DefinitionBody,
	Fail,
	JsonPath,
	Map,
	Pass,
	StateMachine
} from "aws-cdk-lib/aws-stepfunctions";
import {Duration} from "aws-cdk-lib";
import {CfnFunction, FunctionBase} from "aws-cdk-lib/aws-lambda";

export class StepStack {
	private queryStart:LambdaInvoke;

	constructor(private stack:WebsiteAlerterStack) {
		const definition = this.lambda(stack.lambda.scheduledStart)
			.next(this.choice("IsEmpty")
				.when(Condition.booleanEquals("$.isEmpty", true),
					this.fail("IsEmptyFail"))
				.otherwise(this.getItems()));

		new StateMachine(stack, "WebsiteAlerterStateMachine", {
			definitionBody: DefinitionBody.fromChainable(definition),
			timeout: Duration.minutes(5),
			comment: "Website Alerter processing chain",
			role: stack.iam.stateMachineRole
		});
	}

	private getItems() {
		this.queryStart = this.lambda(this.stack.lambda.queryStart);

		return new Map(this.stack, "GetItems", {
			maxConcurrency: 1,
			comment: "Query the frequencies from the database and return the items to check",
			itemsPath: "$.shouldRun",
			resultPath: JsonPath.DISCARD
		}).iterator(this.queryStart
			.next(this.choice("HasElements")
				.when(Condition.numberGreaterThan("$.count", 0),
					this.processSites())
				.otherwise(this.pass("NoElements"))))
			.next(this.lambda(this.stack.lambda.scheduledEnd));
	}

	private processSites() {
		return new Map(this.stack, "ProcessSites", {
			maxConcurrency: 5,
			comment: "Process each site returned",
			itemsPath: "$.items",
			resultPath: JsonPath.DISCARD
		}).iterator(
			this.lambda(this.stack.lambda.processSite)
				.next(this.lambda(this.stack.lambda.detectChanges)))
			.next(this.choice("MoreSites")
				.when(Condition.isPresent("$.lastEvaluatedKey"),
					this.pass("QueryMore").next(this.queryStart))
				.otherwise(this.pass("QueryDone")));
	}

	private lambda(func:FunctionBase) {
		const description = (func.node.defaultChild as CfnFunction).description;

		return new LambdaInvoke(this.stack, `${func.node.id}Invoke`, {
			lambdaFunction: func,
			outputPath: "$.Payload",
			comment: description
		});
	}

	private choice(name:string) {
		return new Choice(this.stack, name);
	}

	private pass(name:string) {
		return new Pass(this.stack, name);
	}

	private fail(name:string) {
		return new Fail(this.stack, name);
	}
}
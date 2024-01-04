import {WebsiteAlerterStack} from "../website-alerter.stack";
import {LambdaInvoke, LambdaInvokeProps, StepFunctionsStartExecution} from "aws-cdk-lib/aws-stepfunctions-tasks";
import {
	Choice,
	Condition,
	DefinitionBody,
	Fail,
	JsonPath,
	Map,
	Pass,
	StateMachine,
	TaskInput
} from "aws-cdk-lib/aws-stepfunctions";
import {Duration} from "aws-cdk-lib";
import {CfnFunction, FunctionBase} from "aws-cdk-lib/aws-lambda";

export class StepStack {
	constructor(private stack:WebsiteAlerterStack) {
		// new StateMachine(stack, "WebsiteAlerterStateMachine", {
		// 	definitionBody: DefinitionBody.fromChainable(this.createAlerter()),
		// 	timeout: Duration.minutes(5),
		// 	comment: "Website Alerter processing chain",
		// 	role: stack.iam.processStateMachineRole
		// });
	}

	// private createAlerter() {
	// 	const start = this.lambda(this.stack.lambda.scheduledStart, {
	// 		payload: TaskInput.fromObject({executionID: JsonPath.executionId})
	// 	});
	//
	// 	return start.next(this.choice("IsEmpty")
	// 		.when(Condition.booleanEquals("$.isEmpty", true),
	// 			this.fail("IsEmptyFail"))
	// 		.otherwise(this.getItems()));
	// }
	//
	// private getItems() {
	// 	this.queryStart = this.lambda(this.stack.lambda.queryStart);
	//
	// 	const startMaintenance =
	// 		new StepFunctionsStartExecution(this.stack, "StartMaintenanceMachine", {
	// 			stateMachine: this.maintenanceMachine,
	// 			input: TaskInput.fromObject({
	// 				runID: JsonPath.stringAt("$.runID"),
	// 				starterExecutionID: JsonPath.executionId
	// 			})
	// 		});
	//
	// 	return new Map(this.stack, "GetItems", {
	// 		maxConcurrency: 1,
	// 		comment: "Query the frequencies from the database and return the items to check",
	// 		itemsPath: "$.shouldRun",
	// 		resultPath: JsonPath.DISCARD
	// 	}).iterator(this.queryStart
	// 		.next(this.choice("HasElements")
	// 			.when(Condition.numberGreaterThan("$.count", 0),
	// 				this.processSites())
	// 			.otherwise(this.pass("NoElements"))))
	// 		.next(this.lambda(this.stack.lambda.scheduledEnd)
	// 			.next(startMaintenance));
	// }
	//
	// private processSites() {
	// 	const processSite = this.lambda(this.stack.lambda.processSite);
	//
	// 	processSite.addRetry({
	// 		errors: ["States.TaskFailed"],
	// 		interval: Duration.seconds(2),
	// 		maxAttempts: 3
	// 	})
	//
	// 	return new Map(this.stack, "ProcessSites", {
	// 		maxConcurrency: 5,
	// 		comment: "Process each site returned",
	// 		itemsPath: "$.items",
	// 		resultPath: JsonPath.DISCARD
	// 	}).iterator(processSite
	// 			.next(this.lambda(this.stack.lambda.detectChanges)))
	// 		.next(this.choice("MoreSites")
	// 			.when(Condition.isPresent("$.lastEvaluatedKey"),
	// 				this.pass("QueryMore").next(this.queryStart))
	// 			.otherwise(this.pass("QueryDone")));
	// }

	private lambda(func:FunctionBase, options?:Partial<LambdaInvokeProps>) {
		const description = (func.node.defaultChild as CfnFunction).description;

		return new LambdaInvoke(this.stack, `${func.node.id}Invoke`,
			Object.assign({
				lambdaFunction: func,
				outputPath: "$.Payload",
				comment: description,
			}, options));
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
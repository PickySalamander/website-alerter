import {WebsiteAlerterStack} from "../website-alerter.stack";
import {LambdaInvoke, LambdaInvokeProps} from "aws-cdk-lib/aws-stepfunctions-tasks";
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
		new StateMachine(stack, "WebsiteAlerterStateMachine", {
			definitionBody: DefinitionBody.fromChainable(this.createAlerter()),
			timeout: Duration.minutes(5),
			comment: "Website Alerter processing chain",
			role: stack.iam.processStateMachineRole
		});
	}

	private createAlerter() {
		const start = this.lambda(this.stack.lambda.scheduledStart, {
			payload: TaskInput.fromObject({executionID: JsonPath.executionId})
		});

		return start
			.next(this.getItems())
			.next(this.lambda(this.stack.lambda.scheduledEnd));
	}

	private getItems() {
		return new Map(this.stack, "ProcessAndDetect", {
			maxConcurrency: 5,
			comment: "Process the sites and detect changes",
			parameters: {
				siteID: JsonPath.stringAt("$$.Map.Item.Value"),
				runID: JsonPath.stringAt("$.runID"),
			},
			itemsPath: "$.sites",
			resultPath: JsonPath.DISCARD
		}).iterator(this.processSites());
	}

	private processSites() {
		const processSite = this.lambda(this.stack.lambda.processSite);

		processSite.addRetry({
			errors: ["States.TaskFailed"],
			interval: Duration.seconds(2),
			maxAttempts: 3
		})

		return processSite.next(this.choice("WasPolled")
			.when(Condition.booleanEquals("$.wasPolled", true), this.lambda(this.stack.lambda.detectChanges))
			.otherwise(this.pass("PollFail")));
	}

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
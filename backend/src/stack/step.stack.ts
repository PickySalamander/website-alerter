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

/**
 * Part of the CDK stack that concerns the AWS Step Functions state machine for polling websites
 */
export class StepStack {
	/** The built state machine */
	public readonly stateMachine:StateMachine;

	/** Create the stack */
	constructor(private stack:WebsiteAlerterStack) {
		//build the state machine
		this.stateMachine = new StateMachine(stack, "WebsiteAlerterStateMachine", {
			definitionBody: DefinitionBody.fromChainable(this.createAlerter()),
			timeout: Duration.minutes(5),
			comment: "Website Alerter processing chain",
			role: stack.iam.processStateMachineRole
		});
	}

	/** Create the start of the chain */
	private createAlerter() {
		//the start function
		const start = this.lambda(this.stack.lambda.scheduledStart, {
			payload: TaskInput.fromObject({executionID: JsonPath.executionId})
		});

		//return the chain
		return start
			.next(this.getItems())
			.next(this.lambda(this.stack.lambda.scheduledEnd));
	}

	/** Build the part of the chain that goes through each website and polls them */
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

	/** Build the part of the chain that processes each site and detects changes */
	private processSites() {
		const processSite = this.lambda(this.stack.lambda.processSite);

		//sometimes the polling can fail due to weird errors, add a retry of 3 times
		processSite.addRetry({
			errors: ["States.TaskFailed"],
			interval: Duration.seconds(2),
			maxAttempts: 3
		})

		//if the site was successfully polled then detect changes, otherwise no reason to bother the lambda function
		return processSite.next(this.choice("WasPolled")
			.when(Condition.booleanEquals("$.wasPolled", true), this.lambda(this.stack.lambda.detectChanges))
			.otherwise(this.pass("PollFail")));
	}

	/**
	 * Helper function to add a lambda task to the step functions
	 * @param func the function to add
	 * @param options the options for the function beyond the default added
	 * @returns the invoke task for the step functions
	 */
	private lambda(func:FunctionBase, options?:Partial<LambdaInvokeProps>) {
		//insert the description for the function in for the invoke task
		const description = (func.node.defaultChild as CfnFunction).description;

		//add it
		return new LambdaInvoke(this.stack, `${func.node.id}Invoke`,
			Object.assign({
				lambdaFunction: func,
				outputPath: "$.Payload",
				comment: description,
			}, options));
	}

	/**
	 * Helper function to create a choice in the state machine
	 * @param name the name of the choice
	 */
	private choice(name:string) {
		return new Choice(this.stack, name);
	}

	/**
	 * Helper function to create a pass state in the state machine
	 * @param name the name of the pass state
	 */
	private pass(name:string) {
		return new Pass(this.stack, name);
	}
}
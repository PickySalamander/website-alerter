import {WebsiteAlerterStack} from "../website-alerter.stack";
import {CfnCondition, CfnParameter, Fn, ICfnRuleConditionExpression} from "aws-cdk-lib";

/**
 * Part of the CDK stack that concerns the CloudFormation input parameters
 */
export class ParamsStack {
	/** The email to send notification of run completions to */
	public readonly emailAddress:CfnParameter;

	/** Number of runs to leave in the database, defaults to 5 */
	public readonly numRuns:CfnParameter;

	/** Should the schedule be turned on? Defaults to off. */
	public readonly enableSchedule:ICfnRuleConditionExpression;

	/** Create the stack */
	constructor(stack:WebsiteAlerterStack) {
		this.emailAddress = new CfnParameter(stack, "notificationEmail", {
			description: "The email to send notification of run completions to"
		});

		this.numRuns = new CfnParameter(stack, "numRunsAllowed", {
			default: 5,
			description: "Number of runs to leave in the database, defaults to 5"
		});

		const enableScheduleParam = new CfnParameter(stack, "enableSchedule", {
			default: "false",
			allowedValues: ["true", "false"],
			description: "Should the schedule be turned on? Defaults to off."
		});

		//add a condition for the parameter
		const enableScheduleCondition = new CfnCondition(stack, "EnableScheduleCond", {
			expression: Fn.conditionEquals(enableScheduleParam, "true")
		});

		//add the parameter's invocation to use in the event bridge stack
		this.enableSchedule =
			Fn.conditionIf(enableScheduleCondition.logicalId, "ENABLED", "DISABLED");
	}
}
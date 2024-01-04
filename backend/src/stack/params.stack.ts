import {Role} from "aws-cdk-lib/aws-iam";
import {WebsiteAlerterStack} from "../website-alerter.stack";
import {CfnCondition, CfnParameter, Fn, ICfnRuleConditionExpression} from "aws-cdk-lib";
import {Construct} from "constructs";

export class ParamsStack {
	public readonly emailAddress:CfnParameter;

	public readonly numRevisions:CfnParameter;

	public readonly enableSchedule:ICfnRuleConditionExpression;

	constructor(stack:WebsiteAlerterStack) {

		this.emailAddress =  new CfnParameter(stack, "notificationEmail", {
			description: "The email to send notification of run completions to"
		});

		this.numRevisions = new CfnParameter(stack, "numRevisions", {
			default: 5,
			description: "Number of revisions to leave in the database, defaults to 5"
		});

		const enableScheduleParam = new CfnParameter(stack, "enableSchedule", {
			default: "false",
			allowedValues: ["true", "false"],
			description: "Should the schedule be turned on? Defaults to off."
		});

		const enableScheduleCondition = new CfnCondition(stack, "EnableScheduleCond", {
			expression: Fn.conditionEquals(enableScheduleParam, "true")
		});

		this.enableSchedule = Fn.conditionIf(enableScheduleCondition.logicalId, "ENABLED", "DISABLED");
	}
}
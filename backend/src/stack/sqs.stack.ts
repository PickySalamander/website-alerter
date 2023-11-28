import {WebsiteAlerterStack} from "../website-alerter.stack";
import {Queue} from "aws-cdk-lib/aws-sqs";
import {Duration} from "aws-cdk-lib";

export class SqsStack {
	/** Start website polling SQS queue */
	public readonly websiteQueue:Queue;

	/** Start detecting change SQS queue */
	public readonly changeQueue:Queue;

	/** Final maintenance queue with a delay to make sure everything finished ok */
	public readonly endQueue:Queue;

	constructor(stack:WebsiteAlerterStack) {
		// create a dead letter queue, that we don't really monitor, but we can use maxReceiveCount now.
		const deadQueue = new Queue(stack, "WebsiteDeadQueue");

		// create the website polling queue
		this.websiteQueue = new Queue(stack, "WebsiteQueue", {
			queueName: "website-alerter-queue",
			visibilityTimeout: Duration.minutes(2),
			deadLetterQueue: {
				queue: deadQueue,
				maxReceiveCount: 3
			}
		});

		// create the detect changes queue
		this.changeQueue = new Queue(stack, "ChangeQueue", {
			queueName: "website-alerter-change",
			deadLetterQueue: {
				queue: deadQueue,
				maxReceiveCount: 3
			}
		});

		// create the final maintenance queue with a 10 minute delay
		this.endQueue = new Queue(stack, "EndQueue", {
			queueName: "website-alerter-end",
			deliveryDelay: Duration.minutes(10),
			deadLetterQueue: {
				queue: deadQueue,
				maxReceiveCount: 3
			}
		});
	}
}
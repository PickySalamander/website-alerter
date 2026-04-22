import {LambdaBase} from "./lambda-base";
import {DurableContext} from "@aws/durable-execution-sdk-js";

export abstract class DurableChild extends LambdaBase {
	constructor(protected context:DurableContext) {
		super();
	}

	get logger() {
		return this.context.logger;
	}
}

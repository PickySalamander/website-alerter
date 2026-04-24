import {LambdaBase} from "./lambda-base";
import {DurableContext} from "@aws/durable-execution-sdk-js";

/** Base class for all Durable function steps */
export abstract class DurableChild extends LambdaBase {
	protected constructor(protected context:DurableContext) {
		super();
	}

	/** Get the logger for this function */
	get logger() {
		return this.context.logger;
	}
}

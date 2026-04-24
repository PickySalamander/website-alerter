import {APIGatewayProxyResult} from "aws-lambda";
import {MiddyUtil} from "../../util/middy-util";
import {HttpMethod} from "../../util/http-method";
import {RunThrough} from "website-alerter-shared";
import {ApiLambda} from "../../util/api-lambda";

/**
 * Get all the {@link RunThrough}'s for the client
 */
export class GetRuns extends ApiLambda {

	protected async handle():Promise<APIGatewayProxyResult> {
		console.info(`Getting runs for user ${this.user.sub}`);

		//get all the runs
		const runs = await this.database.getRunThroughs();

		console.info(`Returning ${runs.length} runs.`);

		return {
			statusCode: 200,
			body: JSON.stringify(runs)
		};
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = MiddyUtil.defaultMiddy()
	.use(MiddyUtil.cors(HttpMethod.Get))
	.handler(new GetRuns().handler);

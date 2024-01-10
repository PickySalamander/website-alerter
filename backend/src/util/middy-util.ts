import cors from "@middy/http-cors";
import middy from "@middy/core";
import errorLogger from "@middy/error-logger";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpErrorHandler from "@middy/http-error-handler";
import {EnvironmentVars} from "./environment-vars";
import {HttpMethod} from "./http-method";

/**
 * Utilities for interacting with the Middy framework
 * @see https://middy.js.org/
 */
export abstract class MiddyUtil {
	/**
	 * Add CORS configuration to the response of a request
	 * @param methods enable cors for the following HTTP methods
	 */
	static cors(...methods:HttpMethod[]) {
		const origins = EnvironmentVars.allowedOrigins;

		return cors({
			origins,
			methods: Array.isArray(methods) ? methods.join(",") : methods,
			credentials: true,
			exposeHeaders: "session"
		});
	}

	/** Add the default Middy configuration */
	static defaultMiddy() {
		return middy()
			.use(errorLogger())
			.use(httpHeaderNormalizer())
			.use(httpErrorHandler());
	}
}


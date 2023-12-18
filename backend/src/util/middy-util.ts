import cors from "@middy/http-cors";
import middy from "@middy/core";
import errorLogger from "@middy/error-logger";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpErrorHandler from "@middy/http-error-handler";
import {EnvironmentVars} from "./environment-vars";
import {HttpMethod} from "./http-method";

export abstract class MiddyUtil {
	static cors(...methods:HttpMethod[]) {
		const origins = EnvironmentVars.allowedOrigins;

		return cors({
			origins,
			methods: Array.isArray(methods) ? methods.join(",") : methods,
			credentials: true,
			exposeHeaders: "session"
		});
	}

	static defaultMiddy() {
		return middy()
			.use(errorLogger())
			.use(httpHeaderNormalizer())
			.use(httpErrorHandler());
	}
}


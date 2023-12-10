import cors from "@middy/http-cors";
import middy from "@middy/core";
import errorLogger from "@middy/error-logger";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import httpErrorHandler from "@middy/http-error-handler";

export abstract class MiddyUtil {
	static cors(methods:HttpMethod[] | HttpMethod) {
		const origins = process.env.ALLOWED_ORIGINS.split(",");

		console.log(`Here ${methods}`);

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
			.use(httpJsonBodyParser())
			.use(httpErrorHandler());
	}
}

export declare type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
/** Various utility functions */
export class Utils {

	/** Is this a production build (Retrieved from environmental variables) */
	public static get isProduction():boolean {
		return process.env.IS_PRODUCTION == "true";
	}
}
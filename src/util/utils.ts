export class Utils {
	public static get isProduction():boolean {
		return process.env.IS_PRODUCTION == "true";
	}
}
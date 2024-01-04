import {WebsiteItem} from "./website-item";
import CronParser from "aws-cron-parser";

export abstract class RunScheduling {
	static readonly CRON:string = "0 8 ? * SUN *";

	static getNext(site:WebsiteItem, now:Date = new Date()):Date | null {
		if(!site.enabled) {
			return null;
		}

		const parsed = CronParser.parse(this.CRON);
		return CronParser.next(parsed, now);
	}
}
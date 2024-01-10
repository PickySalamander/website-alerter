import {WebsiteItem} from "./website-item";
import CronParser from "aws-cron-parser";

/** Utilities for scheduling the next run of the tool */
export abstract class RunScheduling {
	/** The CRON used to queue the runs */
	static readonly CRON:string = "0 8 ? * MON *";

	/**
	 * Get the next time the website will be run through the tool
	 * @param site the site to be run
	 * @param time the time to get the next run from (Defaults to now)
	 */
	static getNext(site:WebsiteItem, time:Date = new Date()):Date | null {
		if(!site.enabled) {
			return null;
		}

		const parsed = CronParser.parse(this.CRON);
		return CronParser.next(parsed, time);
	}
}
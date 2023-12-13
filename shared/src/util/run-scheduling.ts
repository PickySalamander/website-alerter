import {ChangeFrequency, WebsiteItem} from "./website-item";
import CronParser from "aws-cron-parser";
import {ParsedCron} from "aws-cron-parser/built/lib/parse";

export abstract class RunScheduling {
	static readonly CRON:string = "0 8 ? * TUE,THU *";

	static shouldRun(now:Date = new Date()):ChangeFrequency[] {
		const [firstDay, secondDay] = this.getDays(CronParser.parse(this.CRON));

		if(now.getDay() == firstDay) {
			return [ChangeFrequency.Weekly, ChangeFrequency.SemiWeekly];
		}

		else if(now.getDay() == secondDay) {
			return [ChangeFrequency.SemiWeekly];
		}

		return [];
	}

	static getNext(site:WebsiteItem, now:Date = new Date()):Date | null {
		if(!site.frequency || site.frequency == ChangeFrequency.Never) {
			return null;
		}

		const parsed = CronParser.parse(this.CRON);
		const [firstDay] = this.getDays(CronParser.parse(this.CRON));
		const next = CronParser.next(parsed, now);

		if(site.frequency == ChangeFrequency.SemiWeekly || next.getDay() == firstDay) {
			return next;
		}

		return CronParser.next(parsed, next);
	}

	static getDays(cron:ParsedCron):[number, number] {
		return [<number>cron.daysOfWeek[0] - 1, <number>cron.daysOfWeek[1] - 1];
	}
}
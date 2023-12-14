import {ChangeFrequency} from "website-alerter-shared";

export interface ScheduledStartData {
	frequency:ChangeFrequency;
	runID:string;
	lastEvaluatedKey?:Record<string, any>;
}
import {RunScheduling} from "../src";

describe("Scheduling", () => {
	test("Next Run", () => {
		// Fri Jan 01 1999
		const friday = new Date(Date.UTC(1999, 0, 0, 8));

		// Mon Jan 04 1999
		const monday = new Date(Date.UTC(1999, 0, 4, 8));

		// Thu Jan 07 1999
		const thursday = new Date(Date.UTC(1999, 0, 7, 8));

		// Mon Jan 11 1999
		const nexMonday = new Date(Date.UTC(1999, 0, 11, 8));

		const enabled:any = {enabled: true};
		const disabled:any = {enabled: false};

		expect(RunScheduling.getNext(enabled, friday)).toEqual(monday);
		expect(RunScheduling.getNext(disabled, friday)).toBeNull();
		expect(RunScheduling.getNext(enabled, monday)).toEqual(nexMonday);
		expect(RunScheduling.getNext(disabled, monday)).toBeNull();
		expect(RunScheduling.getNext(enabled, thursday)).toEqual(nexMonday);
	});
});
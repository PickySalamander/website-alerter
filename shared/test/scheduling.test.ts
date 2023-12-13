import {ChangeFrequency, RunScheduling, WebsiteItem} from "../src";

describe("Scheduling", () => {
	const biWeekly:WebsiteItem = {
		userID: "a",
		frequency: ChangeFrequency.SemiWeekly,
		site: "test"
	};

	const weekly:WebsiteItem = {
		userID: "a",
		frequency: ChangeFrequency.Weekly,
		site: "test"
	};

	const never:WebsiteItem = {
		userID: "a",
		frequency: ChangeFrequency.Never,
		site: "test"
	};

	test("Should Run", () => {
		// Fri Jan 01 1999
		const friday = new Date(1999, 0);

		// Tue Jan 05 1999
		const tuesday = new Date(1999, 0, 5);

		// Thu Jan 07 1999
		const thursday = new Date(1999, 0, 7);

		expect(RunScheduling.shouldRun(friday)).toEqual([]);
		expect(RunScheduling.shouldRun(tuesday)).toEqual([ChangeFrequency.Weekly, ChangeFrequency.SemiWeekly]);
		expect(RunScheduling.shouldRun(thursday)).toEqual([ChangeFrequency.SemiWeekly]);
	});

	test("Next Run", () => {
		// Fri Jan 01 1999
		const friday = new Date(Date.UTC(1999, 0, 0, 8));

		// Tue Jan 05 1999
		const tuesday = new Date(Date.UTC(1999, 0, 5, 8));

		// Thu Jan 07 1999
		const thursday = new Date(Date.UTC(1999, 0, 7, 8));

		// Tue Jan 12 1999
		const nextTuesday = new Date(Date.UTC(1999, 0, 12, 8));

		expect(RunScheduling.getNext(biWeekly, friday)).toEqual(tuesday);
		expect(RunScheduling.getNext(weekly, friday)).toEqual(tuesday);
		expect(RunScheduling.getNext(never, friday)).toBeNull();

		expect(RunScheduling.getNext(biWeekly, tuesday)).toEqual(thursday);
		expect(RunScheduling.getNext(weekly, tuesday)).toEqual(nextTuesday);
		expect(RunScheduling.getNext(never, tuesday)).toBeNull();
	});
});
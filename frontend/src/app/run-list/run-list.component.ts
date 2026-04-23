import {Component, OnInit, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatTable, MatTableDataSource, MatTableModule} from "@angular/material/table";
import {RunThrough, RunThroughState} from "website-alerter-shared";
import {RunService} from "../services/run.service";
import {ShortUuidComponent} from "../short-uuid/short-uuid.component";
import {RouterLink, RouterOutlet} from "@angular/router";

/** Display of all the runs */
@Component({
	selector: 'app-run-list',
	imports: [CommonModule, MatTableModule, ShortUuidComponent, RouterOutlet, RouterLink],
	templateUrl: './run-list.component.html',
	styleUrl: './run-list.component.scss'
})
export class RunListComponent implements OnInit {
	/** Columns in the table to display */
	displayedColumns:string[] = ["time", "runID", "runState", "numSites", "changed", "unchanged", "errored"];

	/** The run throughs to show in the table */
	dataSource:MatTableDataSource<RunThrough> = new MatTableDataSource();

	/** The state of an entire {@link RunThrough} */
	RunThroughState = RunThroughState;

	/** The table display on the page */
	@ViewChild(MatTable) table:MatTable<RunThrough>;

	constructor(private runService:RunService) {
	}

	ngOnInit() {
		//get all the runs from the service and sort them
		const items = this.runService.sortedRuns;

		//add the items to the table
		if(items && items.length > 0) {
			this.dataSource.data = items;
			this.table?.renderRows();
		}
	}
}

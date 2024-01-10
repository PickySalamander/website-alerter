import {Component, OnInit, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatTable, MatTableDataSource, MatTableModule} from "@angular/material/table";
import {HttpClient} from "@angular/common/http";
import {RunThrough, RunThroughState, SiteRevision} from "website-alerter-shared";
import {SiteService} from "../services/site.service";
import {RunService} from "../services/run.service";
import {ShortUuidComponent} from "../short-uuid/short-uuid.component";
import {RouterLink, RouterOutlet} from "@angular/router";

/** Display of all the runs */
@Component({
	selector: 'app-run-list',
	standalone: true,
	imports: [CommonModule, MatTableModule, ShortUuidComponent, RouterOutlet, RouterLink],
	templateUrl: './run-list.component.html',
	styleUrl: './run-list.component.scss'
})
export class RunListComponent implements OnInit {
	/** Columns in the table to display */
	displayedColumns:string[] = ["time", "runID", "runState", "execution", "numSites", "changed", "unchanged", "errored"];

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

	/**
	 * Get the URL for the step functions execution in the AWS console
	 * @param run the run to get the execution url for
	 */
	getExecution(run:RunThrough) {
		//parse the execution ARN and turn it into a url
		if(run.executionID && run.executionID.length > 0) {
			const split = run.executionID.split(":")
			const region = split[3];
			return `https://${region}.console.aws.amazon.com/states/home?region=${region}#/v2/executions/details/${run.executionID}`;
		}

		return undefined;
	}

	/**
	 * Get the uuid of the execution from the execution's ARN
	 * @param run the run to get the execution ID from
	 */
	getExecutionID(run:RunThrough) {
		const index = run.executionID.lastIndexOf(":");
		return index >= 0 ? run.executionID.substring(index + 1) : "unknown";
	}
}

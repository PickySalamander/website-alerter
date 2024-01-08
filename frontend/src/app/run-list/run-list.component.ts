import {Component, OnInit, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatTable, MatTableDataSource, MatTableModule} from "@angular/material/table";
import {HttpClient} from "@angular/common/http";
import {RunThrough, RunThroughState, SiteRevision} from "website-alerter-shared";
import {SiteService} from "../services/site.service";
import {RunService} from "../services/run.service";
import {ShortUuidComponent} from "../short-uuid/short-uuid.component";
import {RouterLink, RouterOutlet} from "@angular/router";

@Component({
	selector: 'app-run-list',
	standalone: true,
	imports: [CommonModule, MatTableModule, ShortUuidComponent, RouterOutlet, RouterLink],
	templateUrl: './run-list.component.html',
	styleUrl: './run-list.component.scss'
})
export class RunListComponent implements OnInit {
	displayedColumns:string[] = ["time", "runID", "runState", "execution", "numSites", "changed", "unchanged", "errored"];
	dataSource = new MatTableDataSource<RunThrough>();
	RunThroughState = RunThroughState;

	/** The table display on the page */
	@ViewChild(MatTable) table:MatTable<RunThrough>;

	constructor(private http:HttpClient,
	            private runs:RunService,
	            private sites:SiteService) {
	}

	ngOnInit() {
		const items = this.runs.allItems.sort((a, b) => b.time - a.time);

		if(items && items.length > 0) {
			this.dataSource.data = items;
			this.table?.renderRows();
		}
	}

	getExecution(run:RunThrough) {
		if(run.executionID && run.executionID.length > 0) {
			const split = run.executionID.split(":")
			const region = split[3];
			return `https://${region}.console.aws.amazon.com/states/home?region=${region}#/v2/executions/details/${run.executionID}`;
		}

		return undefined;
	}

	getExecutionID(run:RunThrough) {
		const index = run.executionID.lastIndexOf(":");
		return index >= 0 ? run.executionID.substring(index + 1) : "unknown";
	}
}

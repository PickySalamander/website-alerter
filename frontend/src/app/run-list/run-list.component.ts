import {Component, OnInit, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatTable, MatTableDataSource, MatTableModule} from "@angular/material/table";
import {HttpClient} from "@angular/common/http";
import {RunThrough} from "website-alerter-shared";
import {SiteService} from "../services/site.service";
import {RunService} from "../services/run.service";
import {ShortUuidComponent} from "../short-uuid/short-uuid.component";

@Component({
	selector: 'app-run-list',
	standalone: true,
	imports: [CommonModule, MatTableModule, ShortUuidComponent],
	templateUrl: './run-list.component.html',
	styleUrl: './run-list.component.scss'
})
export class RunListComponent implements OnInit {
	displayedColumns:string[] = ["time", "runID", "numSites", "changed", "unchanged", "errored"];
	dataSource = new MatTableDataSource<RunThrough>();

	/** The table display on the page */
	@ViewChild(MatTable) table:MatTable<RunThrough>;

	constructor(private http:HttpClient,
	            private runs:RunService,
	            private sites:SiteService) {
	}

	ngOnInit() {
		const items = this.runs.allItems

		if(items && items.length > 0) {
			this.dataSource.data = items;
			this.table?.renderRows();
		}
	}
}

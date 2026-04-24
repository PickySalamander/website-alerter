import {Component, Input, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SiteRevision, WebsiteItem} from "website-alerter-shared";
import {MatTableDataSource, MatTableModule} from "@angular/material/table";
import {MatSortModule} from "@angular/material/sort";
import {RevisionStateComponent} from "../../revision-state/revision-state.component";
import {ShortUuidComponent} from "../../short-uuid/short-uuid.component";
import {RouterLink} from "@angular/router";

/** Show a list of {@link SiteRevision}s for a {@link WebsiteItem} */
@Component({
	selector: 'app-revision-list',
	imports: [
		CommonModule,
		MatTableModule,
		MatSortModule,
		RevisionStateComponent,
		ShortUuidComponent,
		RouterLink
	],
	templateUrl: './revision-list.component.html',
	styleUrl: './revision-list.component.scss'
})
export class RevisionListComponent implements OnInit {
	/** Revisions that were loaded */
	@Input() revisions:SiteRevision[];

	/** The columns in the table */
	displayedColumns:string[] = ["time", "revisionID", "runID", "siteState"];

	/** Data for the table */
	dataSource:MatTableDataSource<SiteRevision> = new MatTableDataSource();

	ngOnInit() {
		this.dataSource.data = this.revisions.sort((a, b) => b.time = a.time);
	}
}

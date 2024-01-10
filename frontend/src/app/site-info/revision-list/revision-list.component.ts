import {Component, Input, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SiteService} from "../../services/site.service";
import {SiteRevision} from "website-alerter-shared";
import {MatTableDataSource, MatTableModule} from "@angular/material/table";
import {MatSortModule} from "@angular/material/sort";
import {RevisionStateComponent} from "../../revision-state/revision-state.component";
import {HttpClient} from "@angular/common/http";
import {environment} from "../../../environments/environment";
import {ShortUuidComponent} from "../../short-uuid/short-uuid.component";
import {RouterLink} from "@angular/router";

/** Show a list of {@link SiteRevision}s for a {@link WebsiteItem} */
@Component({
	selector: 'app-revision-list',
	standalone: true,
	imports: [CommonModule, MatTableModule, MatSortModule, RevisionStateComponent, ShortUuidComponent, RouterLink],
	templateUrl: './revision-list.component.html',
	styleUrl: './revision-list.component.scss'
})
export class RevisionListComponent implements OnInit {
	/** The site to get revisions for */
	@Input() siteID:string;

	/** The columns in the table */
	displayedColumns:string[] = ["time", "revisionID", "runID", "siteState"];

	/** Data for the table */
	dataSource: MatTableDataSource<SiteRevision> = new MatTableDataSource();

	/** Are the revisions currently loading? */
	loading:boolean = true;

	constructor(private http:HttpClient) {
	}

	ngOnInit() {
		//load the revisions from the server and display them
		this.http.get<SiteRevision[]>(`${environment.apiUrl}/revisions/site/${this.siteID}`)
			.subscribe(revisions => {
				this.dataSource.data = revisions.sort((a, b) => b.time = a.time);
				this.loading = false;
		});
	}
}

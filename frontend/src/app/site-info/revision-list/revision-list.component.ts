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

@Component({
	selector: 'app-revision-list',
	standalone: true,
	imports: [CommonModule, MatTableModule, MatSortModule, RevisionStateComponent, ShortUuidComponent, RouterLink],
	templateUrl: './revision-list.component.html',
	styleUrl: './revision-list.component.scss'
})
export class RevisionListComponent implements OnInit {
	@Input() siteID:string;

	displayedColumns:string[] = ["time", "revisionID", "runID", "siteState"];
	dataSource = new MatTableDataSource<SiteRevision>();

	loading:boolean = true;

	constructor(private sites:SiteService,
	            private http:HttpClient) {
	}

	ngOnInit() {
		this.http.get<SiteRevision[]>(`${environment.apiUrl}/revisions/site/${this.siteID}`)
			.subscribe(revisions => {
				revisions.sort((a, b) => b.time = a.time);

				this.dataSource.data = revisions;
				this.loading = false;
		});
	}
}

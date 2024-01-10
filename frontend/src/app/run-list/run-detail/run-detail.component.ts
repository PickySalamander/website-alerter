import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HttpClient} from "@angular/common/http";
import {ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink, RouterOutlet} from "@angular/router";
import {Subscription} from "rxjs";
import {environment} from "../../../environments/environment";
import {RunThrough, SiteRevision, SiteRevisionState, WebsiteItem} from "website-alerter-shared";
import {MatTable, MatTableDataSource, MatTableModule} from "@angular/material/table";
import {ShortUuidComponent} from "../../short-uuid/short-uuid.component";
import {SiteService} from "../../services/site.service";
import {RevisionStateComponent} from "../../revision-state/revision-state.component";

/** Display the currently selected run's details along with a list of revisions */
@Component({
	selector: 'app-run-detail',
	standalone: true,
	imports: [CommonModule, MatTableModule, RouterOutlet, ShortUuidComponent, RevisionStateComponent, RouterLink],
	templateUrl: './run-detail.component.html',
	styleUrl: './run-detail.component.scss'
})
export class RunDetailComponent implements OnInit, OnDestroy {
	/** Columns in the table to display */
	displayedColumns:string[] = ["site", "revisionID", "runState"];

	/** The revisions to show in the table */
	dataSource:MatTableDataSource<SiteRevision> = new MatTableDataSource();

	/** The table display on the page */
	@ViewChild(MatTable) table:MatTable<WebsiteItem>;

	/** Subscription waiting for navigation end */
	private sub:Subscription;

	constructor(private http:HttpClient,
							private router:Router,
	            private route:ActivatedRoute,
	            private siteService:SiteService) {
		this.sub = this.router.events.subscribe(event => {
			//on navigation end the page changed, update the details on the page
			if(event instanceof NavigationEnd) {
				this.setup();
			}
		})
	}

	ngOnInit() {
		this.setup();
	}

	ngOnDestroy() {
		this.sub.unsubscribe();
	}

	/** Download the revisions and set up the table */
	private setup() {
		//get the run id from the route's path parameters
		const runID = this.route.snapshot.paramMap.get("runID");

		//reset the table
		this.dataSource.data = [];
		this.table?.renderRows();

		//download the revisions and update the table data
		this.http.get<SiteRevision[]>(`${environment.apiUrl}/revisions/run/${runID}`).subscribe(revisions => {
			this.dataSource.data = revisions;
			this.table?.renderRows();
		});
	}

	/** Return the url for the {@link WebsiteItem} in the given revision */
	getSiteName(revision:SiteRevision) {
		return this.siteService.getSite(revision.siteID).site;
	}

	/** Return the site ID for the {@link WebsiteItem} in the given revision */
	getSiteID(revision:SiteRevision) {
		return revision.siteID;
	}
}

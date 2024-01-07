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

@Component({
	selector: 'app-run-detail',
	standalone: true,
	imports: [CommonModule, MatTableModule, RouterOutlet, ShortUuidComponent, RevisionStateComponent, RouterLink],
	templateUrl: './run-detail.component.html',
	styleUrl: './run-detail.component.scss'
})
export class RunDetailComponent implements OnInit, OnDestroy {
	displayedColumns:string[] = ["site", "revisionID", "runState"];
	dataSource = new MatTableDataSource<SiteRevision>();

	@ViewChild(MatTable) table:MatTable<WebsiteItem>;

	private sub:Subscription;

	constructor(private http:HttpClient,
							private router:Router,
	            private route:ActivatedRoute,
	            private siteService:SiteService) {
		this.sub = this.router.events.subscribe(event => {
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

	private setup() {
		const runID = this.route.snapshot.paramMap.get("runID");

		this.dataSource.data = [];
		this.table?.renderRows();

		this.http.get<SiteRevision[]>(`${environment.apiUrl}/revisions/run/${runID}`).subscribe(revisions => {
			this.dataSource.data = revisions;
			this.table?.renderRows();
		});

		console.log(`Loading ${runID}`);
	}

	getSiteName(revision:SiteRevision) {
		return this.siteService.getSite(revision.siteID).site;
	}

	getSiteID(revision:SiteRevision) {
		return revision.siteID;
	}
}

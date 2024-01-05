import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatTable, MatTableDataSource, MatTableModule} from "@angular/material/table";
import {MatSort, MatSortModule} from "@angular/material/sort";
import {HttpClient} from "@angular/common/http";
import {MatCardModule} from "@angular/material/card";
import {MatButtonModule} from "@angular/material/button";
import {MatInputModule} from "@angular/material/input";
import {MatIconModule} from "@angular/material/icon";
import {SelectionModel} from "@angular/cdk/collections";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {SnackbarService} from "../services/snackbar.service";
import {environment} from "../../environments/environment";
import {RunScheduling, SiteRevisionState, WebsiteItem} from "website-alerter-shared";
import {RouterLink} from "@angular/router";
import {SiteService} from "../services/site.service";
import {RevisionStateComponent} from "../revision-state/revision-state.component";

@Component({
	selector: 'app-index',
	standalone: true,
	imports: [CommonModule, MatTableModule, MatSortModule, MatCardModule, MatButtonModule, MatInputModule, MatIconModule, MatCheckboxModule, RouterLink, RevisionStateComponent],
	templateUrl: './site-list.component.html',
	styleUrl: './site-list.component.scss'
})
export class SiteListComponent implements OnInit, AfterViewInit {
	displayedColumns:string[] = ["select", "enabled", "site", "lastCheck", "lastStatus", "nextCheck"];
	dataSource = new MatTableDataSource<WebsiteItem>();
	selection = new SelectionModel<WebsiteItem>(true, []);
	stateValues = SiteRevisionState;

	/** The table display on the page */
	@ViewChild(MatTable) table:MatTable<WebsiteItem>;

	@ViewChild(MatSort) sort:MatSort;

	constructor(private http:HttpClient,
	            private snackbar:SnackbarService,
	            private sites:SiteService) {
	}

	ngOnInit() {
		const items = this.sites.allItems

		if(items && items.length > 0) {
			this.dataSource.data = items;
			this.table?.renderRows();
		}
	}

	ngAfterViewInit():void {
		this.dataSource.sort = this.sort;
	}

	/** Called when the user is filtering the options by name */
	applyFilter(event:Event) {
		const filterValue = (event.target as HTMLInputElement).value;
		this.dataSource.filter = filterValue.trim().toLowerCase();
	}

	/** Selects all rows if they are not all selected; otherwise clear selection. */
	toggleAllRows() {
		if(this.isAllSelected) {
			this.selection.clear();
			return;
		}

		this.selection.select(...this.dataSource.data);
	}

	onDelete() {
		if(!this.isEmptySelection) {
			const toDelete = this.selection.selected.slice();
			const request:string[] = [];

			for(const del of toDelete) {
				request.push(del.site);
			}

			this.http.delete(`${environment.apiUrl}/sites`, {body: request}).subscribe({
				next: () => {
					for(const del of toDelete) {
						this.sites.deleteSite(del.siteID);
					}

					this.updateItems();

					this.snackbar.message('Successfully deleted site(s)');
				},
				error: (error) => {
					console.error("Failed to delete site(s)", error);
					this.snackbar.error("Failed to delete site(s)");
				}
			});
		}
	}

	private updateItems() {
		this.dataSource.data = this.sites.allItems;
		this.table.renderRows();
		this.selection.clear();
	}

	getNext(row:WebsiteItem) {
		return RunScheduling.getNext(row);
	}

	/** Whether the number of selected elements matches the total number of rows. */
	get isAllSelected() {
		const numSelected = this.selection.selected.length;
		const numRows = this.dataSource.data.length;
		return numSelected === numRows;
	}

	get isEmptySelection() {
		return this.selection.isEmpty();
	}

	get itemsExist() {
		return this.dataSource?.data?.length ?? 0 > 0;
	}
}

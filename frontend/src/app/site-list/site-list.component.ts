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
import {RunScheduling, WebsiteItem} from "website-alerter-shared";
import {RouterLink} from "@angular/router";
import {SiteService} from "../services/site.service";
import {RevisionStateComponent} from "../revision-state/revision-state.component";

/** Root of the site that displays all the {@link WebsiteItem}s in the database */
@Component({
	selector: 'app-index',
	standalone: true,
	imports: [CommonModule, MatTableModule, MatSortModule, MatCardModule, MatButtonModule, MatInputModule, MatIconModule, MatCheckboxModule, RouterLink, RevisionStateComponent],
	templateUrl: './site-list.component.html',
	styleUrl: './site-list.component.scss'
})
export class SiteListComponent implements OnInit, AfterViewInit {
	/** Columns displayed in the table */
	displayedColumns:string[] = ["select", "enabled", "site", "lastCheck", "lastStatus", "nextCheck"];

	/** Data displayed in the table */
	dataSource:MatTableDataSource<WebsiteItem> = new MatTableDataSource();

	/** Items selected in the table */
	selection:SelectionModel<WebsiteItem> = new SelectionModel(true, []);

	/** The table display on the page */
	@ViewChild(MatTable) table:MatTable<WebsiteItem>;

	/** Sorter controlling the columns in the table */
	@ViewChild(MatSort) sort:MatSort;

	constructor(private http:HttpClient,
	            private snackbar:SnackbarService,
	            private siteService:SiteService) {
	}

	ngOnInit() {
		const items = this.siteService.allItems

		//display the items in the table
		if(items && items.length > 0) {
			this.dataSource.data = items;
			this.table?.renderRows();
		}
	}

	ngAfterViewInit():void {
		//setup the sorting
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

	/** Called when the user wishes to delete a series of sites */
	onDelete() {
		if(!this.isEmptySelection) {
			//get the items to delete
			const toDelete = this.selection.selected.slice();
			const request:string[] = [];

			//add the site's id's to the delete list
			for(const del of toDelete) {
				request.push(del.siteID);
			}

			//make the request
			this.http.delete(`${environment.apiUrl}/sites`, {body: request}).subscribe({
				next: () => {
					//delete from the cached sites
					for(const del of toDelete) {
						this.siteService.deleteSite(del.siteID);
					}

					//update the table
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

	/** Update the displayed items in the table */
	private updateItems() {
		this.dataSource.data = this.siteService.allItems;
		this.table?.renderRows();
		this.selection.clear();
	}

	/** Return the next time the site will be checked by the polling service */
	getNext(row:WebsiteItem) {
		return RunScheduling.getNext(row);
	}

	/** Whether the number of selected elements matches the total number of rows. */
	get isAllSelected() {
		const numSelected = this.selection.selected.length;
		const numRows = this.dataSource.data.length;
		return numSelected === numRows;
	}

	/** Are there any items currently selected? */
	get isEmptySelection() {
		return this.selection.isEmpty();
	}

	/** Are there any items in the table? */
	get itemsExist() {
		return this.dataSource?.data?.length ?? 0 > 0;
	}
}

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
import {MatDialog} from "@angular/material/dialog";
import {AddEditSiteComponent} from "./add-edit-site/add-edit-site.component";
import {environment} from "../../environments/environment";
import {RunScheduling, SiteRevisionState, WebsiteItem} from "website-alerter-shared";

@Component({
	selector: 'app-index',
	standalone: true,
	imports: [CommonModule, MatTableModule, MatSortModule, MatCardModule, MatButtonModule, MatInputModule, MatIconModule, MatCheckboxModule],
	templateUrl: './index.component.html',
	styleUrl: './index.component.scss'
})
export class IndexComponent implements OnInit, AfterViewInit {
	displayedColumns:string[] = ["select", "enabled", "site", "lastCheck", "lastStatus", "nextCheck"];
	items:WebsiteItem[];
	dataSource:MatTableDataSource<WebsiteItem> = new MatTableDataSource<WebsiteItem>();
	selection = new SelectionModel<WebsiteItem>(true, []);
	stateValues = SiteRevisionState;

	/** The table display on the page */
	@ViewChild(MatTable) table:MatTable<WebsiteItem>;

	@ViewChild(MatSort) sort:MatSort;

	constructor(private http:HttpClient,
	            private snackbar:SnackbarService,
	            private dialog:MatDialog) {
	}

	ngOnInit() {
		// this.http.get<WebsiteItem[]>(`${environment.apiUrl}/sites`).subscribe(response => {
		// 	this.items = response;
		//
		// 	if(this.items && this.items.length > 0) {
		// 		this.dataSource.data = this.items;
		// 		this.table?.renderRows();
		// 	}
		// });

		this.items = [
			{
				"siteID": "b",
				"site": "https://unknownworlds.com/jobs/",
				"selector": "#content-holder > section > div",
				"enabled": false
			},
			{
				"options": {
					"ignoreAttributes": true,
					"ignoreCss": true
				},
				"siteID": "c",
				"site": "https://www.privatedivision.com/jobs/",
				"selector": "#post-5548 > div",
				"last": {
					"revisionID": "d64eee14-316f-4e15-8e8b-acada3a64495",
					"runID": "09f0b959-4671-40de-b38a-cb72db65a8cb",
					"time": 1704400415098,
					"siteState": 2
				},
				"enabled": true
			},
			{
				"siteID": "a",
				"site": "https://firaxis.com/careers/",
				"selector": ".firaxis-careers-component ul.jobGrid",
				"last": {
					"revisionID": "c65f03a3-f0ad-4411-9c24-f29dd61a8e1c",
					"runID": "09f0b959-4671-40de-b38a-cb72db65a8cb",
					"time": 1704399981978,
					"siteState": 0
				},
				"enabled": true
			}
		] as any;

		if(this.items && this.items.length > 0) {
			this.dataSource.data = this.items;
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

	onAdd() {
		this.dialog.open(AddEditSiteComponent).afterClosed().subscribe(value => {
			if(value) {
				this.items.push(value);
				this.updateItems();
			}
		});
	}

	onEdit(row:WebsiteItem) {
		this.dialog.open(AddEditSiteComponent, {data: row}).afterClosed().subscribe(value => {
			if(value) {
				const index = this.items.indexOf(row);
				if(index >= 0) {
					this.items[index] = value;
				}

				this.updateItems();
			}
		});
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
						const index = this.items.indexOf(del);
						this.items.splice(index, 1);
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
		this.dataSource.data = this.items;
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
		return this.items !== undefined
	}
}

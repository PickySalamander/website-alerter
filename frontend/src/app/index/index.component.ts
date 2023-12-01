import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatTable, MatTableDataSource, MatTableModule} from "@angular/material/table";
import {MatSort, MatSortModule} from "@angular/material/sort";
import {WebsiteItem} from "../../../../shared/src/util/website-item";
import {HttpClient} from "@angular/common/http";
import {MatCardModule} from "@angular/material/card";
import {MatButtonModule} from "@angular/material/button";
import {MatInputModule} from "@angular/material/input";
import {MatIconModule} from "@angular/material/icon";
import {SelectionModel} from "@angular/cdk/collections";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {SnackbarService} from "../services/snackbar.service";

@Component({
	selector: 'app-index',
	standalone: true,
	imports: [CommonModule, MatTableModule, MatSortModule, MatCardModule, MatButtonModule, MatInputModule, MatIconModule, MatCheckboxModule],
	templateUrl: './index.component.html',
	styleUrl: './index.component.scss'
})
export class IndexComponent implements OnInit, AfterViewInit {
	displayedColumns:string[] = ["select", "site", "lastCheck"];
	items:WebsiteItem[];
	dataSource:MatTableDataSource<WebsiteItem> = new MatTableDataSource<WebsiteItem>();
	selection = new SelectionModel<WebsiteItem>(true, []);

	/** The table display on the page */
	@ViewChild(MatTable) table:MatTable<WebsiteItem>;

	@ViewChild(MatSort) sort:MatSort;

	constructor(private http:HttpClient,
	            private snackbar:SnackbarService) {
	}

	ngOnInit() {
		// this.http.get<WebsiteItem[]>(`${environment.apiUrl}/sites`).subscribe(response => {
		// 	this.items = response;

		this.items = [
			{
				"userID": "a",
				"site": "https://firaxis.com/careers/",
				lastCheck: 1701452353000
			},
			{
				"userID": "a",
				"site": "https://unknownworlds.com/jobs/"
			},
			{
				"userID": "a",
				"site": "https://www.failbettergames.com/jobs",
				lastCheck: 1669916353000
			},
			{
				"userID": "a",
				"site": "https://www.privatedivision.com/jobs/"
			}
		];

		if(this.items && this.items.length > 0) {
			this.items.sort((a, b) => {
				const ret = b.lastCheck || 0 -  a.lastCheck || 0;
				if(ret != 0) {
					return ret;
				}
				return a.site.localeCompare(b.site);
			})

			this.dataSource.data = this.items;
			this.table?.renderRows();
		}
		// });
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
		if (this.isAllSelected) {
			this.selection.clear();
			return;
		}

		this.selection.select(...this.dataSource.data);
	}

	onAdd() {

	}

	onDelete() {
		if(!this.isEmptySelection) {
			const toDelete = this.selection.selected.slice();

			for(const del of toDelete) {
				const index = this.items.indexOf(del);
				this.items.splice(index, 1);
			}

			this.dataSource.data = this.items;
			this.table.renderRows();
			this.selection.clear();

			this.snackbar.message('Successfully deleted site(s)');
		}
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
}

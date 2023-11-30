import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatTableDataSource, MatTableModule} from "@angular/material/table";
import {MatSort, MatSortModule} from "@angular/material/sort";
import {WebsiteItem} from "../../../../shared/src/util/website-item";
import {HttpClient} from "@angular/common/http";
import {LoginResponse} from "../../../../shared/src/util/login-response";
import {environment} from "../../environments/environment";

@Component({
  selector: 'app-index',
  standalone: true,
	imports: [CommonModule, MatTableModule, MatSortModule],
  templateUrl: './index.component.html',
  styleUrl: './index.component.scss'
})
export class IndexComponent implements OnInit, AfterViewInit {
	displayColumns:string[] = ["site", "lastCheck"];
	items:WebsiteItem[];
	dataSource: MatTableDataSource<WebsiteItem>;

	@ViewChild(MatSort) sort: MatSort;

	constructor(private http:HttpClient) {
	}

	ngOnInit() {
		this.http.get<WebsiteItem[]>(`${environment.apiUrl}/sites`).subscribe(response => {
			//TODO handle
		});
	}

	ngAfterViewInit():void {
	}
}

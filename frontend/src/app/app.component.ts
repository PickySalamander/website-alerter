import {Component, OnInit} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {HeaderComponent} from "./header/header.component";
import {PageLoaderService} from "./page-loader/page-loader.service";

/** Main Application display */
@Component({
	selector: 'app-root',
	imports: [RouterOutlet, HeaderComponent],
	templateUrl: './app.component.html',
	styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
	constructor(private pageLoaderService:PageLoaderService) {
	}

	ngOnInit() {
		this.pageLoaderService.startup();
	}
}

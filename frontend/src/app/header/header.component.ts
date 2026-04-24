import {Component} from '@angular/core';
import {MatButtonModule} from "@angular/material/button";
import {RouterLink, RouterLinkActive} from "@angular/router";
import {LoginService} from "../services/login.service";
import {MatMenuModule} from "@angular/material/menu";
import {MatIconModule} from "@angular/material/icon";

/** Handle the header on top of the application */
@Component({
	selector: 'app-header',
	imports: [
		MatButtonModule,
		RouterLink,
		RouterLinkActive,
		MatMenuModule,
		MatIconModule
	],
	templateUrl: './header.component.html',
	styleUrl: './header.component.scss'
})
export class HeaderComponent {
	constructor(private loginService:LoginService) {
	}

	get isLoggedIn() {
		return this.loginService.isLoggedIn;
	}

	/** Logout the user through the login service */
	onLogout() {
		this.loginService.logout();
	}
}

import {Component} from '@angular/core';
import {MatButtonModule} from "@angular/material/button";
import {RouterLink, RouterLinkActive} from "@angular/router";
import {MatRippleModule} from "@angular/material/core";
import {LoginService} from "../services/login.service";

/** Handle the header on top of the application */
@Component({
	selector: 'app-header',
	imports: [MatButtonModule, RouterLink, MatRippleModule, RouterLinkActive],
	templateUrl: './header.component.html',
	styleUrl: './header.component.scss'
})
export class HeaderComponent {
	constructor(private login:LoginService) {
	}

	/** Logout the user through the login service */
	onLogout() {
		this.login.logout();
	}
}

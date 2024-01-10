import {inject, Injectable} from '@angular/core';
import {ResolveFn} from "@angular/router";
import {RunThrough} from "website-alerter-shared";
import {HttpClient} from "@angular/common/http";
import {LoginService} from "./login.service";
import {environment} from "../../environments/environment";

/** Service that downloads and stores {@link RunThrough}s downloaded from the server. */
@Injectable({
	providedIn: 'root'
})
export class RunService {
	/** All runs sorted */
	private runs:RunThrough[];

	constructor(private http:HttpClient,
	            private login:LoginService) {
		//delete the runs when logging out
		this.login.onLogout.subscribe(() => {
			this.runs = undefined;
		});
	}

	/** Get all {@link RunThrough}s from the server if not already loaded */
	private getRuns():Promise<RunService> | RunService {
		//return immediately if loaded
		if(this.runs) {
			return this;
		}

		//download the runs
		return new Promise<RunService>(resolve => {
			this.http.get<RunThrough[]>(`${environment.apiUrl}/runs`).subscribe(items => {
				if(items && items.length > 0) {
					this.runs = items.sort((a, b) => b.time - a.time);
				}

				resolve(this);
			});
		})
	}

	/** Get all {@link RunThrough}s sorted by time */
	get sortedRuns():RunThrough[] {
		return this.runs;
	}

	/** Get all {@link RunThrough}s from the server if not already loaded */
	public static resolve:ResolveFn<RunService> = () => {
		return inject(RunService).getRuns();
	};
}

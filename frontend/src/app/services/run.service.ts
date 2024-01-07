import {inject, Injectable} from '@angular/core';
import {ResolveFn} from "@angular/router";
import {RunThrough} from "website-alerter-shared";
import {HttpClient} from "@angular/common/http";
import {LoginService} from "./login.service";
import {environment} from "../../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class RunService {
	private runs:Map<string, RunThrough>;

	constructor(private http:HttpClient,
	            private login:LoginService) {
		this.login.onLogout.subscribe(() => {
			this.runs = undefined;
		});
	}

	private getRuns():Promise<RunService> | RunService {
		if(this.runs) {
			return this;
		}

		return new Promise<RunService>(resolve => {
			this.http.get<RunThrough[]>(`${environment.apiUrl}/runs`).subscribe(items => {
				if(items && items.length > 0) {
					this.runs = new Map(items.map(value => [value.runID, value]));
				}

				resolve(this);
			});
		})
	}

	getRun(runID:string) {
		return this.runs.get(runID);
	}

	get allItems():RunThrough[] {
		return Array.from(this.runs.values());
	}

	public static resolve:ResolveFn<RunService> = () => {
		return inject(RunService).getRuns();
	};
}

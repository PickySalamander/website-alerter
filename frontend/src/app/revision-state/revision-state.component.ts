import {Component, Input} from '@angular/core';

import {SiteRevisionState} from "website-alerter-shared";

/** Display a colored label for the {@link SiteRevisionState} */
@Component({
    selector: 'app-revision-state',
    imports: [],
    templateUrl: './revision-state.component.html',
    styleUrl: './revision-state.component.scss'
})
export class RevisionStateComponent {
	/** The state to display */
	@Input() state:SiteRevisionState;

	/** Values of the state */
	SiteRevisionState = SiteRevisionState;
}

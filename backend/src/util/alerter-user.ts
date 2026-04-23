/** User data stored in Cognito */
export interface AlerterUser {
	/** Identifier for the End-User at the Issuer. */
	sub:string;

	/** User's email address */
	email:string;
}

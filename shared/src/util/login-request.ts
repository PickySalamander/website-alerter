/** Request for a user to login */
export interface LoginRequest {
	/** The user's email address */
	email:string;

	/** The user's password */
	password:string;
}
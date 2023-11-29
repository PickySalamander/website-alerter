/** Response returned after logging in */
export interface LoginResponse {
	/** The user's ID */
	userID:string;

	/** The user's email */
	email:string;
}
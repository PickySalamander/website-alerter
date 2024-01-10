import {UserItem} from "../services/database.service";
import {JwtPayload} from "jsonwebtoken";

/** User data stored in the JWT */
export interface UserJwt extends UserItem, JwtPayload {

}
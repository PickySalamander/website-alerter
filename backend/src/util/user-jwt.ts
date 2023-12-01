import {UserItem} from "../services/database.service";
import {JwtPayload} from "jsonwebtoken";

export interface UserJwt extends UserItem, JwtPayload {

}
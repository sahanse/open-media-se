import jwt from "jsonwebtoken"
import { ApiError } from "../utils/ApiError.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";
import {readQuery} from "pgcrudify"
import db from "../db/index.js";

const verifyUser = AsyncHandler(async(req, _, next)=>{
    //get accesstoken and from req.cookies
    //verify access token is available
    //get user info from accesstoken
    //check weather user exists in db by using accesstoken

   try {
     const accessToken= req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","");
 
     if(!accessToken){
         throw new ApiError(400, "unauthorized user")
     }

     //get info from accesstoken
     const userInfo=jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    //check user exist in db
    const id=userInfo.id

    const user= await readQuery(db, "users", ["id", "fullname", "username", "email"],{id});
    
    if(user.rowsCount===0){
        throw new ApiError(400, "unauthorized access")
    }
    req.user=user.rows[0];
    next()
   } catch (error) {
    console.log("middlewares || auth.middleware || verifyUser || error",error);
    throw new ApiError(401,error?.message || "invalid access token")
   }
    
})

export {verifyUser}
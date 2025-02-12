import jwt from "jsonwebtoken"
import { ApiError } from "../utils/ApiError.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";
import {readQuery} from "pgcrudify"
import db from "../db/index.js";

//for normal routes where verification is must
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
    
});

//for routes like register and login to ensure weather user alreday has tokens
const verifyAuthRoute = AsyncHandler(async(req, _, next)=>{
    try {
        const accessToken= req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","");
    
       
        if(!accessToken){
            req.user =null;
            return next()
        }
   
        //get info from accesstoken
        const userInfo=jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
   
       //check user exist in db
       const id=userInfo.id
   
       const user= await readQuery(db, "users", ["id", "fullname", "username", "email"],{id});
       
       if(user.rowsCount===0){
           req.user = null;
          return next()
       }

       req.user=user.rows[0];
       return next()
      } catch (error) {
        console.log("the error is:", error)
       return next()
      }
});

const verifyResetPassRoute = AsyncHandler(async(req, _, next)=>{
})

export {verifyUser, verifyAuthRoute, verifyResetPassRoute}
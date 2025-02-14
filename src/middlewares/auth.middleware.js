import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";
import {readQuery} from "pgcrudify";
import db from "../db/index.js";
import {comparePass} from "../utils/PasswordManager.js"

//for normal routes where verification is must
const verifyUser = AsyncHandler(async(req, _, next)=>{
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
        throw new ApiError(400, "unauthorized access");
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

//for routes that require otp verification
const verifyOtpToken = AsyncHandler(async(req, _, next)=>{
   try {
     const otpToken = req.cookies?.Otp_Token || req.header("Authorization")?.replace("Bearer ","");
 
     if(!otpToken){
         throw new ApiError(400, "unauthorized access")
     }

     //get info from otpToken
     const otpInfo=jwt.verify(otpToken, process.env.OTP_TOKEN_SECRET);

    //check user exist in db
    const userId = otpInfo.userId;
    const otpId = otpInfo.otpId;
    
    const verifyOtpToken = await readQuery(db, "otp", ["id", "user_id", "used"],{id:otpId});

    if(verifyOtpToken.rowsCount===0){
        throw new ApiError(400, "unauthorized access");
    }

    const storedUserId = verifyOtpToken.rows[0].user_id;
    const storedOtpId = verifyOtpToken.rows[0].id;
    const otpStatus = verifyOtpToken.rows[0].used;

    if(otpId !== storedOtpId || userId !== storedUserId || otpStatus !== true) throw new ApiError(400, "Unauthorized access storedotp")
    
    req.otpAccessVerified={userId:storedUserId}
    next()
   } catch (error) {
    console.log("middlewares || auth.middleware || verifyResetPassRoute || error",error);
    throw new ApiError(401,error?.message || "invalid opt token")
   }
    
});

//for routes that requiree password authentication
const verifyPassword = AsyncHandler(async(req, _, next)=>{
    //make sure req.user is available
    if(!req.user) throw new ApiError(400, "Unauthorized access")
        
    //make sure verify password is provided and has data
    if(!req.body.verifyPassword) throw new ApiError(400, "Please provde password for verification");
    if(req.body.verifyPassword.trim()==="") throw new ApiError(400, "please provide password for verification");

    const id = req.user.id;

    //compare password provided by user is same
    const getstoredPassword = await readQuery(db,"users",["password"],{id});

    if(getstoredPassword.rowsCount===0) throw new ApiError(400, "internal server error")

    const storedPassword=getstoredPassword.rows[0].password;
    const userPassword=req.body.verifyPassword;

    const comparePassword = await comparePass(userPassword, storedPassword);

    if(!comparePassword) throw new ApiError(400, "Wrong password")

    req.passwordVerified=true;
    next()
});

export {verifyUser, verifyAuthRoute, verifyOtpToken, verifyPassword}
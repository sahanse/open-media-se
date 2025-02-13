import jwt from "jsonwebtoken"
import {updateQuery} from "pgcrudify";
import { AsyncHandler } from "./AsyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import db from "../db/index.js";

const generateAccessToken=(user)=>{
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    })
}

const generateRefreshToken=(id)=>{
    return jwt.sign(id, process.env.REFREH_TOKEN_SECRET, {
        expiresIn:process.env.REFREH_TOKEN_EXPIRY
    })
}

const generateOtpToken=(data)=>{
    return jwt.sign(data, process.env.OTP_TOKEN_SECRET, {
        expiresIn:process.env.OTP_TOKEN_EXPIRY
    })
}

const generateFullAuth=async(user, id)=>{
   try {
     //generate access and refreshtoken

     const accessToken = await generateAccessToken(user);
     const refreshToken = await generateRefreshToken({id});
 
     if(!accessToken || !refreshToken) throw new ApiError(500, "failed to generate tokens")

     //save refreshToken in db
     const saveRefreshTokenDb= await updateQuery(db, "users", {refreshtoken:refreshToken},{id});
    
     if(saveRefreshTokenDb.rowCount===0) throw new ApiError(500, "internal server error")

     const tokens={
         accessToken,
         refreshToken
     }
     return tokens
   } catch (error) {
    throw new ApiError(400, error?.message || "something went wrong")
   }
}


export {generateAccessToken, generateRefreshToken, generateOtpToken, generateFullAuth}
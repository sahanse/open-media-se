import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {AsyncHandler} from "../utils/AsyncHandler.js"
import fs from "fs"
import {uploadOnCloudinary} from "../utils/Cloudinary.js"
import {createQuery, readQuery, updateQuery, deleteQuery} from "pgcrudify"
import db from "../db/index.js"
import {hashPass, comparePass} from "../utils/PasswordManager.js"
import { generateAccessToken, generateRefreshToken } from "../utils/JwtManager.js"
import jwt from "jsonwebtoken"

const userRegister=AsyncHandler(async(req, res)=>{
    //get info from req.body
    //access avatar and coverImage from req.files
    //check if all info are available
    //if no all info remove images from localstorage
    //chech if user already exists if exists remove image from localstorage
    //check which image are available and upload available images on cloudinary
    //hash the password
    //store the user info in db 
    //generate access and refreshToken save refreshToken in db
    //send access and refreshToken in response with cookies

    //access user info from req.body
    const {fullname, username, email, password, ischannel}=req.body;

    //access images from req.files
    const {avatar, coverImage}=req.files;

    //check weatret all info is available
    if(!fullname || !username || !email || !password || !ischannel){
        if(avatar){
            fs.unlinkSync(avatar[0].path)
           }
    
           if(coverImage){
            fs.unlinkSync(coverImage[0].path)
           }

           throw new ApiError(400, "all fields are required")
    }else if(fullname.trim()==="" || username.trim()==="" || email.trim()==="" || password.trim()===""){
        if(avatar){
            fs.unlinkSync(avatar[0].path)
           }
    
           if(coverImage){
            fs.unlinkSync(coverImage[0].path)
           }

        throw new ApiError(400, "all fields are required")
    }

    //check weather username exist
    const usernameExist = await readQuery(db, "users", ['username'], {username});

    if(usernameExist.rowCount===1){
        if(avatar){
            fs.unlinkSync(avatar[0].path)
        }

        if(coverImage){
            fs.unlinkSync(coverImage[0].path)
        }

        throw new ApiError(400, "username already in use provide a new one")
    }

    //check email alreday exist
    const emailExist = await readQuery(db, "users",["email"],{email})

    if(emailExist.rowCount===1){
        console.log("yes email")
        if(avatar){
            fs.unlinkSync(avatar.path)
        }

        if(coverImage){
            fs.unlinkSync(coverImage.path)
        }
        throw new ApiError(400, "email alreday in use provide a new one")
    }


    //if avatar available upload on cloudinary
    let avatarCloudinary=null;
    if(avatar){
        avatarCloudinary= await uploadOnCloudinary(avatar[0].path)
    }

    //if cover image available upload on cloudinary
    let coverImageCloudinary=null;
    if(coverImage){
        coverImageCloudinary= await uploadOnCloudinary(coverImage[0].path)
    }

    //hash the password
    const hashedPass= await hashPass(password);

    //save user into databse
    const addUser = await createQuery(db, "users", {fullname, username, email, password:hashedPass, avatar:avatarCloudinary.url, coverimage:coverImageCloudinary.url, ischannel}, ["id"])

    //extract id of user
    const id=addUser.rows[0].id;

    const user={
        id,
        fullname,
        username,
        email
    }

    //generate access and refreshtoken
    const accessToken = await generateAccessToken(user);
    const refreshToken = await generateRefreshToken({id});

    if(!accessToken || !refreshToken){
        console.log("failed to generate")
        throw new ApiError(500, "failed to generate tokens")
    }
    //save refreshToken in db
    const saveRefreshTokenDb= await updateQuery(db, "users", {refreshtoken:refreshToken});
   
    if(saveRefreshTokenDb.rowCount===0){
        throw new ApiError(500, "internal server error")
    }

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {user, accessToken, refreshToken}, "user registered successfully"))
})

const userLogin=AsyncHandler(async(req, res)=>{
    //verify all required datas are available
    //check if user already exists if exists then continue
    //check if user password is same
    //if same the generate new access and refreshtoken
    //save new refreshtoken in db
    //send accesstoken and refreshtoken in cookie

    //verify all required datas are available
    if(!req.body.username && !req.body.email){
        throw new ApiError(400, "email or username is required");
    }else{
        if(req.body.username?.trim()==="" || req.body.email?.trim()===""){
            throw new ApiError(400, "invalid data")
        }else if(!req.body.password || req.body.password?.trim()===""){
            throw new ApiError(400, "invalid password")
        }
    }

    //check if user exists
    let userExist=null;
    if(req.body.email){
       userExist= await readQuery(db, "users", ["id","fullname","username","email","password"], {email:req.body.email});
    }else{
       userExist=await readQuery(db, "users",["id","fullname","username","email","password"], {username:req.body.username})
    }

    if(userExist.rowCount===0){
        throw new ApiError(400, "user not found")
    }

    //check for password match
    const savedPass= userExist.rows[0].password
    
    //compare the password
    const passwordMatched= await comparePass(req.body.password, savedPass);
    
    if(!passwordMatched){
        throw new ApiError(400, "Wrong password")
    }

    const user={
        id:userExist.rows[0].id,
        fullname:userExist.rows[0].fullname,
        username:userExist.rows[0].username,
        email:userExist.rows[0].email,
    }

    const id=user.id;

    //generate access and refreshTokens
    const accessToken= await generateAccessToken(user);
    const refreshToken= await generateRefreshToken({id})

    if(!accessToken || !refreshToken){
        throw new ApiError(500, "internal server error")
    }
    
    const options={
        httpOnly:true,
        secure:false
    }

    //update refreshToken in userDB
    const updateRefreshToken= await updateQuery(db, "users", {refreshtoken:refreshToken},{id});

    if(updateRefreshToken.rowCount==0){
        throw new ApiError(400, "internal server error")
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken",options)
    .cookie("accessToken", accessToken,options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {user, accessToken, refreshToken}, "user login successfull"))

})

const userLogout=AsyncHandler(async(req, res)=>{
    //get user from req.user
    //remove refreshToken from db
    //remove accesstoken and refreshtoken from browser
    const user=req.user;

    if(!user){
        throw new ApiError(400, "something went wrong")
    }

    const id=user.id;
    const removeRefreshTokenDB= await updateQuery(db, "users", {refreshtoken:null}, {id});
   
    if(removeRefreshTokenDB.rowCount===0){
        throw new ApiError(500, "internal server error")
    }

    const options={
        httpOnly:true,
        secure:false
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logout successfull"))

})

const refreshAccessToken=AsyncHandler(async(req, res)=>{   
    //get refreshToken from req.cookies
    //verify refreshToken is available
    //verify user is availabel using info from refreshtoken
    //if yes generate new accesstoken and refreshToken
    //save new refrehtoken in db
    //save new accesstoken and refrehtoken in browser

    //get access token from req.cookies
    const refreshTokenCookie = req.cookies?.refreshToken;
    
    if(!refreshTokenCookie){
        throw new ApiError(400, "unauthorized access")
    }

    //get user info from refreshtoken
    const userInfo = jwt.verify(refreshTokenCookie, process.env.REFREH_TOKEN_SECRET);
    const id=userInfo.id;

    //check user exist
    const userExist= await readQuery(db, "users", ["id", "fullname", "username", "email"], {id});
    
    if(userExist.rowCount===0){
        throw new ApiError(400, "unauthorized access")
    }

    const user=userExist.rows[0]

    //generate new access and refreshtoken
    const accessToken = await generateAccessToken(user);
    const refrehToken= await generateRefreshToken({id})

    if(!accessToken || !refrehToken){
        throw new ApiError(500, "internal server error")
    }

    //update new refreshToken in db
    const updateRefreshToken = await updateQuery(db, "users", {refreshtoken:refrehToken},{id});

    if(updateRefreshToken.rowCount===0){
        throw new ApiError(500, "internal server error")
    }

    const options={
        httpOnly:true,
        secure:false
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refrehToken, options)
    .json(new ApiResponse(200, {user, accessToken, refrehToken}, "tokens refreshed successfully"))
})

//for updating username and 
const updateInfo=AsyncHandler(async(req, res)=>{
    //get data from req.body
    //only allow fullname, avatar, coverImage, isChannel
    //verify user password
})

const updateCrutialInfo=AsyncHandler(async(req, res)={

})

const forgotPass=AsyncHandler(async(req, res)=>{

})

export {userRegister, userLogin, userLogout, refreshAccessToken, updateInfo, updateCrutialInfo, forgotPass}


import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {AsyncHandler} from "../utils/AsyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import fs from "fs"
import {hashPass} from "../utils/BcryptHandler.js"
import {db} from "../db/connection/index.js"
import { createQuery, readQuery, updateQuery, deleteQuery } from "pgcrudify"
import { generateAccessToken, generateRefreshToken } from "../utils/JwtManager.js"
import jwt from "jsonwebtoken"

const userRegister= AsyncHandler(async(req, res)=>{
    //access fileld fullname, username, email, password, ischannel -> req.body
    //access image files -> req.files
    //check all fields are available
    //if all fileds are not available remove images files from localstorage
    //check if user already exists in db
    //if user already exists remove image file from localstorage
    //check which image files are available and if available upload files to cloudinary
    //hash the password using bcrypt
    //store the data in db
    //generate refreshToken and accessToken
    //save refreshToken in db
    //set refreshToken and accessToken in user cookies

    //destructure fields from req.body
    const {fullname, username, email, password, ischannel}=req.body;

    //access files from req.files
    const {avatar, coverimage}=req.files;

    //ensure all fields are available
    if([fullname, username, email, password, ischannel].some((filed)=> filed?.trim()==="")){

        //if not and avatar available remove atatar from public/temp
        if(avatar){
            fs.unlinkSync(avatar[0].path);
        }

        //if not and coverImage available remove coverImage from public/temp
        if(coverimage){
            fs.unlinkSync(coverimage[0].path)
        }

        throw new ApiError(400, "All fields are required")
    }    

    //check if username already exists
    const userNameExist = await readQuery(db, "users", ["username"], {username});

    //check if email already exists
    const emailExist = await readQuery(db, "users", ["email"], {email});

    //if username already taken throw error
    if(userNameExist?.rows.length===1){

        //if yes and avatar available remove atatar from public/temp
        if(avatar){
            fs.unlinkSync(avatar[0].path);
        }

        //if yes and coverImage available remove coverImage from public/temp
        if(coverimage){
            fs.unlinkSync(coverimage[0].path)
        }

        throw new ApiError(400, "username already exists create a new one")
    }

    //if email alredy in use throw error
    if(emailExist?.rows.length===1){

        //if yes and avatar available remove atatar from public/temp
        if(avatar){
            fs.unlinkSync(avatar[0].path);
        }

        //if yes and coverImage available remove coverImage from public/temp
        if(coverimage){
            fs.unlinkSync(coverimage[0].path)
        }

        throw new ApiError(400, "email already in use provide a new email")
    }

    //upload avatar on cloudinary if available
    let avatarurl=undefined;
    if(avatar){
        avatarurl= await uploadOnCloudinary(avatar[0].path)
    }
   
    //upload coverImage on cloudinary if available
    let coverimageurl=undefined;
    if(coverimage){
        coverimageurl= await uploadOnCloudinary(coverimage[0].path)
    }

    //hash the password
    const hasPass= await hashPass(password);
    
    if(!hasPass){
        throw new ApiError(500, "Error while processing password")
    }

    //save user into database 
    const addUser=await createQuery(db, "users", {
        fullname,
        username,
        email,
        password:hasPass,
        avatar:avatarurl.url,
        coverimage:coverimageurl.url,
        ischannel
    }, ["id"]);
    
    const id=addUser.rows[0];

    //verify user saved successFully in db
    if(!addUser || addUser?.rowCount==0){
        throw new ApiError(500, "Internal server error")
    }

    //generate accesstoken
    const accessToken= await generateAccessToken(id, fullname, username, email)
    
    //generate refreshToken
    const refreshToken= await generateRefreshToken(id)

    //save refreshtokne into db
    const saveRefreshToken= await updateQuery(db, "users", {refreshtoken:refreshToken})

    //show error if no refreshtoken
    if(saveRefreshToken.rowCount===0){
        throw new ApiError(500, "Internal server error")
    }

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200,{
        id,
        fullname,
        username,
        email
    }, "user registered successfully" ))
    
})

const userLogin=async(req, res)=>{
}

const userLogout= async(req, res)=>{

}

export {userRegister, userLogin, userLogout}
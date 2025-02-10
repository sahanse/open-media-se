import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {AsyncHandler} from "../utils/AsyncHandler.js"
import fs from "fs"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/Cloudinary.js"
import {createQuery, readQuery, updateQuery, deleteQuery} from "pgcrudify"
import db from "../db/index.js"
import {hashPass, comparePass} from "../utils/PasswordManager.js"
import { generateAccessToken, generateRefreshToken, generateOtpToken} from "../utils/JwtManager.js"
import jwt from "jsonwebtoken"
import crypto from "crypto"

const userRegister=AsyncHandler(async(req, res)=>{

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
        secure:false
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {user, accessToken, refreshToken}, "user registered successfully"))
})

const userLogin=AsyncHandler(async(req, res)=>{

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
    
    const user=req.user;

    if(!user){
        throw new ApiError(400, "unauthprized access")
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

//for updating fullname, ischannel, avatar, coverimage
const updateInfo=AsyncHandler(async(req, res)=>{

    //make sure req.user is available
    if(!req.user) throw new ApiError(400, "unauthorized access")
    //make sure req.body is not empty
    const bodyKeys=Object.keys(req.body)
    if(bodyKeys.length===0) throw new ApiError(400, "Empty object not allowed")

    //make sure only fullname, isChannel,avatar,coverImage  are allowed and they are not empty
    for(let val in req.body){
        if(val !=="fullname" && val !=="isChannel" && val !=="avatar" && val !=="coverImage"){
            throw new ApiError(400, `Invalid field ${val}`)
        }else if(req.body[val].trim()===""){
            throw new ApiError(400, `empty field at ${val}`)
        }
    }

    //acces info from req.body
    const {fullname,isChannel, email, username, password, id}=req.body;
    
    //accessImages
    const avatarLocalPath= req.files?.avatar?.[0].path;
    const coverImageLocalPath= req.files?.coverImage?.[0].path;

    const data=req.body;
    const userId=req.user.id

    let updatedDataArray=[];

    if(avatarLocalPath || coverImageLocalPath){
        let imageObj=null;
        if(avatarLocalPath && coverImageLocalPath){
            imageObj={
                avatar:avatarLocalPath,
                coverimage:coverImageLocalPath
            }
        }else if(avatarLocalPath){
            imageObj={
                avatar:avatarLocalPath,
            }
        }else if(coverImageLocalPath){
            imageObj={
                coverimage:coverImageLocalPath
            }
        }

        for(let val in imageObj){

          const savedImage = await readQuery(db, "users", [val], {id:userId});
          
          if(savedImage.rowCount===0) throw new ApiError(400, "internal server error")

          const savedImageObj = savedImage.rows[0];

          const savedImageLink=savedImageObj[val];

          if(savedImageLink !== "null"){
            const deleteImageCloudinary = await deleteFromCloudinary(savedImageLink);

            if(!deleteImageCloudinary) throw new ApiError(400, "internal server error")
          }
         
          const uploadImageCloudinary= await uploadOnCloudinary(imageObj[val]);
           
          if(!uploadImageCloudinary) throw new ApiError(400, "internal server error")

          const updateSavedImage = await updateQuery(db, "users", {[val]:uploadImageCloudinary.url}, {id:userId},[val])
         
          if(updateSavedImage.rowCount===0) throw new ApiError(400, "internal server error")

          const updatedImageObj=updateSavedImage.rows[0];

          updatedDataArray.push(updatedImageObj)
        }
        }

    const dataKeys=Object.keys(data);
    let updatedData=null;
    if(Object.keys(data).length>=1){
        const updateData= await updateQuery(db, "users", data, {id:userId}, dataKeys)
        if(updateData.rowCount==0) throw new ApiError(400, "error while updating data")
        updatedData=updateData.rows[0] 
    }
    updatedDataArray.push(updatedData);

    return res
    .status(200)
    .json(new ApiResponse(200, {updatedDataArray}, "updated successfully"))
})

const updateSensitive=AsyncHandler(async(req, res)=>{

    //make sure req.user is available
    if(!req.user) throw new ApiError(400, "unauthorized access")
    //make sure req.body is not empty
    const bodyKeys=Object.keys(req.body)
    if(bodyKeys.length===0) throw new ApiError(400, "Empty object not allowed")

    //make sure user is providing password for verification
    if(!req.body.verifyPassword) throw new ApiError(400, "please provide password to continue with verification")

    //make sure only username, email,password are allowed and they are not empty
    for(let val in req.body){
        if(val !=="username" && val !=="email" && val !=="password" && val !== "verifyPassword"){
            throw new ApiError(400, `field not allowed ${val}`)
        }else if(req.body[val].trim()===""){
            throw new ApiError(400, `empty field at ${val}`)
        }
    }

    //user id from cookie
    const id=req.user.id;

    //compare password provided by user is same
    const getstoredPassword = await readQuery(db,"users",["password"],{id});
    const storedPassword=getstoredPassword.rows[0].password;
    const userPassword=req.body.verifyPassword;

    const comparePassword = await comparePass(userPassword, storedPassword);

    if(!comparePassword) throw new ApiError(400, "Wrong password")

    const updatedData = {}
    for(let val in req.body){
        if(val==="verifyPassword"){
        }else if(val==="password"){
            const hashPassword = await hashPass(req.body[val]);
            const updatePass = await updateQuery(db, "users", {password:hashPassword},{id});
            if(updatePass.rowCount===0) throw new ApiError(500, "internal server error")
            updatedData.password="success"
        }else{
             const updateFields = await updateQuery(db, "users", {[val]:req.body[val]}, {id}, [val]);
             if(updateFields.rowCount===0) throw new ApiError(500, "internal server error")
             updatedData[val]=updateFields.rows[0][val] 
        }

    }
    
    return res
    .status(200)
    .json(new ApiResponse(200, updatedData, "data updated successFully"))
})

const generateOtp = AsyncHandler(async(req, res)=>{

    //make sure req.user is available
    if(!req.user) throw new ApiError(400, "unauthorized access")
        
    //
     //get user id from req.user   
    const id=req.user.id;

    //generate otp
    const generateOtp = await crypto.randomInt(10000, 99999);
    const otp = hashPass(generateOtp)
    //delet the existing otp
    const deleteOtp = await deleteQuery(db, "otp", {user_id:id});
    
    //generate time
    const created_at = new Date();
    const expiry=new Date(created_at.getTime() + 3 * 60 * 1000);
    
    //save otp into databse
    const saveOtp = await createQuery(db, "otp", {user_id:id, otp, used:false, created_at, expiry}, ["otp"]);
    
    if(saveOtp.rowCount===0) throw new ApiError(500, "internal server error")

    return res
    .status(200)
    .json(new ApiResponse(200, saveOtp.rows[0], "otp generated successfully valid till 3 mins"))
})

const verifyOtp = AsyncHandler(async(req, res)=>{
    
    //make sure that req.user is available
    if(!req.user) throw new ApiError(400, "unauthorized access")
    
    //make sure req.body is not empty
    const bodyKeys=Object.keys(req.body);
    if(bodyKeys.length===0) throw new ApiError(400, "empty object not accepted");
    if(bodyKeys.length>1) throw new ApiError(400, "only one filed otp is required")

    //make sure that only otp is passed through req.body
    for(let val in req.body){
        if(val !== "otp") throw new ApiError(400, "otp is required")
            const otp= String(req.body[val])
        if(otp.trim()==="") throw new ApiError(400, "empty otp not accepted")
    }

    const userOtp = Number(req.body.otp);
    
    //user id
    const userId=req.user.id;

    //get stored otp of user
    const getStoredOtp = await readQuery(db, "otp", ["*"], {user_id:userId});

    if(getStoredOtp.rowCount===0) throw new ApiError(400, "unauthrized access");

    const storedOtp = getStoredOtp.rows[0].otp;
    const otpId= getStoredOtp.rows[0].id;

    //make sure otp is not expired
    const currTime = new Date();
    const expiry = new Date(getStoredOtp.rows[0].expiry);

    if(expiry < currTime){
        const deleteOtp = await deleteQuery(db, "otp", {id:otpId});

        if(deleteOtp.rowCount==0) throw new ApiError(400, "internal server error");

        throw new ApiError(400, "Opt expired")
    }

    //compare both otp are same 
    const compareOtp = comparePass(userOtp, storedOtp);
    console.log(com)
    // if(!compareOtp) throw new ApiError(400, "wrong otp")

    // //generate opt token
    // const data={
    //     userId,
    //     otpId
    // }
    // const optToken = await generateOtpToken(data);
    // console.log(optToken)

    // //cookie options
    // const options = {
    //     httpOnly:true,
    //     secure:false,
    //     sameSite: "Strict",
    //     maxAge: 5 * 60 * 1000
    // }



})

const resetPass=AsyncHandler(async(req, res)=>{
    
    //make sure receive req.user
    if(!req.user) throw new ApiError(400, "unauthorized access")

    //make sure req.body body is not empty
    const bodyKeys=Object.keys(req.body);
    if(bodyKeys.length===0) throw new ApiError(400, "empty object not allowed");

})

export {
    userRegister, 
    userLogin, 
    userLogout, 
    refreshAccessToken, 
    updateInfo, 
    updateSensitive, 
    resetPass,
    generateOtp,
    verifyOtp 
}


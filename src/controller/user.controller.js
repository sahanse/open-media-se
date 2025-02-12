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

//user register
const userRegister=AsyncHandler(async(req, res)=>{

    //access images from req.files
    const {avatar, coverImage}=req.files;

    if(req.user){
        if(avatar) fs.unlinkSync(avatar[0].path)
        if(coverImage) fs.unlinkSync(coverImage[0].path)
    
        return res
        .status(200)
        .json(new ApiResponse(200, req.user, "user already logged-in to register logout first"))
    }         
    //make sure req.body is not empty
    const bodyKeys = Object.keys(req.body);
    if(bodyKeys.length===0) throw new ApiError(400, "Empty object received please provide data")
    
    //make sure how many fields are accepted in req.body
    const fileKeys = Object.keys(req.files);
    if(fileKeys.length===0){
        if(bodyKeys.length < 7 || bodyKeys.length > 7) throw new ApiError(400, "Please only provide all required fields if no image files are available provide null values")
    }else if(fileKeys.length ===1){
       if(bodyKeys.length < 6  || bodyKeys.length > 6 ){

        if(avatar) fs.unlinkSync(avatar[0].path)
        if(coverImage) fs.unlinkSync(coverImage[0].path)
            
        throw new ApiError(400, "Please only provide all required fields if no image files are available provide null values")
       }
    }else if(fileKeys.length ===2){
       if(bodyKeys.length < 5 || bodyKeys.length > 5){

        if(avatar) fs.unlinkSync(avatar[0].path)
        if(coverImage) fs.unlinkSync(coverImage[0].path)
              
        throw new ApiError(400, "Please provide all required fields")
       }
    }

   //make sure only required fields are allowed and they are not empty
    for(let val in req.body){
        if(
            val !== "username" && 
            val !== "fullname" && 
            val !== "email" && 
            val !== "avatar" && 
            val !== "coverImage" && 
            val !== "ischannel" && 
            val !== "password"){
                throw new ApiError(400, `${val} field not allowed`)
            }else if(req.body[val].trim()===""){
                throw new ApiError(400, `empty field at ${val}`)
            }
    }

    //access user info from req.body
    const {fullname, username, email, password, ischannel}=req.body;

    //check weather username exist
    const usernameExist = await readQuery(db, "users", ['username'], {username});

    if(usernameExist.rowCount===1){

        if(avatar) fs.unlinkSync(avatar[0].path)
        if(coverImage) fs.unlinkSync(coverImage[0].path)

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

    Object.keys(req.cookies).forEach(cookie => {
        res.clearCookie(cookie);
    });

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {user, accessToken, refreshToken}, "user registered successfully"))
});

//user login
const userLogin=AsyncHandler(async(req, res)=>{

    //if user alreday logged in
   if(req.user){
    return res.
    status(200)
    .json(new ApiResponse(200, req.user, "user already logged in"))
   } 

    //make sure req.body is not empty
    const bodyKeys = Object.keys(req.body);
    if(bodyKeys.length===0) throw new ApiError(400, "Received empty object Please provide some data")

    //make sure only two data are received in object
    if(bodyKeys.length !== 2) throw new ApiError(400, "Only two set of data username or email and password is required")

    //make sure only username or email and password is passed through req.body
   for(let val in req.body){
    if(val !=="username" && val !=="email" && val !=="password"){
        throw new ApiError(400, `field not allowed ${val}`)
    }else if(req.body[val].trim()===""){
        throw new ApiError(400, `empty field at ${val}`)
    }
   }

   //make sure that password is available;
   if(!req.body.password) throw new ApiError(400, "password is required")

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

    Object.keys(req.cookies).forEach(cookie => {
        res.clearCookie(cookie);
    });

    return res
    .status(200)
    .cookie("accessToken", accessToken,options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {user, accessToken, refreshToken}, "user login successfull"))

});

//user logout
const userLogout=AsyncHandler(async(req, res)=>{
    //make sure user exist
    if(!req.user) throw new ApiError(400, "unauthprized access")

    const id=req.user.id;
    const removeRefreshTokenDB= await updateQuery(db, "users", {refreshtoken:null}, {id});
   
    if(removeRefreshTokenDB.rowCount===0) throw new ApiError(500, "internal server error")
    
    const options={
        httpOnly:true,
        secure:false
    }

    Object.keys(req.cookies).forEach((cookie)=>{
        res.clearCookie(cookie)
    })

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "user logout successfull"))

})

//refreshing the accesstoken if it expired
const refreshAccessToken=AsyncHandler(async(req, res)=>{   

    //get access token from req.cookies
    const refreshTokenCookie = req.cookies?.refreshToken;
    
    if(!refreshTokenCookie) throw new ApiError(400, "unauthorized access")

    //get user info from refreshtoken
    const userInfo = jwt.verify(refreshTokenCookie, process.env.REFREH_TOKEN_SECRET);
    const id=userInfo.id;

    //check user exist
    const userExist= await readQuery(db, "users", ["id", "fullname", "username", "email"], {id});
    
    if(userExist.rowCount===0) throw new ApiError(400, "unauthorized access")
    
    const user=userExist.rows[0]

    //generate new access and refreshtoken
    const accessToken = await generateAccessToken(user);
    const refrehToken= await generateRefreshToken({id})

    if(!accessToken || !refrehToken) throw new ApiError(500, "internal server error")
    
    //update new refreshToken in db
    const updateRefreshToken = await updateQuery(db, "users", {refreshtoken:refrehToken},{id});

    if(updateRefreshToken.rowCount===0) throw new ApiError(500, "internal server error")
    
    const options={
        httpOnly:true,
        secure:false
    }

    Object.keys(req.cookies).forEach((cookie)=>{
        res.clearCookie(cookie)
    })

    return res
    .status(200)
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
        updatedData=updateData.rows[0];
    }
    updatedDataArray.push(updatedData);

    return res
    .status(200)
    .json(new ApiResponse(200, {updatedDataArray}, "updated successfully"))
})

//for updating username, email, password
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

//generating otp for verification
const generateOtp = AsyncHandler(async(req, res)=>{

    //make sure req.user is available
    if(!req.user) throw new ApiError(400, "unauthorized access")
        
    //get user id from req.user   
    const id=req.user.id;

    //make sure user has not exceeded the otp verification failure limit
    let getOtpCount = await readQuery(db, "otpcounts", ["count", "date"], {user_id:id});
   
    if(getOtpCount.rowCount>0){
        const failureCount = getOtpCount.rows[0].count;
        const currDate = new Date();
        const otpFailureDate = new Date(getOtpCount.rows[0].date);
        const otpFailCount = getOtpCount.rows[0].count;
        const timeDiff = Math.abs(currDate-otpFailureDate)
        
        if(timeDiff < 86400000 && otpFailCount>=10) {
            throw new ApiError(400, "Otp limit for today exceeded try again after 24 hour")
        }else if (timeDiff > 86400000){
            //delete the existing otp count
            const deleteCount = await deleteQuery(db, "otpcounts", {user_id:id});
            if(deleteCount.rowCount===0) throw new ApiError(400, "Internal server error")
        }
    }
   
    //make sure previous otp is expired then generate new otp
    const checkOtp = await readQuery(db,"otp",["expiry"], {user_id:id});
    if(checkOtp.rowCount>0){
        const expiry = new Date(checkOtp.rows[0].expiry);
        const currTime = new Date();
        if(currTime < expiry) throw new ApiError(400, "Wait for 3 mins to get another otp")
    }

    //generate otp
    const generateOtp = await crypto.randomInt(10000, 99999);
    const otp = await hashPass(String(generateOtp))

    
     //delet the existing otp
    const deleteOtp = await deleteQuery(db, "otp", {user_id:id});
    
    //generate time
    const created_at = new Date();
    const expiry=new Date(created_at.getTime() + 3 * 60 * 1000);
    
    //save otp into databse
    const saveOtp = await createQuery(db, "otp", {user_id:id, otp, used:false, created_at, expiry}, ["otp"]);

    if(saveOtp.rowCount===0) throw new ApiError(500, "internal server error");

    //update the otpcounts table after generating otp
    getOtpCount = await readQuery(db, "otpcounts", ["count", "date"], {user_id:id})
    if(getOtpCount.rowCount===0){
        //if otp count is 0 add to a new one to it
        const currDate = new Date();
        const addOtpCount = await createQuery(db, "otpcounts", {user_id:id, date:currDate, count:1});
        if(addOtpCount.rowCount===0) throw new ApiError(400, "internal server error")
    }else if (getOtpCount.rowCount>0){
         //update the existing otp count
         const existingCount = getOtpCount.rows[0].count;
         const count = existingCount+1
         const updateCount = await updateQuery(db, "otpcounts", {count}, {user_id:id})
    }

    return res
    .status(200)
    .json(new ApiResponse(200, {otp:generateOtp}, "otp generated successfully valid till 3 mins"))
})

//verifying the otp
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

    //user id
    const userId=req.user.id;

    //otp given by the user
    const userOtp = Number(req.body.otp);
    
    //get stored otp of user
    const getStoredOtp = await readQuery(db, "otp", ["*"], {user_id:userId});

    //thorow error if there is no otp
    if(getStoredOtp.rowCount===0) throw new ApiError(400, "Unauthorized access please get an otp to proceed");

    //throw error if otp is alreday used for verification
    if(getStoredOtp.rows[0].used===true) throw new ApiError(400, "Otp already verified successfully")

    const storedOtp = getStoredOtp.rows[0].otp;
    const otpId= getStoredOtp.rows[0].id;
    

    //make sure otp is not expired
    const currDate = new Date()
    const expiry = new Date(getStoredOtp.rows[0].expiry);

    //otp failed count
    const previousFailedCount = await readQuery(db, "otpcounts", ["count", "date"], {user_id:userId});

    if(previousFailedCount.rows[0].count >= 10) throw new ApiError(400, "Otp limit for today exceeded try again after 24 hour")
    if(expiry < currDate){
        const deleteOtp = await deleteQuery(db, "otp", {id:otpId});

        if(deleteOtp.rowCount==0) throw new ApiError(400, "internal server error");

        //if failed-otp count is 0 add count 1
        if(previousFailedCount.rowCount===0){
            const today = new Date();
            let count = 1;
            const updatedCount = await updateQuery(db, "otpcounts", {count, date:today}, {user_id:userId});
         
            //if count already exist increase it
        }else if(previousFailedCount.rowCount>=1){
            let previousUpdatedCount = previousFailedCount.rows[0].count+1;
            const updatedCount = await updateQuery(db, "otpcounts", {count:previousUpdatedCount}, {user_id:userId});
            if(updatedCount.rowCount===0) throw new ApiError(500, "internal server error");
        }

        throw new ApiError(400, "previous otp expired generate a new one");

    }

    //compare both otp are same 
    const compareOtp = await comparePass(String(userOtp), storedOtp);
    
    if(!compareOtp){
        
        //update the failed otp counts
        const previousFailedCount = await readQuery(db, "otpcounts", ["count", "date"], {user_id:userId});
        
        if(previousFailedCount.rowCount===0){
            const today = new Date();
            let count =1;
            const addFailedCount = await createQuery(db, "otpcounts", {user_id:userId, date:today,count});
        }else if(previousFailedCount.rowCount>=1){
            let previousUpdatedCount = previousFailedCount.rows[0].count+1;
            const updatedCount = await updateQuery(db, "otpcounts", {count:previousUpdatedCount}, {user_id:userId});
            if(updatedCount.rowCount===0) throw new ApiError(500, "internal server error");
        }

        throw new ApiError(400, "Sorry otp didnt match")
    }

    //update otp as used
    const updateOtpAsUsed = await updateQuery(db, "otp", {used:true}, {id:otpId});

    if(updateOtpAsUsed.rowCount==0) throw new ApiError(500, "internal server error")

    //generate opt token
    const data={
        userId,
        otpId
    }
    const optToken = await generateOtpToken(data);

    //cookie options
    const options = {
        httpOnly:true,
        secure:false,
    }

    return res
    .status(200)
    .cookie("Otp_Token",optToken,options)
    .json(new ApiResponse(200, {optToken}, "otp verification successfull"))
})

//to reset the password if user forgot it
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


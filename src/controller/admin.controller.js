import {AsyncHandler} from "../utils/AsyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {createQuery,readQuery,updateQuery, deleteQuery} from "pgcrudify";
import {verifyBody} from "../utils/ReqBodyVerifier.js"
import db from "../db/index.js"
import crypto from "crypto"
import {mailSender} from "../utils/Email.js"
import {hashPass, comparePass} from "../utils/PasswordManager.js"
import {generateAccessToken} from "../utils/JwtManager.js"
import jwt from "jsonwebtoken"

const register = AsyncHandler(async(req, res)=>{
    //make sure req.body is fine
    const requiredFields = ["otp", "otp_id", "fullname", "register_number", "username", "email", "password"]
    const checkReqBody = await verifyBody(req.body, requiredFields, 7);

    const otp_id = req.body.otp_id;
    const otp = req.body.otp;
    const fullname = req.body.fullname;
    const register_number = req.body.register_number;
    let username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    // make sure all info provided by user are correct
    const getUser = await readQuery(db, "admin_otp", ["otp", "expiry"], {id:otp_id, fullname, register_number});
    if(getUser.rowCount === 0) throw new ApiError(400, "Something went wrong make sure all provided datas are correct")
    
    const timeNow = new Date();
    const expiry = new Date(getUser.rows[0].expiry);
    if(timeNow > expiry){
         const deleteOtp = await deleteQuery(db, "admin_otp", {id:otp_id});
         if(deleteOtp.rowCount === 0) throw new ApiError(400, "something went wrong")
         throw new ApiError(400, "Oops otp expired")
    }
    const storedOtp = getUser.rows[0].otp;
    const compareOtp = await comparePass(String(otp), storedOtp);

    let returnData =null;
    if(compareOtp){
        //hash the password
        const hashedPass = await hashPass(password);
        username =username.trim();   
        username = username.toLowerCase();
    
        // register the user
        const registerUser = await createQuery(db, "admin", {fullname, register_number, username, email, password:hashedPass});
        if(registerUser.rowCount === 0) throw new ApiError(400, "something went wrong");
        returnData = username;

        const deleteOtpUsed = await deleteQuery(db, "admin_otp", {id:otp_id});
        if(deleteOtpUsed.rowCount === 0) throw new ApiError(400, "something went wrong");
        
    };

    return res
    .status(200)
    .json(new ApiResponse(200, {username:returnData}, "user registered successfully"))
});

const login = AsyncHandler(async(req, res)=>{
   //make sure req.body is fine
   const requiredFields = ["username", "register_number", "password"]
   const checkReqBody = await verifyBody(req.body, requiredFields, 2);

   const username = req.body.username || null;
   const register_number = req.body.register_number || null;
   const password = req.body.password;

   //get the user from username or registernumber
   let storedPassword = null;
   let stored_id = null;
   let storedUser_name = null;
   let storedRegister_number =null;
   if(username){
    const getUser = await readQuery(db, "admin", ["id", "password", "username", "register_number"], {username});
    if(getUser.rowCount===0) throw new ApiError(400, "user not found")
    storedPassword = getUser.rows[0].password;
    stored_id = getUser.rows[0].id
    storedUser_name = getUser.rows[0].username;
    storedRegister_number =getUser.rows[0].register_number
    }else if(register_number){
    const getUser = await readQuery(db, "admin", ["id", "password", "username", "register_number"], {register_number});
    if(getUser.rowCount===0) throw new ApiError(400, "user not found")
    storedPassword = getUser.rows[0].password;
    stored_id = getUser.rows[0].id
    storedUser_name = getUser.rows[0].username;
    storedRegister_number =getUser.rows[0].register_number
    }

    //compare the password
    const passwordResult = await comparePass(password, storedPassword);
    
    if(!passwordResult) throw new ApiError(400, "wrong password");
    
    const user ={
        id:stored_id,
        username:storedUser_name,
        register_number:storedRegister_number
    }
    const adminToken = await generateAccessToken(user);
    
    return res
    .status(200)
    .cookie("adminToken", adminToken)
    .json(new ApiResponse(200, adminToken, "login successfull"))
});

const deleteAdmin = AsyncHandler(async(req, res)=>{
    //make sure admin is available
    if(!req.admin) throw new ApiError(400, "unauthorized access");

    const password = req.body.password;
    const id = req.admin.id;

    //get the user password
    const getPass = await readQuery(db, "admin", ["password"], {id});
    if(getPass.rowCount===0) throw new ApiError(400, "something went wrong");
    const savedPassword = getPass.rows[0].password;
    //make sure password is correct
    const comparePassword = await comparePass(password, savedPassword);
    
    if(!comparePassword) throw new ApiError(400, "wrong password");

    //delete the admin
    const deleteAdmin = await deleteQuery(db, "admin", {id});
    if(deleteAdmin.rowCount===0) throw new ApiError(400, "something went wrong");

    Object.keys(req.cookies).forEach((cookie)=>{
        res.clearCookie(cookie)
    })

    return res
    .status(200)
    .json(new ApiResponse(200, {id}, "account deleted successfully"))
});
   
const generateOtp = AsyncHandler(async(req, res)=>{
    //make sure req.body is fine
    const requiredFields = ["admin_name", "register_number"]
    const checkReqBody = await verifyBody(req.body, requiredFields, 2);

    const register_number = req.body.register_number;

    //make sure that register number is not alreday registered
    const checkRegister = await readQuery(db, "admin", ["register_number"], {register_number});
    if(checkRegister.rowCount > 0) throw new ApiError(400, "admin alreday registered provide a valid register number")

    //generate otp
    const generatedOtp = await crypto.randomInt(10000, 99999);
    const otp = await hashPass(String(generatedOtp));

    const fullname = req.body.admin_name;
    const timeNow = new Date();
    const expiry = new Date();  
    expiry.setMinutes(expiry.getMinutes() + 3);

    //make sure user has waited for 1 min before making new Otp request
    const checkTime = await readQuery(db, "admin_otp", ["expiry", "id"], {register_number});
    const expiryTime = new Date(checkTime.rows?.[0]?.expiry);
    const storedOtpId = checkTime.rows?.[0]?.id;

    const extendedExpiry = new Date();
    extendedExpiry.setMinutes(extendedExpiry.getMinutes() + 1);
    if(extendedExpiry < expiryTime){
     throw new ApiError(400, "request for another otp after 1 min")
    }else{
        //delete the previous otp
        const deleteOtp = await deleteQuery(db, "admin_otp", {id:storedOtpId});
    }

    // save otp into databse
    const saveOtp = await createQuery(db, "admin_otp", {fullname, register_number, otp, created_at:timeNow, expiry}, ["id"]);
    if(saveOtp.rowCount === 0) throw new ApiError(400, "something went wrong make sure you provided all data");
    const otpId = saveOtp.rows[0].id;

    const otp_text = `The otp for verifying the admin Named ${fullname} with register no ${register_number} is ${generatedOtp} and, the otp id is ${otpId} and is valid for 3 mins`
    const sendOtp = await mailSender(process.env.MANAGER_EMAIL, `New Admin otp for ${fullname} (${register_number})`,otp_text);
    
    if(!sendOtp) throw new ApiError(400, "something went wrong");

    return res
    .status(200)
    .json(new ApiResponse(200, {otp:generatedOtp, otp_id:otpId}, "Otp sent to the Manager successfully, please verify your self within 3 mins"))
});

export {register, login, deleteAdmin, generateOtp}
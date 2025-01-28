import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {AsyncHandler} from "../utils/AsyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"

const userRegister= async(req, res)=>{
    res.send("hello iam sahan")
}

export {userRegister}
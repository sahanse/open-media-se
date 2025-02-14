import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {AsyncHandler} from "../utils/AsyncHandler.js"
import {uploadOnCloudinary} from "../utils/Cloudinary.js"
import {verifyBody} from "../utils/ReqBodyVerifier.js"

const getVideos= AsyncHandler(async(req, res)=>{
});

const videoUpload= AsyncHandler(async(req, res)=>{
    //make sure req.user is availabel
    if(!req.user) throw new ApiError(400, "Unauthorized access");

    //make sure that req.file is available
    if(!req.files) throw new ApiError(400, "Cant continue without video");

    //make sure req.body is available
    if(!req.body) throw new ApiError(400, "please provide data")

    //get user from req.user 
    const userId = req.user.id;

    //access details from req.body
    const {title, description, ispublic, category, duration_type, child_safe} = req.body;

    //access image files from req.files
    const {video, thumbnail} = req.files;

    //make sure req.body is fine
    const requiredFields = ["title", "description", "ispublic", "category", "duration_type", "child_safe"];
    const checkReqBody = await verifyBody(req.body, requiredFields, 6);

});

const videoUpdate=AsyncHandler(async(req, res)=>{

});

const videoDelete=AsyncHandler(async(req, res)=>{

});

export {videoUpload, getVideos, videoUpdate,videoDelete}

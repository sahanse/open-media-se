import {AsyncHandler} from "../utils/AsyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {createQuery, readQuery, updateQuery, deleteQuery} from "pgcrudify";
import fs, { stat } from "fs";
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/Cloudinary.js";
import {verifyBody} from "../utils/ReqBodyVerifier.js"
import db from "../db/index.js"
import { type } from "os";

const addComment = AsyncHandler(async(req, res)=>{
    //make sure user is verified
    if(!req.user) throw new ApiError(400, "Unauthorized access");

    //make sure req.body is fine
    const requiredFields = ["comment", "type", "id"];
    const checkReqBody = await verifyBody(req.body, requiredFields, 3);

    const user_id = req.user.id;
    const comment = req.body.comment;
    const id = req.body.id;

    const type = req.body.type;
    if(type !== "video" && type !== "post") throw new ApiError(400, `invalid type ${type}`)

    const returnData ={}
    if(type === "video"){
        const addComment = await createQuery(db, "video_comments", {user_id, video_id:id, comment} ["comment", "id"]);
        if(addComment.rowCount === 0) throw new ApiError(400, "something went wrong please make sure provided data is correct");
        returnData.id= addComment.rows[0].id;
        returnData.comment = addComment.rows[0].comment;
    }else if(type === "post"){
        const addComment = await createQuery(db, "post_comments", {user_id, post_id:id, comment} ["comment", "id"]);
        if(addComment.rowCount === 0) throw new ApiError(400, "something went wrong please make sure provided data is correct");
        returnData.id= addComment.rows[0].id;
        returnData.comment = addComment.rows[0].comment;
    }

    return res
    .status(200)
    .json(new ApiResponse(200, returnData, "success"))
});

const updateComment = AsyncHandler(async(req, res)=>{
});

const deleteComment = AsyncHandler(async(req, res)=>{
});

const getComment = AsyncHandler(async(req, res)=>{
});

export {addComment, updateComment, deleteComment, getComment}
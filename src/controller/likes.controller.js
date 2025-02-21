import {AsyncHandler} from "../utils/AsyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {createQuery, deleteQuery} from "pgcrudify";
import {verifyBody} from "../utils/ReqBodyVerifier.js"
import db from "../db/index.js"

const postLike = AsyncHandler(async(req, res)=>{
    //make sure req.user is available
    if(!req.user) throw new ApiError(400, "Unauthorized access");

     //make sure req.body is fine
     const requiredFields = ["status", "post_id"];
     const checkReqBody = await verifyBody(req.body, requiredFields, 2);
     
    const user_id = req.user.id;
    const post_id= req.body.post_id;
    const status = req.body.status;
    
    if(typeof(status) !== "boolean") throw new ApiError(400, "Expected an boolean in status")

    if(status===true){
        const addLike = await createQuery(db, "post_likes", {post_id, user_id});
        if(addLike.rowCount === 0) throw new ApiError(400, "something went wrong make sure you provided all required datas")
    }else if(status===false){
        const removeLike = await deleteQuery(db, "post_likes", {post_id, user_id});
        if(removeLike.rowCount === 0) throw new ApiError(400, "something went wrong make sure you provided all required datas")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, {id:post_id}, "success"));
});

const videoLike = AsyncHandler(async(req, res)=>{
    //make sure req.user is available
    if(!req.user) throw new ApiError(400, "Unauthorized access");

     //make sure req.body is fine
     const requiredFields = ["status", "video_id"];
     const checkReqBody = await verifyBody(req.body, requiredFields, 2);
     
    const user_id = req.user.id;
    const video_id= req.body.video_id;
    const status = req.body.status;
    
    if(typeof(status) !== "boolean") throw new ApiError(400, "Expected an boolean in status")

    if(status===true){
        const addLike = await createQuery(db, "video_likes", {video_id, user_id});
        if(addLike.rowCount === 0) throw new ApiError(400, "something went wrong make sure you provided all required datas")
    }else if(status===false){
        const removeLike = await deleteQuery(db, "video_likes", {video_id, user_id});
        if(removeLike.rowCount === 0) throw new ApiError(400, "something went wrong make sure you provided all required datas")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, {id:video_id}, "success"));
});

export {postLike, videoLike}
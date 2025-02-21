import {AsyncHandler} from "../utils/AsyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {createQuery, deleteQuery, readQuery} from "pgcrudify";
import {verifyBody} from "../utils/ReqBodyVerifier.js"
import db from "../db/index.js"

const addViews = AsyncHandler(async(req, res)=>{
   
    //make sure req.body is fine
    const requiredFields = ["type", "id"];
    const checkReqBody = await verifyBody(req.body, requiredFields, 2);

    const user_id = req.user;
    const id = req.body.id;
    const type = req.body.type;
    
    let returnData ={}
    if(type === "video"){
        if(user_id !== null){
            const addView = await createQuery(db, "video_views", {video_id:id, user_id});
            if(addView.rowCount === 0) throw new ApiError(400, "something went wrong please make sure all datas provided are correct");
            returnData.id=id;
        }else {
            const addView = await createQuery(db, "video_views", {video_id:id});
            if(addView.rowCount === 0) throw new ApiError(400, "something went wrong please make sure all datas provided are correct");
            returnData.id=id;
        }
    }else if (type === "post"){
        if(user_id !== null){
            const addView = await createQuery(db, "post_views", {post_id:id, user_id});
            if(addView.rowCount === 0) throw new ApiError(400, "something went wrong please make sure all datas provided are correct");
            returnData.id=id;
        }else {
            const addView = await createQuery(db, "post_views", {post_id:id});
            if(addView.rowCount === 0) throw new ApiError(400, "something went wrong please make sure all datas provided are correct");
            returnData.id=id;
        }
    }

    return res
    .status(200)
    .json(new ApiResponse(200, returnData, "success"))
});

const viewsHistory = AsyncHandler(async(req, res)=>{
    //make sure req.user is available
    if(!req.user) throw new ApiError(400, "unauthorized access");

    const user_id = req.user.id;
    
    //make db query
    const getViews = await readQuery(db, "video_views", ["video_id", "viewed_at"], {user_id});
    const data = getViews.rows;
    
    return res
    .status(200)
    .json(new ApiResponse(200, data, "success"))
});

export {addViews, viewsHistory};
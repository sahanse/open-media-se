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

    const returnData ={};
    if(type === "video"){
        const addComment = await createQuery(db, "video_comments", {video_id:id, user_id, comment}, ["id"]);
        if(addComment.rowCount===0) throw new ApiError(400, "something went wrong make sure all provided datas are correct")
        returnData.id=addComment.rows[0].id;
        returnData.comment =comment;
    }else if(type === "post"){
      const addComment = await createQuery(db, "post_comments", {post_id:id, user_id, comment}, ["id"]);
      if(addComment.rowCount === 0) throw new ApiError(400, "something went wrong make sure provided all data correct")
      returnData.id=addComment.rows[0].id;
      returnData.comment =comment;
    }
    
    return res
    .status(200)
    .json(new ApiResponse(200, returnData, "success"))
});

const updateComment = AsyncHandler(async(req, res)=>{
    //make sure user is verified
    if(!req.user) throw new ApiError(400, "Unauthorized access");

    //make sure req.body is fine
    const requiredFields = ["comment", "type", "id"];
    const checkReqBody = await verifyBody(req.body, requiredFields, 3);

    const user_id = req.user.id;
    const comment = req.body.comment;
    const id = req.body.id;
    const type = req.body.type;
    
    const returnData={}
    if(type === "video"){
        const updateComment = await updateQuery(db, "video_comments", {comment}, {id, user_id});
        if(updateComment.rowCount === 0) throw new ApiError(400, "something went wrong please check all provided datas are correct");
        returnData.id=id;
        returnData.comment=comment;
    }else if(type === "post"){
        const updateComment = await updateQuery(db, "post_comments", {comment}, {id, user_id});
        console.log(updateComment)
        if(updateComment.rowCount === 0) throw new ApiError(400, "something went wrong please check all provided datas are correct")
        returnData.id=id;
        returnData.comment=comment;
        }

        return res
        .status(200)
        .json(new ApiResponse(200, returnData, "success"))
});

const deleteComment = AsyncHandler(async(req, res)=>{
    //make sure user is verified
    if(!req.user) throw new ApiError(400, "Unauthorized access");

    //make sure req.body is fine
    const requiredFields = ["type", "id"];
    const checkReqBody = await verifyBody(req.body, requiredFields, 2);

    const user_id = req.user.id;
    const type = req.body.type;
    const id=req.body.id;

    //delete the comment
    if(type === "video"){
        const deleteComment = await deleteQuery(db, "video_comments", {id, user_id});
        if(deleteComment.rowCount===0) throw new ApiError(400, "something went wrong make sure all provided datas are correct");
    }else if(type === "post"){
        const deleteComment = await deleteQuery(db, "post_comments", {id, user_id});
        if(deleteComment.rowCount===0) throw new ApiError(400, "something went wrong make sure all provided datas are correct");
    }
    
    return res
    .status(200)
    .json(new ApiResponse(200, {id}, "successfully deleted"))
});

const getComment = AsyncHandler(async(req, res)=>{
    //make sure req.body is fine
    const requiredFields = ["type","id"];
    const checkReqBody = await verifyBody(req.body, requiredFields, 2);

    const id = req.body.id;
    const type = req.body.type;

    const returnData = {};
    if(type === "post"){
    const getComment = await db.query(`SELECT 
    pc.id, 
    pc.comment, 
    pc.user_id, 
    u.username, 
    u.avatar
    FROM post_comments pc
    INNER JOIN users u ON pc.user_id = u.id
    WHERE pc.post_id = ${id};

`)
  if(getComment.rowCount===0) throw new ApiError(400, "something went wrong make sure all provided datas are correct")
  returnData.comments = getComment.rows;
 }else if(type === "video"){
    const getComment =await db.query(`SELECT 
    vc.id, 
    vc.comment, 
    vc.user_id, 
    u.username, 
    u.avatar
    FROM video_comments vc
    INNER JOIN users u ON vc.user_id = u.id
    WHERE vc.video_id = ${id};
    `)
    if(getComment.rowCount===0) throw new ApiError(400, "something went wrong make sure all provided datas are correct")
    returnData.comments = getComment.rows;
  }

  return res
  .status(200)
  .json(new ApiResponse(200, returnData, "success"))
});

export {addComment, updateComment, deleteComment, getComment}
import {AsyncHandler} from "../utils/AsyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {createQuery,readQuery,updateQuery, deleteQuery} from "pgcrudify";
import {verifyBody} from "../utils/ReqBodyVerifier.js"
import db from "../db/index.js"

const addVideo= AsyncHandler(async(req, res)=>{
     //make sure user id verified 
     if(!req.user) throw new ApiError(400, "unauthorized access")

        //make sure all datas are available in req.body
        const requiredFields = ["video_id"]
        const checkReqBody = await verifyBody(req.body, requiredFields,1);
    
        const user_id = req.user.id;
        const video_id = req.body.video_id;
    
        //save the video
        const saveVideo = await createQuery(db, "saved_videos",{user_id, video_id});
        if(saveVideo.rowCount === 0) throw new ApiError(400, "something went wrong make sure all provided datas are correct");
    
        return res
        .status(200)
        .json(new ApiResponse(200, {}, "video saved successfully"))
});

const deleteVideo = AsyncHandler(async(req, res)=>{
    //make sure user id verifed
    if(!req.user) throw new ApiError(400, "unauthorized access");

    const {video_id}= req.body;
    if(!video_id) throw new ApiError(400, "please provide video_id");

    const user_id = req.user.id;

    //delete the saved video
    const deleteVideo = await deleteQuery(db, "saved_videos", {user_id, video_id});
    if(deleteVideo.rowCount === 0) throw new ApiError(400, "something went wrong make sure all provided datas are correct");

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "removed saved video"))
});

const getAll = AsyncHandler(async (req, res) => {
    // Ensure user is authenticated
    if (!req.user) throw new ApiError(401, "Unauthorized access");

    const user_id = req.user.id;

    // Query to get saved videos with full details, including uploader info, total likes, comments, and views
    const query = `
        SELECT 
            v.id AS video_id, 
            v.title, 
            v.thumbnail_url, 
            v.duration_type, 
            v.user_id AS uploader_id, 
            u.username AS uploader_username, 
            u.avatar AS uploader_avatar,
            COALESCE(vl.total_likes, 0) AS total_likes,
            COALESCE(vc.total_comments, 0) AS total_comments,
            COALESCE(vv.total_views, 0) AS total_views
        FROM saved_videos sv
        INNER JOIN video v ON sv.video_id = v.id
        INNER JOIN users u ON v.user_id = u.id
        LEFT JOIN (
            SELECT video_id, COUNT(*) AS total_likes 
            FROM video_likes 
            GROUP BY video_id
        ) vl ON v.id = vl.video_id
        LEFT JOIN (
            SELECT video_id, COUNT(*) AS total_comments 
            FROM video_comments 
            GROUP BY video_id
        ) vc ON v.id = vc.video_id
        LEFT JOIN (
            SELECT video_id, COUNT(*) AS total_views 
            FROM video_views 
            GROUP BY video_id
        ) vv ON v.id = vv.video_id
        WHERE sv.user_id = $1
        ORDER BY sv.id DESC;
    `;

    const { rows } = await db.query(query, [user_id]);

    return res.status(200).json({
        message: "Saved videos retrieved successfully",
        data: rows.length > 0 ? rows : [] // Ensure empty array if no videos are found
    });
});

export {addVideo, deleteVideo, getAll}
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

//save the video
const addPost= AsyncHandler(async(req, res)=>{
    //make sure user id verified 
    if(!req.user) throw new ApiError(400, "unauthorized access")

        //make sure all datas are available in req.body
        const requiredFields = ["post_id"]
        const checkReqBody = await verifyBody(req.body, requiredFields,1);
    
        const user_id = req.user.id;
        const post_id = req.body.post_id;
    
        //save the video
        const saveVideo = await createQuery(db, "saved_posts",{user_id, post_id});
        if(saveVideo.rowCount === 0) throw new ApiError(400, "something went wrong make sure all provided datas are correct");
    
        return res
        .status(200)
        .json(new ApiResponse(200, {}, "post saved successfully"))
});

const deletePost= AsyncHandler(async(req, res)=>{
     //make sure user id verifed
     if(!req.user) throw new ApiError(400, "unauthorized access");

     const {post_id}= req.body;
     if(!post_id) throw new ApiError(400, "please provide post_id");
 
     const user_id = req.user.id;
 
     //delete the saved video
     const deletePost = await deleteQuery(db, "saved_posts", {user_id, post_id});
     if(deletePost.rowCount === 0) throw new ApiError(400, "something went wrong make sure all provided datas are correct");
 
     return res
     .status(200)
     .json(new ApiResponse(200, {}, "removed saved video"))
});

const getAll = AsyncHandler(async (req, res) => {
    // Ensure user is authenticated
    if (!req.user) throw new ApiError(401, "Unauthorized access");

    const user_id = req.user.id;

    // Query to get saved posts with full details
    const query = `
        SELECT 
            p.id AS post_id, 
            p.image_array, 
            p.description,
            p.user_id AS uploader_id,
            u.username AS uploader_username,
            u.avatar AS uploader_avatar,
            COALESCE(pl.total_likes, 0) AS total_likes,
            COALESCE(pc.total_comments, 0) AS total_comments,
            COALESCE(pv.total_views, 0) AS total_views
        FROM saved_posts sp
        INNER JOIN post p ON sp.post_id = p.id
        INNER JOIN users u ON p.user_id = u.id
        LEFT JOIN (
            SELECT post_id, COUNT(*) AS total_likes 
            FROM post_likes 
            GROUP BY post_id
        ) pl ON p.id = pl.post_id
        LEFT JOIN (
            SELECT post_id, COUNT(*) AS total_comments 
            FROM post_comments 
            GROUP BY post_id
        ) pc ON p.id = pc.post_id
        LEFT JOIN (
            SELECT post_id, COUNT(*) AS total_views 
            FROM post_views 
            GROUP BY post_id
        ) pv ON p.id = pv.post_id
        WHERE sp.user_id = $1
        ORDER BY sp.id DESC;
    `;

    const { rows } = await db.query(query, [user_id]);

    return res.status(200).json({
        message: "Saved posts retrieved successfully",
        data: rows.length > 0 ? rows : [] // Ensure empty array if no posts are found
    });
});

export {addPost, deletePost, getAll}
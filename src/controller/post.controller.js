import {AsyncHandler} from "../utils/AsyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {createQuery, updateQuery, deleteQuery} from "pgcrudify";
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/Cloudinary.js";
import {verifyBody} from "../utils/ReqBodyVerifier.js"
import db from "../db/index.js"

const createPost = AsyncHandler(async(req, res)=>{
    //make sure req.user is available
    if(!req.user) throw new ApiError(400, "Unauthorized access");

    //make sure req.body is fine
    const requiredFields = ["description", "ispublic"];
    const checkReqBody = await verifyBody(req.body, requiredFields, null, req.files);

    //make sure files are available
    if(!req.files || req.files.length ===0) throw new ApiError(400, "please provide images to continue");

    const cloudinaryArrayPath =[];
    //upload images on cloudinary
    for(let val of req.files){
       const uploadImage = await uploadOnCloudinary(val.path);
       if(!uploadImage) throw new ApiError(400, "Something went wrong");
       cloudinaryArrayPath.push(uploadImage.url);
    }
    if(cloudinaryArrayPath.length===0) throw new ApiError(400, "Something went wrong")

    const saveObject = {
        image_array:cloudinaryArrayPath,
        description: req.body.description,
        ispublic:req.body.ispublic,
        user_id:req.user.id,
    };

    //save post in db
    const savePost = await createQuery(db, "post", saveObject, ["id"]);
    if(savePost.rowCount === 0) throw new ApiError(400, "something went wrong");

    return res
    .status(200)
    .json(new ApiResponse(200, {id:savePost.rows[0].id}, "post created successFully"))
});

const updatePost = AsyncHandler(async(req, res)=>{
    //make sure req.user is available
    if(!req.user) throw new ApiError(400, "Unauthorized access");

     //make sure req.body is fine
     const requiredFields = ["description", "ispublic", "post_id"];
     const checkReqBody = await verifyBody(req.body, requiredFields, null, req.files);

     const user_id = req.user.id;
     const id = req.body.post_id;

     const dataObject = {}
     for(let val in req.body){
        if(val !== "postid"){
           dataObject[val]= req.body[val]
        }
     }

     const updateInfo = await updateQuery(db, "post", dataObject, {id, user_id});
     if(updateInfo.rowCount === 0) throw new ApiError(400, "something went wrong");

     return res
     .status(200)
     .json(new ApiResponse(200, {id}, "Data updated successfully"))
});

const deletePost = AsyncHandler(async(req, res)=>{
    //make sure req.user is available
    if(!req.user) throw new ApiError(400, "Unauthorized access");

     //make sure req.body is fine
     const requiredFields = ["post_id"];
     const checkReqBody = await verifyBody(req.body, requiredFields);

     const id = req.body.post_id;
     const user_id = req.user.id;

     const deletePost = await deleteQuery(db, "post", {id, user_id}, ["image_array"]);
     if(deletePost.rowCount===0) throw new ApiError(400, "Something went wrong check if post_id provided is correct");

     const imageArray = deletePost.rows[0].image_array;

     for(let val of imageArray){
      const deleteCloudImage = await deleteFromCloudinary(val);
      if(!deleteCloudImage) throw new ApiError(400, "something went wrong")
     }

     return res
     .status(200)
     .json(new ApiResponse(200, {id}, "post deleted successfully"))
});

const getPost = AsyncHandler(async (req, res) => {
    // Ensure req.body is valid
    const requiredFields = ["postLimit", "preference", "postArray", "child_safe"];
    const checkReqBody = await verifyBody(req.body, requiredFields);

    // Extract data from req.body with defaults
    const limit = req.body.postLimit || 20;
    const child_safe = req.body.child_safe ?? true;
    const postArray = req.body.postArray || [];
    const preference = req.body.preference || [];

    let filters = ["p.ispublic = true", "p.child_safe = $1"];
    let queryParams = [child_safe];
    let paramIndex = 2;

    // Add category filter if preferences exist
    if (preference.length > 0) {
        filters.push(`p.category = ANY($${paramIndex})`);
        queryParams.push(preference);
        paramIndex++;
    }

    // Exclude posts in postArray
    if (postArray.length > 0) {
        filters.push(`p.id <> ALL($${paramIndex})`);
        queryParams.push(postArray);
        paramIndex++;
    }

    // Construct WHERE clause
    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    // Final query (Preventing SQL Injection)
    const query =`
    SELECT 
        p.id AS post_id, 
        p.image_array, 
        p.description, 
        p.created_at, 
        u.id AS uploader_id, 
        u.username AS uploader,
        COUNT(pi.id) AS views_count
    FROM post p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN post_views pi ON pi.post_id = p.id  -- FIXED HERE
    ${whereClause}
    GROUP BY p.id, u.id
    ORDER BY RANDOM()
    LIMIT $${paramIndex};`;

    queryParams.push(limit); // Add limit as the last parameter

    // Execute query safely
    const getPostDb = await db.query(query, queryParams);

    // Extract rows
    const rows = getPostDb.rows;

    // Append fetched post IDs to postArray
    for (let val of rows) {
        postArray.push(val.post_id);
    }

    // Return response
    return res.status(200).json(
        new ApiResponse(200, { postData: rows, postArray }, "Posts retrieved successfully")
    );
});

const searchPost = AsyncHandler(async(req, res)=>{
});

export {createPost, updatePost, deletePost, getPost, searchPost}

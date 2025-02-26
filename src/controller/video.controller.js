import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {AsyncHandler} from "../utils/AsyncHandler.js"
import {verifyBody} from "../utils/ReqBodyVerifier.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/Cloudinary.js"
import {createQuery, readQuery, updateQuery, deleteQuery} from "pgcrudify"
import db from "../db/index.js"

const getVideos = AsyncHandler(async (req, res) => {
    // Ensure req.body contains required fields
    const requiredFields = ["videoLimit", "preference", "videoArray", "child_safe"];
    const checkReqBody = await verifyBody(req.body, requiredFields);

    // Get required data from req.body
    const limit = req.body.videoLimit || 20;
    const child_safe = req.body.child_safe !== undefined ? req.body.child_safe : true;
    const videoArray = req.body.videoArray || []; // Exclude these video IDs

    // Get user preferred categories (array of category IDs)
    const preference = Array.isArray(req.body.preference) ? req.body.preference : [req.body.preference];
    
    // Ensure preference contains valid category IDs
    const validCategories = preference.filter(cat => !isNaN(cat));

    // Define proportion: 60% from preferred category, 40% random
    const preferredLimit = Math.ceil(limit * 0.6);
    const randomLimit = limit - preferredLimit;

    let preferredVideos = [];
    if (validCategories.length > 0) {
        const formattedCategories = validCategories.join(', ');
        let excludeClause = videoArray.length > 0 ? `AND v.id NOT IN (${videoArray.join(', ')})` : "";

        const preferredQuery = `
            SELECT 
                v.id AS video_id, 
                v.video_url, 
                v.thumbnail_url, 
                v.title, 
                v.duration_type, 
                v.created_at,
                v.category_id, 
                c.title AS category_name, 
                u.id AS uploader_id, 
                u.username AS uploader,
                COUNT(DISTINCT vi.id) AS views_count,
                COUNT(DISTINCT vl.id) AS likes_count,
                COUNT(DISTINCT vc.id) AS comments_count
            FROM video v
            JOIN users u ON v.user_id = u.id
            JOIN category c ON v.category_id = c.id
            LEFT JOIN video_views vi ON vi.video_id = v.id
            LEFT JOIN video_likes vl ON vl.video_id = v.id
            LEFT JOIN video_comments vc ON vc.video_id = v.id
            WHERE v.category_id IN (${formattedCategories})
            AND v.ispublic = true
            AND v.child_safe = ${child_safe}
            ${excludeClause}
            GROUP BY v.id, u.id, c.id
            ORDER BY RANDOM()
            LIMIT ${preferredLimit};
        `;
        const preferredResult = await db.query(preferredQuery);
        preferredVideos = preferredResult.rows;
    }

    // Update videoArray with preferred videos
    preferredVideos.forEach(video => videoArray.push(video.video_id));

    // Fetch remaining random videos
    let randomVideos = [];
    let excludeClause = videoArray.length > 0 ? `AND v.id NOT IN (${videoArray.join(', ')})` : "";

    const randomQuery = `
        SELECT 
            v.id AS video_id, 
            v.video_url, 
            v.thumbnail_url, 
            v.title, 
            v.description, 
            v.duration_type, 
            v.created_at,
            v.category_id, 
            c.title AS category_name, 
            u.id AS uploader_id, 
            u.username AS uploader,
            COUNT(DISTINCT vi.id) AS views_count,
            COUNT(DISTINCT vl.id) AS likes_count,
            COUNT(DISTINCT vc.id) AS comments_count
        FROM video v
        JOIN users u ON v.user_id = u.id
        JOIN category c ON v.category_id = c.id
        LEFT JOIN video_views vi ON vi.video_id = v.id
        LEFT JOIN video_likes vl ON vl.video_id = v.id
        LEFT JOIN video_comments vc ON vc.video_id = v.id
        WHERE v.ispublic = true 
        AND v.child_safe = ${child_safe}
        ${excludeClause}
        GROUP BY v.id, u.id, c.id
        ORDER BY RANDOM()
        LIMIT ${randomLimit};
    `;
    const randomResult = await db.query(randomQuery);
    randomVideos = randomResult.rows;

    // Merge both results
    const finalVideos = [...preferredVideos, ...randomVideos];

    // Update videoArray with random videos
    randomVideos.forEach(video => videoArray.push(video.video_id));

    const data = {
        videoData: finalVideos,
        videoArray
    };

    return res.status(200).json(new ApiResponse(200, data, "Videos fetched successfully"));
});

const searchVideos = AsyncHandler(async (req, res) => {
    const requiredFields = ["searchTerm", "limit", "videoArray"];
    const checkReqBody = await verifyBody(req.body, requiredFields);

    if (!checkReqBody) {
        return res.status(400).json({ message: "Invalid request body" });
    }

    const { searchTerm, limit, videoArray = [] } = req.body;
    const searchValue = `%${searchTerm}%`;

    // Query to search for the most relevant channels (up to 4)
    const channelQuery = `
        SELECT 
            id AS user_id,
            username,
            avatar,
            coverimage,
            ischannel,
            SIMILARITY(username, $1) AS relevance
        FROM users
        WHERE ischannel = true
        AND SIMILARITY(username, $1) > 0.2
        ORDER BY relevance DESC
        LIMIT 4;
    `;
    const channelResult = await db.query(channelQuery, [searchTerm]);
    const channels = channelResult.rows;

    // Query to search for videos related to the search term while avoiding duplicates
    const videoQuery = `
        SELECT 
            v.id AS video_id, 
            v.video_url, 
            v.thumbnail_url, 
            v.title, 
            v.duration_type, 
            v.created_at, 
            v.category_id, 
            c.title AS category_name,
            u.id AS user_id, 
            u.username AS uploader,
            COUNT(DISTINCT vi.id) AS views,
            COUNT(DISTINCT vl.id) AS likes_count,
            COUNT(DISTINCT vc.id) AS comments_count
        FROM video v
        JOIN users u ON v.user_id = u.id
        JOIN category c ON v.category_id = c.id
        LEFT JOIN video_views vi ON vi.video_id = v.id
        LEFT JOIN video_likes vl ON vl.video_id = v.id
        LEFT JOIN video_comments vc ON vc.video_id = v.id
        WHERE v.ispublic = true
        AND (
            v.title ILIKE $1 OR 
            v.description ILIKE $1 OR 
            c.title ILIKE $1
        )
        ${videoArray.length > 0 ? `AND v.id NOT IN (${videoArray.join(', ')})` : ""}
        GROUP BY v.id, u.id, c.id
        ORDER BY v.created_at DESC
        LIMIT $2;
    `;

    const videoResult = await db.query(videoQuery, [searchValue, limit]);
    const videos = videoResult.rows;

    // Update videoArray to include newly fetched video IDs
    videos.forEach(video => videoArray.push(video.video_id));

    return res
        .status(200)
        .json(new ApiResponse(200, { channels, videos, videoArray }, "Successfully fetched videos"));
});

const getVideoByCategory = AsyncHandler(async (req, res) => {
    // Validate request body
    const requiredFields = ["category", "limit", "videoArray"];
    const checkReqBody = await verifyBody(req.body, requiredFields);

    if (!checkReqBody) {
        return res.status(400).json({ message: "Invalid request body" });
    }

    // Extract values from request body
    const category = req.body.category;
    const limit = req.body.limit || 20;
    let videoArray = req.body.videoArray || []; // Videos to exclude

    // Ensure category is valid
    if (isNaN(category)) {
        return res.status(400).json({ message: "Invalid category ID" });
    }

    // Construct query with parameterized values
    let queryParams = [category, limit];
    let excludeClause = "";

    if (videoArray.length > 0) {
        excludeClause = `AND v.id NOT IN (${videoArray.map((_, i) => `$${queryParams.length + i + 1}`).join(", ")})`;
        queryParams = [...queryParams, ...videoArray];
    }

    const query = `
        SELECT 
            v.id AS video_id, 
            v.video_url, 
            v.thumbnail_url, 
            v.title, 
            v.description, 
            v.duration_type, 
            v.created_at,
            v.category_id, 
            c.title AS category_name, 
            u.id AS uploader_id, 
            u.username AS uploader,
            COUNT(DISTINCT vi.id) AS views_count,
            COUNT(DISTINCT vl.id) AS likes_count,
            COUNT(DISTINCT vc.id) AS comments_count
        FROM video v
        JOIN users u ON v.user_id = u.id
        JOIN category c ON v.category_id = c.id
        LEFT JOIN video_views vi ON vi.video_id = v.id
        LEFT JOIN video_likes vl ON vl.video_id = v.id
        LEFT JOIN video_comments vc ON vc.video_id = v.id
        WHERE v.ispublic = true 
        AND v.category_id = $1
        ${excludeClause}
        GROUP BY v.id, u.id, c.id
        ORDER BY RANDOM()
        LIMIT $2;
    `;

    // Execute query
    const result = await db.query(query, queryParams);
    const videos = result.rows;

    // Update videoArray with fetched videos
    videoArray = [...videoArray, ...videos.map(v => v.video_id)];

    return res.status(200).json(new ApiResponse(200, { videoData: videos, videoArray }, "Videos fetched successfully"));
});

const videoUpload= AsyncHandler(async(req, res)=>{
    //make sure req.user is availabel
    if(!req.user) throw new ApiError(400, "Unauthorized access");
    const user_id =req.user?.id;

    //make sure that req.file is available
    if(!req.files) throw new ApiError(400, "Cant continue without files");
    //make sure req.body is fine
    const requiredFields = ["title", "description", "ispublic", "category_id", "duration_type", "child_safe"];
    const checkReqBody = await verifyBody(req.body, requiredFields, 6);

    //access details from req.body
    const {title, description, ispublic, category_id, duration_type, child_safe} = req.body;

    //upload video and thumbnail on cloudinary
    const mediaObject ={
        video_url: req.files?.video?.[0]?.path || null,
        thumbnail_url: req.files.thumbnail?.[0]?.path || null
    }

    if(mediaObject.video_url===null) throw new ApiError(400, "Video is required")
    
    const videoDbObject ={
        title,
        description,
        ispublic,
        category_id,
        duration_type,
        child_safe,
        user_id
    }


    //upload available media on cloudinary and save it in db
    for(let val in mediaObject){
        if(mediaObject[val] !== null){
            const uploadMedia = await uploadOnCloudinary(mediaObject[val]);
            if(!uploadMedia) throw new ApiError(400, "Internal server error")
            videoDbObject[val]=uploadMedia.url
        }
    }

    const returnData = {};
    //save data in db
    const saveData = await createQuery(db, "video", videoDbObject, ["video_url"]);
    if(saveData.rowsCount === 0) throw new ApiError(400, "internal server error")
    returnData.video_url= saveData.rows[0].video_url

    return res
    .status(200)
    .json(new ApiResponse(200, returnData, "Video uploaded successfully"))
});

const videoUpdate=AsyncHandler(async(req, res)=>{
    //only allow to update thumbnail_url, title, description, isPublic, category, child_safe

    //make sure req.user is available
    if(!req.user) throw new ApiError(400, "Unauthorized access");

    //make sure req.body is fine
    const requiredFields = ["video_id", "thumbnail_url", "title", "description", "ispublic", "category", "child_safe"]
    const checkReqBody = await verifyBody(req.body, requiredFields, null, req.files);

    const video_id =req.body.video_id;
    const user_id = req.user.id;
    const updatedData={}
    if(req.file){
        const savedThumbnail = await readQuery(db, "video", ["thumbnail_url"], {id:video_id,user_id});
        if(savedThumbnail.rowCount ===0) throw new ApiError(400, "Internal server error")
        const thumbnailUrl =savedThumbnail.rows[0].thumbnail_url; 
    
        const deleteThumbnail = await deleteFromCloudinary(thumbnailUrl);
        if(!deleteThumbnail) throw new ApiError(400, "Internal server error");

        const uploadThumbnail = await uploadOnCloudinary(req.file.path);
        if(!uploadThumbnail) throw new ApiError(400, "Internal server error");

        const updateThumbnail = await updateQuery(db, "video", {thumbnail_url:uploadThumbnail.url}, {id:video_id, user_id}, ["thumbnail_url"]);
        if(updateThumbnail.rowCount===0) throw new ApiError(400, "Internal server error")

        updatedData.thumbnail_url=updateThumbnail.rows[0].thumbnail_url
    }
    
    const bodyData ={};
    for(let val in req.body){
        if(val !== "video_id"){
            bodyData[val]=req.body[val]
        }
    }
    const bodyKeys =Object.keys(bodyData)
    
    const updateBodyData = await updateQuery(db, "video", bodyData, {id:video_id}, bodyKeys);
    const receivedUpdatedData = updateBodyData.rows[0]

    for(let val in receivedUpdatedData){
        updatedData[val]=receivedUpdatedData[val]
    }
    
    return res
    .status(200)
    .json(new ApiResponse(200, updatedData, "Updated data successfully"))
});

const videoDelete=AsyncHandler(async(req, res)=>{
    //make sure user is verified 
    if(!req.user) throw new ApiError(400, "Unauthorized access")

    const requiredFields=["video_id"];
    const checkReqBody = await verifyBody(req.body, requiredFields);

    const user_id = req.user.id;
    const id = req.body.video_id;

    const deleteVideo = await deleteQuery(db, "video", {id, user_id});
    
    if(deleteVideo.rowCount === 0) throw new ApiError(400, "Internal server error");

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "video deleted successfully"))
});

export {videoUpload,  videoUpdate, videoDelete, getVideos, searchVideos, getVideoByCategory}

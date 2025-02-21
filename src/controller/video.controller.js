import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {AsyncHandler} from "../utils/AsyncHandler.js"
import {verifyBody} from "../utils/ReqBodyVerifier.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/Cloudinary.js"
import {createQuery, readQuery, updateQuery, deleteQuery} from "pgcrudify"
import db from "../db/index.js"

const getVideos = AsyncHandler(async (req, res) => {
    //make sure req.body is fine
    const requiredFields = ["videoLimit","preference","videoArray", "child_safe"];
    const checkReqBody = await verifyBody(req.body, requiredFields);

    //get required data from req.body
    const limit = req.body.videoLimit || 20;
    const child_safe = req.body.child_safe || true;

   // Example videoArray containing IDs to exclude
   const videoArray = req.body.videoArray || []; // These video IDs will be excluded from the results

// Get user preferred categories from req.cookies.preference
const preference = req.body.preference || []
let filters = [`v.ispublic = true`, `v.child_safe = ${child_safe}`];

// Only add category filter if preferences are present
if (preference.length > 0) {
    const formattedCategories = preference
        .filter(cat => cat.trim() !== '')  // Filter out any empty strings
        .map(cat => `'${cat}'`)
        .join(', ');
    if (formattedCategories) {
        filters.push(`v.category IN (${formattedCategories})`);
    }
}

// Exclude videos whose IDs are in videoArray
if (videoArray.length > 0) {
    filters.push(`v.id NOT IN (${videoArray.join(', ')})`);
}

// Join all filters with AND
const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

// Final query
const query = `SELECT 
    v.id AS video_id, 
    v.video_url, 
    v.thumbnail_url, 
    v.title, 
    v.description, 
    v.duration_type, 
    v.created_at,
    v.category, 
    u.id AS uploader_id, 
    u.username AS uploader,
    COUNT(vi.id) AS views_count
    FROM video v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN video_views vi ON vi.video_id = v.id
    ${whereClause}
    GROUP BY v.id, u.id
    ORDER BY RANDOM()
    LIMIT ${limit};`;
    

    const getVideoDb = await db.query(query);
    
    const rowsCount = getVideoDb.rowCount;
    const rows = getVideoDb.rows;
    for(let val of rows){
        videoArray.push(val.video_id);
    }

    const data ={
        videoData:rows,
        videoArray
    }    
    return res
    .status(200)
    .json(new ApiResponse(200, data, "Video got successfully"))
});

const searchVideos = AsyncHandler(async (req, res) => {
    const requiredFields = ["searchTerm", "limit"];
    const { searchTerm, limit } = req.body;
    const checkReqBody = await verifyBody(req.body, requiredFields);

    if (!checkReqBody) {
        return res.status(400).json({ message: "Invalid request body" });
    }

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

    // Query to search for videos related to the search term
    const videoQuery = `
        SELECT 
            v.id AS video_id, 
            v.video_url, 
            v.thumbnail_url, 
            v.title, 
            v.description, 
            v.duration_type, 
            v.created_at, 
            u.id AS user_id, 
            u.username AS uploader,
            COUNT(vi.id) AS views
        FROM video v
        JOIN users u ON v.user_id = u.id
        LEFT JOIN video_views vi ON vi.video_id = v.id
        WHERE v.ispublic = true
        AND (
            v.title ILIKE $1 OR 
            v.description ILIKE $1 OR 
            v.category ILIKE $1
        )
        GROUP BY v.id, u.id
        ORDER BY v.created_at DESC
        LIMIT $2;
    `;
    const videoResult = await db.query(videoQuery, [searchValue, limit]);
    const videos = videoResult.rows;

    res.json({
        channels: channels,   // Return the most relevant channels
        videos: videos        // Return videos related to the search term
    });
});

const videoUpload= AsyncHandler(async(req, res)=>{
    //make sure req.user is availabel
    if(!req.user) throw new ApiError(400, "Unauthorized access");
    const user_id =req.user?.id;

    //make sure that req.file is available
    if(!req.files) throw new ApiError(400, "Cant continue without files");
    //make sure req.body is fine
    const requiredFields = ["title", "description", "ispublic", "category", "duration_type", "child_safe"];
    const checkReqBody = await verifyBody(req.body, requiredFields, 6);

    //access details from req.body
    const {title, description, ispublic, category, duration_type, child_safe} = req.body;

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
        category,
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

export {videoUpload,  videoUpdate, videoDelete, getVideos, searchVideos}

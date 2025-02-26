import {AsyncHandler} from "../utils/AsyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {createQuery,readQuery,updateQuery, deleteQuery} from "pgcrudify";
import {verifyBody} from "../utils/ReqBodyVerifier.js"
import db from "../db/index.js"

//to create playlist
const createPlayList = AsyncHandler(async(req, res)=>{
    //make user is verified
    if(!req.user) throw new ApiError(400, "unauthorized access");
    
    //make sure req.body is fine
    const requiredFields = ["title", "user_id", "ispublic"]
    const checkReqBody = await verifyBody(req.body, requiredFields, 3);

    const {title, user_id, ispublic}=req.body;

    const playlistObj = {
        title,
        user_id,
        ispublic
    }
    //create the playlist
    const newPlaylist = await createQuery(db, "playlist", playlistObj, ["id"]);
    if(newPlaylist.rowCount === 0) throw new ApiError(400, "something went wrong make sure all provided datas are correct");

    const id = newPlaylist.rows[0].id;
    return res
    .status(200)
    .json(new ApiResponse(200, {id}, "Successfully created playlist"))
})

//add video to playlist
const addPlaylistVideo = AsyncHandler(async (req, res) => {
    //Ensure user is authenticated
    if (!req.user) throw new ApiError(401, "Unauthorized access");

    //  Validate request body
    const requiredFields = ["playlist_id", "video_id"];
    const checkReqBody = await verifyBody(req.body, requiredFields);
    if (!checkReqBody) throw new ApiError(400, "Invalid request body");

    const { playlist_id, video_id, position } = req.body;
    const user_id = req.user.id; // Get logged-in user ID

    // Check if the playlist exists and belongs to the user
    const playlist = await db.query(
        "SELECT * FROM playlist WHERE id = $1 AND user_id = $2",
        [playlist_id, user_id]
    );
    if (playlist.rows.length === 0) throw new ApiError(404, "Playlist not found or unauthorized");

    // Check if the video exists
    const video = await db.query("SELECT * FROM video WHERE id = $1", [video_id]);
    if (video.rows.length === 0) throw new ApiError(404, "Video not found");

    // Get the highest position in the playlist
    const maxPositionResult = await db.query(
        "SELECT COALESCE(MAX(position), 0) + 1 AS next_position FROM playlist_videos WHERE playlist_id = $1",
        [playlist_id]
    );
    const nextPosition = maxPositionResult.rows[0].next_position;

    // Set position: If user provides a valid position, use it; otherwise, use the next available one
    const finalPosition = position && position > 0 ? position : nextPosition;

    // Shift videos down if inserting at a specific position
    await db.query(
        "UPDATE playlist_videos SET position = position + 1 WHERE playlist_id = $1 AND position >= $2",
        [playlist_id, finalPosition]
    );

    // Insert video into the playlist
    await db.query(
        "INSERT INTO playlist_videos (playlist_id, video_id, position) VALUES ($1, $2, $3)",
        [playlist_id, video_id, finalPosition]
    );

    res.status(201).json({ message: "Video added to playlist successfully", position: finalPosition });
});

//update title of playlist
const updatePlayListTitle = AsyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, "Unauthorized access");

    const requiredFields = ["playlist_id", "new_title"];
    const checkReqBody = await verifyBody(req.body, requiredFields, 2);

    const { playlist_id, new_title } = req.body;

    const condition = { id: playlist_id, user_id: req.user.id };
    const dataToUpdate = { title: new_title };

    const result = await updateQuery(db,"playlist", dataToUpdate, condition);

    if (result.rowCount === 0) {
        throw new ApiError(404, "Playlist not found or unauthorized");
    }

    return res.status(200).json(new ApiResponse(200, result.rows[0], "Playlist title updated successfully"));
});

//to delete video from playlist
const deleteVideo = AsyncHandler(async (req, res) => {
    //make sure req.user is available
    if(!req.user) throw new ApiError(400, "unauthorized access from");

    const requiredFields = ["playlist_id", "video_id"];
    const checkReqBody = await verifyBody(req.body, requiredFields, 2);

    const { playlist_id, video_id } = req.body;
    const user_id = req.user.id;

    //make sure playlist belongs to same user 
    const readPlaylist = await readQuery(db, "playlist", ["user_id"], {id:playlist_id});
    if(readPlaylist.rowCount === 0) throw new ApiError(400, "something went wrong make sure all provided datas are correct")
    const savedUserId = readPlaylist.rows[0].user_id;

    if(Number(user_id) !== Number(savedUserId)) throw new ApiError(400, "user dont have access to playlist");
   
    //delete video from playlist
    const deleteVideo = await deleteQuery(db, "playlist_videos", {playlist_id, video_id});
    if(deleteVideo.rowCount === 0) throw new ApiError(400, "somehing went wrong make sure all provided datas are correct");

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "video deleted from play list successFully"))
});

//to get all playlist of user
const getUserPlaylist = AsyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(400, "Unauthorized access");

    const user_id = req.user.id; // Get user ID from request

    // Fetch only playlist details
    const query = `
        SELECT 
            id AS playlist_id, 
            title AS playlist_title, 
            ispublic, 
            created_at, 
            updated_at
        FROM playlist
        WHERE user_id = $1;
    `;

    const { rows } = await db.query(query, [user_id]);

    res.status(200).json({ message: "Playlists retrieved successfully", data: rows });
});

//to delete specified playlist of user
const deletePlaylist = AsyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(400, "Unauthorized access");

    const user_id = req.user.id;
    const { playlist_id } = req.body;

    if (!playlist_id) throw new ApiError(400, "Playlist ID is required");

    // Check if the playlist belongs to the user
    const checkQuery = `SELECT id FROM playlist WHERE id = $1 AND user_id = $2`;
    const checkResult = await db.query(checkQuery, [playlist_id, user_id]);

    if (checkResult.rowCount === 0) {
        throw new ApiError(404, "Playlist not found or does not belong to user");
    }

    // Delete the playlist and its associated videos
    const deleteQuery = `DELETE FROM playlist WHERE id = $1`;
    await db.query(deleteQuery, [playlist_id]);

    res.status(200).json({ message: "Playlist deleted successfully" });
});

const getSpecific = AsyncHandler(async (req, res) => {
    const { playlist_id } = req.body;

    if (!playlist_id) throw new ApiError(400, "Playlist ID is required");

    // Query to get playlist details along with its videos (if any)
    const query = `
        SELECT 
            p.id AS playlist_id, 
            p.title AS playlist_title,
            p.ispublic,
            p.created_at,
            p.updated_at,
            p.user_id AS owner_id,
            u.username AS owner_username,
            u.avatar AS owner_avatar,
            COALESCE(
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'video_id', v.id,
                        'title', v.title,
                        'thumbnail', v.thumbnail_url,
                        'duration', v.duration_type,
                        'position', pv.position,
                        'uploader_id', v.user_id,
                        'uploader_username', vu.username,
                        'uploader_avatar', vu.avatar,
                        'total_likes', COALESCE(vl.total_likes, 0),
                        'total_comments', COALESCE(vc.total_comments, 0),
                        'total_views', COALESCE(vw.total_views, 0)
                    ) ORDER BY pv.position
                ) FILTER (WHERE v.id IS NOT NULL), '[]' -- Ensure empty array if no videos
            ) AS videos
        FROM playlist p
        INNER JOIN users u ON p.user_id = u.id -- Playlist owner details
        LEFT JOIN playlist_videos pv ON p.id = pv.playlist_id
        LEFT JOIN video v ON pv.video_id = v.id
        LEFT JOIN users vu ON v.user_id = vu.id -- Video uploader details
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
        ) vw ON v.id = vw.video_id
        WHERE p.id = $1
        GROUP BY p.id, p.title, p.ispublic, p.created_at, p.updated_at, p.user_id, u.username, u.avatar;
    `;

    const { rows } = await db.query(query, [playlist_id]);

    // Check if playlist exists
    if (rows.length === 0) throw new ApiError(404, "Playlist not found");

    const playlist = rows[0];

    // If playlist is private, verify user ownership
    if (!playlist.ispublic) {
        if (!req.user || req.user.id !== playlist.owner_id) {
            throw new ApiError(403, "Unauthorized access");
        }
    }

    res.status(200).json({ message: "Playlist retrieved successfully", data: playlist });
});

export {createPlayList, addPlaylistVideo, updatePlayListTitle, deleteVideo, getUserPlaylist, deletePlaylist, getSpecific}
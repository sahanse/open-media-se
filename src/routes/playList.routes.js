import {Router} from "express"
import {verifyUser} from "../middlewares/auth.middleware.js"
import {createPlayList, addPlaylistVideo, deleteVideo, updatePlayListTitle, deletePlaylist, getUserPlaylist, getSpecific} from "../controller/playList.controller.js"

const router = Router();

router.route("/create").post(verifyUser, createPlayList);
router.route("/add").post(verifyUser, addPlaylistVideo);
router.route("/deleteVideo").delete(verifyUser, deleteVideo);
router.route("/updateTitle").patch(verifyUser, updatePlayListTitle);
router.route("/delete").delete(verifyUser, deletePlaylist)
router.route("/getUserPlaylist").get(verifyUser, getUserPlaylist);
router.route("/get-specific").get(verifyUser, getSpecific)

export default router;
import {Router} from "express"
import {videoUpload, videoDelete, videoUpdate, playVideo} from "../controller/video.controller.js"
import {upload} from "../middlewares/multer.middleware.js"
import {verifyUser} from "../middlewares/auth.middleware.js"

const router=Router();

router.route("/play").get(playVideo)

//secured routes
router.route("/upload").post(verifyUser,videoUpload)
router.route("/delete").post(verifyUser,videoDelete)
router.route("/update").post(verifyUser,videoUpdate)

export default router
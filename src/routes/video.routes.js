import {Router} from "express"
import {videoUpload, videoDelete, videoUpdate, getVideos} from "../controller/video.controller.js"
import {upload} from "../middlewares/multer.middleware.js"
import {verifyUser} from "../middlewares/auth.middleware.js"

const router=Router();

router.route("/videos").get(getVideos)

//secured routes
router.route("/upload").post(verifyUser,upload.fields([
    {
        name:"video",
        maxCount:1
    },
    {
        name:"thumbnail",
        maxCount:1
    }
]),videoUpload);
router.route("/delete").post(verifyUser,videoDelete)
router.route("/update").post(verifyUser,upload.single("thumbnail"),videoUpdate)

export default router
import {Router} from "express"
import {videoUpload, videoDelete, videoUpdate, getVideos, searchVideos, getVideoByCategory} from "../controller/video.controller.js"
import {upload} from "../middlewares/multer.middleware.js"
import {verifyUser} from "../middlewares/auth.middleware.js"

const router=Router();

router.route("/videos").get(getVideos)
router.route("/search").get(searchVideos)
router.route("/category").get(getVideoByCategory)
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
router.route("/delete").delete(verifyUser,videoDelete)
router.route("/update").patch(verifyUser,upload.single("thumbnail"),videoUpdate)

export default router
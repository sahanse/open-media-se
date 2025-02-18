import {Router} from "express"
import {verifyUser} from "../middlewares/auth.middleware.js"
import {postLike,videoLike} from "../controller/likes.controller.js"

const router = Router();

router.route("/post").post(verifyUser, postLike);
router.route("/video").post(verifyUser, videoLike)

export default router;
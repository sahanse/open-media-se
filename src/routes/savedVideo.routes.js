import {Router} from "express"
import {verifyUser} from "../middlewares/auth.middleware.js"
import {addVideo, deleteVideo, getAll} from "../controller/savedVideo.controller.js"

const router = Router();

router.route("/add").post(verifyUser, addVideo);
router.route("/delete").delete(verifyUser, deleteVideo);
router.route("/getAll").get(verifyUser, getAll);

export default router;
import {Router} from "express"
import {verifyUser} from "../middlewares/auth.middleware.js"
import {addPost, deletePost, getAll} from "../controller/savedPost.controller.js"

const router = Router();

router.route("/add").post(verifyUser, addPost);
router.route("/delete").delete(verifyUser, deletePost);
router.route("/getAll").get(verifyUser, getAll)

export default router;

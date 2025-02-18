import {Router} from "express"
import {verifyUser} from "../middlewares/auth.middleware.js"
import {addComment, updateComment, deleteComment, getComment} from "../controller/comment.controller.js"

const router = Router();

router.route("/add").post(verifyUser, addComment);
router.route("/update").patch(verifyUser, updateComment);
router.route("/delete").delete(verifyUser, deleteComment);
router.route("/get").get(verifyUser, getComment);

export default router;
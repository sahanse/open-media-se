import {Router} from "express"
import {createPost, updatePost, deletePost, getPost, searchPost} from "../controller/post.controller.js";
import {verifyUser} from "../middlewares/auth.middleware.js"
import {upload} from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/createPost").post(verifyUser,upload.array('images', 10),createPost);
router.route("/deletePost").delete(verifyUser, deletePost);
router.route("/updatePost").patch(verifyUser, updatePost);
router.route("/getPosts").get(getPost);
router.route("/search-post").get(verifyUser, searchPost);

export default router;

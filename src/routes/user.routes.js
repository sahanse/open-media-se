import { Router } from "express";
import {userRegister, userLogin, userLogout} from  "../controllers/user.controller.js"
import {upload} from "../middlewares/multer.middleware.js"

const router=Router()

router.route("/register").post(upload.fields([
    {
        name:"avatar",
        maxCount:1
    },
    {
        name:"coverimage",
        maxCount:1
    }
]),userRegister)
router.route("/login").post(userLogin)

//protected routes
router.route("/logout").post(userLogout)

export default router;
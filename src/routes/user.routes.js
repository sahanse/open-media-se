import { Router } from "express";
import {
    userRegister, 
    userLogin, 
    userLogout, 
    refreshAccessToken, 
    updateInfo, 
    updateSensitive,
    generateOtp,
    verifyOtp,
    resetPass,
    deleteUser
} from "../controller/user.controller.js"

import {upload} from "../middlewares/multer.middleware.js"
import {verifyUser, verifyAuthRoute, verifyOtpToken, verifyPassword} from "../middlewares/auth.middleware.js"

const router= Router()

router.route("/register").post(verifyAuthRoute, upload.fields([
    {
        name:"avatar",
        maxCount:1
    },
    {
        name:"coverImage",
        maxCount:1
    }
]), userRegister)

router.route("/login").post(verifyAuthRoute,userLogin)

//secured routes
router.route("/logout").post(verifyUser,userLogout)

router.route("/refresh-token").post(refreshAccessToken)

router.route("/update-info").patch(verifyUser,upload.fields([
    {
        name:"avatar",
        maxCount:1
    },
    {
        name:"coverImage",
        maxCount:1
    }
]),updateInfo)

router.route("/update-sensitive").patch(verifyUser,verifyPassword,updateSensitive)

router.route("/generate-otp").get(verifyUser,generateOtp)

router.route("/verify-otp").post(verifyUser, verifyOtp)

router.route("/reset-pass").post(verifyUser, verifyOtpToken, resetPass)

router.route("/delete-user").delete(verifyUser, verifyOtpToken, deleteUser)

export default router

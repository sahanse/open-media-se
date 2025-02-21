import {Router} from "express"
import {verifySuperUser} from "../middlewares/auth.middleware.js"
import {register, login, deleteAdmin, generateOtp} from "../controller/admin.controller.js"

const router = Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/delete").delete(verifySuperUser, deleteAdmin);
router.route("/getOtp").get(generateOtp);

export default router;
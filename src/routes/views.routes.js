import {Router} from "express"
import {addViews, viewsHistory} from "../controller/views.controller.js"
import {verifyView, verifyUser} from "../middlewares/auth.middleware.js"

const router = Router();

router.route("/add").post(verifyView, addViews);
router.route("/getHistory").get(verifyUser, viewsHistory);

export default router;
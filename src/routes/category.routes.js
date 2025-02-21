import {Router} from "express"
import {verifySuperUser} from "../middlewares/auth.middleware.js"
import {addCategory, deleteCategory, updateCategory, getCategory} from "../controller/category.controller.js"

const router = Router();

router.route("/add").post(verifySuperUser, addCategory);
router.route("/delete").delete(verifySuperUser,deleteCategory);
router.route("/update").patch(verifySuperUser, updateCategory);
router.route("/get").get(getCategory);

export default router;
import { Router } from "express";
import * as controller from "./auth.controller.js";
import { authenticate } from "../../common/middleware/auth.middleware.js";

const router = Router();

router.post("/register", controller.register);
router.post("/login", controller.login);
router.get("/me", authenticate, controller.getMe);

export default router;

import { Router } from "express";
import { signup, login, logout, refresh, me } from "./auth.controller";
import { authRateLimit } from "../../middleware/rateLimit";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.post("/signup", authRateLimit, signup);
router.post("/login", authRateLimit, login);

router.post("/logout", authenticate, logout);
router.post("/refresh", refresh);

router.get("/me", authenticate, me);

export default router;

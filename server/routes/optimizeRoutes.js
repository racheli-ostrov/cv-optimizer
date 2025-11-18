import express from "express";
import multer from "multer";
import { optimizeCV } from "../controllers/optimizeController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/optimize-for-job", upload.single("cv"), optimizeCV);

export default router;

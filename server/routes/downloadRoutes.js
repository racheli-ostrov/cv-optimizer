import express from "express";
import { downloadPDF } from "../controllers/downloadController.js";

const router = express.Router();

router.get("/download/:filename", downloadPDF);

export default router;

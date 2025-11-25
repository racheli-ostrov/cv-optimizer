import express from "express";
import { downloadImprovedPDF, downloadGeneratedFile } from "../controllers/downloadController.js";

const router = express.Router();

router.get("/download/:filename", downloadGeneratedFile);

router.post("/download-improved-pdf", downloadImprovedPDF);

export default router;
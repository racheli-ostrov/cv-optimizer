// import express from "express";
// import { downloadImprovedPDF } from "../controllers/downloadController.js";

// const router = express.Router();

// router.get("/download/:filename", downloadImprovedPDF);

// export default router;
import express from "express";
import { downloadImprovedPDF, downloadGeneratedFile } from "../controllers/downloadController.js";

const router = express.Router();

// Match client behavior: serve previously-generated file by filename
router.get("/download/:filename", downloadGeneratedFile);

// Keep the POST endpoint that creates and immediately returns a generated PDF
router.post("/download-improved-pdf", downloadImprovedPDF);

export default router;
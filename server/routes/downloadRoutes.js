// import express from "express";
// import { downloadImprovedPDF } from "../controllers/downloadController.js";

// const router = express.Router();

// router.get("/download/:filename", downloadImprovedPDF);

// export default router;
import express from "express";
import { downloadImprovedPDF } from "../controllers/downloadController.js";

const router = express.Router();

router.post("/download-improved-pdf", downloadImprovedPDF);


export default router;
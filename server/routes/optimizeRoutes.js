import express from "express";
import multer from "multer";
import { optimizeCV } from "../controllers/optimizeController.js";

const router = express.Router();
const upload = multer({ 
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf", 
      "application/msword", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("נא להעלות קובץ Word או PDF בלבד"), false);
    }
    cb(null, true);
  }
});


router.post("/optimize-for-job", upload.single("cv"), optimizeCV);

export default router;

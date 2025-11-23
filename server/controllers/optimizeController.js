import fs from "fs";
import path from "path";
import { optimizeCVService } from "../services/pdfService.js";

export const optimizeCV = async (req, res) => {
  try {
    console.log("Optimize request received:", req.method, req.originalUrl);
    console.log("Content-Type:", req.headers["content-type"]);
    console.log("Body keys:", Object.keys(req.body || {}));
    console.log("File:", req.file ? { originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size } : null);

    const jobDescription = (req.body.jobDescription || "").toString();

    if (!req.file) return res.status(400).json({ error: "No CV uploaded" });

    const fileBuffer = fs.readFileSync(req.file.path);
    const base64CV = fileBuffer.toString("base64");

    // Pass original filename and mimetype so service can choose extraction method
    const improvedPDFBuffer = await optimizeCVService(base64CV, jobDescription, req.file.originalname, req.file.mimetype);

    const outputDir = path.join(process.cwd(), "generated");
    fs.mkdirSync(outputDir, { recursive: true });

    const outputFileName = `optimized-${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, outputFileName);

    fs.writeFileSync(outputPath, improvedPDFBuffer);

    // remove temp uploaded file
    try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }

    // return filename for client to download
    res.json({ filename: outputFileName });
  } catch (err) {
    console.error("optimizeCV error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

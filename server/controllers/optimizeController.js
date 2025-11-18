import fs from "fs";
import path from "path";
import { optimizeCVService } from "../services/pdfService.js";

export const optimizeCV = async (req, res) => {
  try {
    console.log('Optimize request received:', req.method, req.originalUrl);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body keys:', Object.keys(req.body || {}));
    console.log('File:', req.file ? { originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size } : null);
    const { jobDescription } = req.body;
    if (!req.file) return res.status(400).json({ error: "No CV uploaded" });
    if (!jobDescription) return res.status(400).json({ error: "Job description missing" });

    const base64CV = fs.readFileSync(req.file.path).toString("base64");

    const { improvedContent, analysis } = await optimizeCVService(base64CV, jobDescription);

    const outputFileName = `optimized-${Date.now()}.pdf`;
    const outputPath = path.join("generated", outputFileName);
    // Ensure generated directory exists
    try {
      fs.mkdirSync(path.join(process.cwd(), "generated"), { recursive: true });
    } catch (e) {
      // ignore
    }

    fs.writeFileSync(outputPath, improvedContent);
    fs.unlinkSync(req.file.path);

    res.json({ analysis, filename: outputFileName });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

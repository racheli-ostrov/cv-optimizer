import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import dotenv from "dotenv";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

const client = new GoogleGenAI({ apiKey: process.env.API_KEY });

const pdfToBase64 = (filePath) => {
  const fileData = fs.readFileSync(filePath);
  return Buffer.from(fileData).toString("base64");
};

const createPDF = (outputPath, content) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    doc.font("Times-Roman").text(content, { align: "left" });
    doc.end();
    stream.on("finish", () => resolve());
    stream.on("error", (err) => reject(err));
  });
};

app.post("/api/optimize-for-job", upload.single("cv"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No CV uploaded" });

    // read CV and convert to base64 (used in prompt)
    const base64CV = pdfToBase64(req.file.path);

    // Prompt requests only improvement suggestions (each on its own line).
    const prompt = `
You are an expert resume reviewer and career coach.
Task: Read the candidate resume (base64) and return improvement suggestions only.
Output requirements:
- Respond ONLY with improvement suggestions in Hebrew, each suggestion on its own line.
- Do not invent experience.
- At the end include one compliment sentence about the effort invested.
Resume (base64): ${base64CV}
`;

    // call Gemeni model (choose an available model from list; change if needed)
    const aiResponse = await client.models.generateContent({
      model: "models/gemini-2.5-pro",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    // robust extraction of text from different SDK response shapes
    const aiOutput =
      // candidates -> content -> text (common)
      aiResponse?.candidates?.[0]?.content?.[0]?.text ||
      // older SDK shape
      aiResponse?.outputText ||
      // fallback to stringifying the whole response
      (typeof aiResponse === "string" ? aiResponse : JSON.stringify(aiResponse));

    // parse lines into suggestions array (clean bullets/numbers)
    let parsedOutput = { suggestions: [] };
    if (aiOutput && typeof aiOutput === "string") {
      const lines = aiOutput
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      // try to keep the compliment as the last line if it's not an item
      parsedOutput.suggestions = lines.map((line) =>
        line.replace(/^[•\-\*\d\.\)\s]+/, "").trim()
      );
    } else {
      parsedOutput = { suggestions: ["לא הצלחתי לנתח את קורות החיים."] };
    }

    // cleanup uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      console.warn("Could not delete uploaded file:", e?.message || e);
    }

    return res.json({ analysis: parsedOutput });
  } catch (err) {
    // log full error locally for debugging
    console.error("Error in /api/optimize-for-job:", err);

    // build friendly message for client
    const status = err?.status || err?.code || 500;
    let message = err?.message || "Internal server error";
    if (err?.error) message = typeof err.error === "string" ? err.error : JSON.stringify(err.error);

    // return useful info for debugging (no stack in production)
    return res.status(status).json({
      error: message,
      stack: process.env.NODE_ENV === "production" ? undefined : err?.stack,
    });
  }
});

app.get("/api/download/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join("generated", filename);

  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  res.download(filePath, filename, (err) => {
    if (err) {
      console.error(err);
    } else {
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error(unlinkErr);
      });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
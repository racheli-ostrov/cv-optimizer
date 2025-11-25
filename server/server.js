import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { downloadImprovedPDF } from "./controllers/downloadController.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.post("/api/download-improved-pdf", downloadImprovedPDF);

const upload = multer({ dest: "uploads/" });

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const pdfToBase64 = (filePath) => {
  const fileData = fs.readFileSync(filePath);
  return Buffer.from(fileData).toString("base64");
};

const extractPlainTextFromBase64 = (base64, maxChars = 30000) => {
  try {
    const decoded = Buffer.from(base64, "base64").toString("utf8");
    const cleaned = decoded.replace(/\s+/g, " ").trim();
    if (!cleaned) {
      return base64.slice(0, maxChars);
    }
    return cleaned.length > maxChars ? cleaned.slice(0, maxChars) + "\n...(truncated)" : cleaned;
  } catch (e) {
    return base64.slice(0, maxChars);
  }
};

async function generateWithRetries(payload, attempts = 4, baseDelay = 700) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await client.models.generateContent(payload);
    } catch (err) {
      const status = err?.status || err?.code || 0;
      if (![429, 503].includes(status)) throw err;
      if (i === attempts - 1) throw err;
      const jitter = Math.random() * 300;
      const wait = baseDelay * Math.pow(2, i) + jitter;
      console.warn(`Attempt ${i + 1} failed with status ${status}, retrying in ${Math.round(wait)}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

app.post("/api/optimize-for-job", upload.single("cv"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No CV uploaded" });

    const base64CV = pdfToBase64(req.file.path);

    const extractedText = extractPlainTextFromBase64(base64CV, 30000);

    const modelName = process.env.MODEL_NAME || "gemini-2.5-flash";

    const prompt = `
You are a professional resume writer and CV auditor. Output JSON only, with two keys:
{
  "suggestions": ["short bullet 1", "short bullet 2", ...],   // max 6 bullets, Hebrew preferred
  "improvedResume": "The improved resume text (English or Hebrew as requested)"
}

Requirements:
- Read the following extracted resume text (it may be truncated). Use it to produce up to 6 concise actionable improvement bullets (Hebrew preferred).
- Also produce a clean, professional improved resume text (no extra commentary). Do NOT invent work experience that doesn't exist; if details are missing, use neutral phrasing.
- Output JSON only, no extra explanation, no markdown.
- Resume text to analyze:
"""${extractedText}"""
- Job description (if provided): "${(req.body.jobDescription || "").toString().slice(0, 2000)}"
`;

    const payload = {
      model: modelName,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    const aiResponse = await generateWithRetries(payload);

    let aiText = "";
    try {
      aiText =
        aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text ||
        aiResponse?.candidates?.[0]?.content?.[0]?.text ||
        aiResponse?.outputText ||
        aiResponse?.text ||
        (typeof aiResponse === "string" ? aiResponse : "");
    } catch {
      aiText = "";
    }

    let parsed = { suggestions: [], improvedResume: "" };
    if (aiText) {
      const jsonMatch = aiText.match(/(\{[\s\S]*\})/);
      let jsonString = jsonMatch ? jsonMatch[1] : aiText;

      try {
        parsed = JSON.parse(jsonString);
      } catch (e) {
        const lines = aiText.split("\n").map((l) => l.trim()).filter(Boolean);

        const bullets = [];
        let resumeLines = [];
        let inResume = false;
        for (const line of lines) {
          if (!inResume && /(Professional|נסיון|ניסיון|Summary|Experience|Education)/i.test(line)) {
            inResume = true;
            resumeLines.push(line);
            continue;
          }
          if (!inResume) {
            bullets.push(line.replace(/^[\-\•\*\d\.\)\s]+/, "").trim());
          } else {
            resumeLines.push(line);
          }
        }
        parsed.suggestions = bullets.slice(0, 6);
        parsed.improvedResume = resumeLines.join("\n").trim();
      }
    } else {
      parsed.suggestions = ["לא התקבלה תשובה מהמודל."];
      parsed.improvedResume = "";
    }
   
    try { fs.unlinkSync(req.file.path); } catch (_) {}

    return res.json({
      analysis: {
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      },
      improvedResume: parsed.improvedResume || ""
    });

  } catch (err) {
    console.error("optimize-for-job error:", err);
    const status = err?.status || err?.code || 500;
    return res.status(status).json({ error: err?.message || "Internal server error" });
  }
});
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
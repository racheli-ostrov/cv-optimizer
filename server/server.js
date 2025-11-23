// import express from "express";
// import multer from "multer";
// import fs from "fs";
// import path from "path";
// import PDFDocument from "pdfkit";
// import dotenv from "dotenv";
// import cors from "cors";
// import { GoogleGenAI } from "@google/genai";
// import { downloadImprovedPDF } from "./controllers/downloadController.js";

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// app.use(cors());
// app.use(express.json());
// app.post("/api/download-improved-pdf", downloadImprovedPDF);


// const upload = multer({ dest: "uploads/" });
// const client = new GoogleGenAI({ apiKey: process.env.API_KEY });

// // helper: convert uploaded file to base64 string
// const pdfToBase64 = (filePath) => {
//   const fileData = fs.readFileSync(filePath);
//   return Buffer.from(fileData).toString("base64");
// };

// async function generateWithRetries(payload, attempts = 5, baseDelay = 1000) {
//   for (let i = 0; i < attempts; i++) {
//     try {
//       return await client.models.generateContent(payload);
//     } catch (err) {
//       const status = err?.status || err?.code || 0;

//       // רק במקרה של 429 או 503 ננסה שוב
//       if (![429, 503].includes(status)) throw err;

//       if (i === attempts - 1) {
//         throw err; // אם הגענו למספר מקסימום ניסיונות, נזרוק את השגיאה
//       }

//       // חישוב זמן המתנה עם exponential backoff + jitter
//       const jitter = Math.random() * 500; // 0–500ms רנדומלי
//       const wait = baseDelay * Math.pow(2, i) + jitter;

//       console.warn(
//         `Attempt ${i + 1} failed with status ${status}, retrying after ${Math.round(wait)}ms`
//       );
//       await new Promise((r) => setTimeout(r, wait));
//     }
//   }
// }


// app.post("/api/optimize-for-job", upload.single("cv"), async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ error: "No CV uploaded" });

//     const base64CV = pdfToBase64(req.file.path);

//     const prompt = `
// את/ה יועץ/ת קריירה ומומחה/ית קורות חיים.
// משימה: קרא/י את קורות החיים המצורפים (base64) והצג/י רק המלצות לשיפור בעברית, כל המלצה בשורה נפרדת.
// אל תמציא/י ניסיון שאינו קיים. בסיום הוסף/י משפט מחמיא אחד על ההשקעה.
// קורות חיים (base64): ${base64CV}
//     `;

//     const modelName = process.env.MODEL_NAME || "models/gemini-2.5-flash" ||"models/gemini-2.0-flash"|| "Gemini 2.0 Flash-Lite" || "Gemini 1.5 Pro";
//     const payload = {
//       model: modelName,
//       contents: [{ role: "user", parts: [{ text: prompt }] }],
//     };

//     const aiResponse = await generateWithRetries(payload);

//     let aiOutput = "";

//     try {
//       aiOutput =
//         aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text ||
//         aiResponse?.candidates?.[0]?.content?.[0]?.text ||
//         aiResponse?.outputText ||
//         aiResponse?.text ||
//         (typeof aiResponse === "string" ? aiResponse : "");
//     } catch {
//       aiOutput = "";
//     }

// if ((!aiOutput || aiOutput.length < 2) && aiResponse?.candidates?.[0]?.content) {
//   const content = aiResponse.candidates[0].content;

//   // אם יש parts
//   if (Array.isArray(content.parts)) {
//     const allTexts = content.parts
//       .filter((p) => p?.text)
//       .map((p) => p.text);
//     aiOutput = allTexts.join("\n");
//   }
// }

//     const parsedOutput = { suggestions: [], compliment: "", score: 0 };

//     if (aiOutput && typeof aiOutput === "string") {
//       const lines = aiOutput
//         .split("\n")
//         .map((l) => l.trim())
//         .filter((l) => l.length > 0);

//       const complimentKeywords = ["ניכרת", "מצוין", "מעולה", "מחמיא", "השקעה", "כל הכבוד", "מצוינים"];
//       const lastLine = lines[lines.length - 1] || "";
//       if (complimentKeywords.some((k) => lastLine.includes(k))) {
//         parsedOutput.compliment = lastLine;
//         lines.pop();
//       }

//       parsedOutput.suggestions = lines
//         .map((line) => line.replace(/^[•\-\*\d\.\)\s]+/, "").trim())
//         .filter((l) => l.length > 0);
//     } else {
//       parsedOutput.suggestions = ["לא הצלחתי לנתח את קורות החיים."];
//     }

//     function suggestionSeverityMultiplier(text) {
//       const high = ["חובה", "הכרחי", "חסר", "צריך", "חסרה", "להוסיף"];
//       const medium = ["מומלץ", "כדאי", "עדיף", "מוטב"];
//       const low = ["לשפר", "לחדד", "לנסח", "להבהיר"];

//       const t = text.toLowerCase();
//       if (high.some((w) => t.includes(w))) return 1.5;
//       if (medium.some((w) => t.includes(w))) return 1.2;
//       if (low.some((w) => t.includes(w))) return 0.9;
//       return 1.0;
//     }

//     function calculateCVScoreEnhanced(suggestions, compliment) {
//       const maxPoints = 100;
//       const baseDeductionPerSuggestion = 8;
//       let totalDeduction = 0;

//       for (const s of suggestions) {
//         const lengthFactor = Math.min(5, Math.floor(s.length / 100));
//         const severity = suggestionSeverityMultiplier(s);
//         const deduction = Math.round(baseDeductionPerSuggestion * severity + lengthFactor);
//         totalDeduction += deduction;
//       }

//       let bonus = 0;
//       if (compliment && compliment.length > 5) bonus += 5;
//       if (suggestions.length === 0) bonus = 20;

//       let score = Math.max(0, maxPoints - totalDeduction + bonus);
//       if (score > 100) score = 100;
//       if (score < 0) score = 0;
//       return Math.round(score);
//     }

//     parsedOutput.score = calculateCVScoreEnhanced(parsedOutput.suggestions, parsedOutput.compliment);
// if (parsedOutput.score >= 0 && parsedOutput.score <= 2) {
//   parsedOutput.compliment += (parsedOutput.compliment ? " " : "") + "יש גרוע יותר";
// } else if (parsedOutput.score >= 3 && parsedOutput.score <= 39) {
//   parsedOutput.compliment += (parsedOutput.compliment ? " " : "") + "אפשר לשפר";
// } else if (parsedOutput.score >= 40 && parsedOutput.score <= 69) {
//   parsedOutput.compliment += (parsedOutput.compliment ? " " : "") + "לא רע, אבל יש מה לשפר";
// } else if (parsedOutput.score >= 70 && parsedOutput.score <= 89) {
//   parsedOutput.compliment += (parsedOutput.compliment ? " " : "") + "טוב מאוד!";
// } else if (parsedOutput.score >= 90 && parsedOutput.score <= 100) {
//   parsedOutput.compliment += (parsedOutput.compliment ? " " : "") + "מצוין!";
// }
//     try { fs.unlinkSync(req.file.path); } catch (e) { console.warn(e?.message || e); }

//     return res.json({ analysis: parsedOutput });
//   } catch (err) {
//     console.error(err);
//     const status = err?.status || err?.code || 500;
//     let message = err?.message || "Internal server error";
//     if (err?.error) message = typeof err.error === "string" ? err.error : JSON.stringify(err.error);

//     return res.status(status).json({
//       error: message,
//       stack: process.env.NODE_ENV === "production" ? undefined : err?.stack,
//     });
//   }
// });

// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// server.js (optimized - single fast call + JSON output)
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
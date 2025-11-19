// import express from "express";
// import multer from "multer";
// import fs from "fs";
// import path from "path";
// import PDFDocument from "pdfkit";
// import dotenv from "dotenv";
// import cors from "cors";
// import { GoogleGenAI } from "@google/genai";

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// app.use(cors());
// app.use(express.json());

// const upload = multer({ dest: "uploads/" });
// const client = new GoogleGenAI({ apiKey: process.env.API_KEY });

// // helper: convert uploaded file to base64 string
// const pdfToBase64 = (filePath) => {
//   const fileData = fs.readFileSync(filePath);
//   return Buffer.from(fileData).toString("base64");
// };

// const createPDF = (outputPath, content) => {
//   return new Promise((resolve, reject) => {
//     const doc = new PDFDocument({ size: "A4", margin: 50 });
//     const stream = fs.createWriteStream(outputPath);
//     doc.pipe(stream);
//     doc.font("Times-Roman").text(content, { align: "left" });
//     doc.end();
//     stream.on("finish", () => resolve());
//     stream.on("error", (err) => reject(err));
//   });
// };

// // retry wrapper with exponential backoff for transient 429/503
// async function generateWithRetries(payload, attempts = 4, baseDelay = 1000) {
//   for (let i = 0; i < attempts; i++) {
//     try {
//       return await client.models.generateContent(payload);
//     } catch (err) {
//       const status = err?.status || err?.code || 0;
//       // only retry on 429/503
//       if (i === attempts - 1 || ![429, 503].includes(status)) throw err;
//       const wait = baseDelay * Math.pow(2, i);
//       console.warn(
//         `generateWithRetries: attempt ${i + 1} failed (status ${status}), retrying after ${wait}ms`
//       );
//       await new Promise((r) => setTimeout(r, wait));
//     }
//   }
// }

// app.post("/api/optimize-for-job", upload.single("cv"), async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ error: "No CV uploaded" });

//     // convert file to base64 for prompt (keeps prompt compact; consider sending extracted text instead)
//     const base64CV = pdfToBase64(req.file.path);

//     const prompt = `
// את/ה יועץ/ת קריירה ומומחה/ית קורות חיים.
// משימה: קרא/י את קורות החיים המצורפים (base64) והצג/י רק המלצות לשיפור בעברית, כל המלצה בשורה נפרדת.
// אל תמציא/י ניסיון שאינו קיים. בסיום הוסף/י משפט מחמיא אחד על ההשקעה.
// קורות חיים (base64): ${base64CV}
//     `;

//     const modelName = process.env.MODEL_NAME || "models/gemini-2.0-flash";
//     const payload = {
//       model: modelName,
//       contents: [{ role: "user", parts: [{ text: prompt }] }],
//     };

//     // call model with retries for transient errors
//     const aiResponse = await generateWithRetries(payload);

//     // ------- CLEAN & SAFE EXTRACTION -------
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

//     // fallback: collect all parts if single field empty
//     if ((!aiOutput || aiOutput.length < 2) && aiResponse?.candidates?.[0]?.content) {
//       const allParts =
//         aiResponse?.candidates?.[0]?.content
//           .flatMap((c) =>
//             (c.parts || [])
//               .filter((p) => p && p.text)
//               .map((p) => p.text)
//           ) || [];
//       aiOutput = allParts.join("\n");
//     }

//     // ------- PARSE SUGGESTIONS + ENHANCED SCORE -------
//     const parsedOutput = { suggestions: [], compliment: "", score: 0 };

//     if (aiOutput && typeof aiOutput === "string") {
//       const lines = aiOutput
//         .split("\n")
//         .map((l) => l.trim())
//         .filter((l) => l.length > 0);

//       // detect compliment-like last line
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

//     // severity multiplier by keywords
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

//     // enhanced scoring
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

//     // remove uploaded file
//     try {
//       fs.unlinkSync(req.file.path);
//     } catch (e) {
//       console.warn("Could not delete uploaded file:", e?.message || e);
//     }

//     return res.json({ analysis: parsedOutput });
//   } catch (err) {
//     console.error("Error in /api/optimize-for-job:", err);

//     const status = err?.status || err?.code || 500;
//     let message = err?.message || "Internal server error";
//     if (err?.error) {
//       message = typeof err.error === "string" ? err.error : JSON.stringify(err.error);
//     }

//     return res.status(status).json({
//       error: message,
//       stack: process.env.NODE_ENV === "production" ? undefined : err?.stack,
//     });
//   }
// });

// app.get("/api/download/:filename", (req, res) => {
//   const { filename } = req.params;
//   const filePath = path.join("generated", filename);

//   if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });

//   res.setHeader("Content-Type", "application/pdf");
//   res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

//   res.download(filePath, filename, (err) => {
//     if (err) {
//       console.error(err);
//     } else {
//       fs.unlink(filePath, (unlinkErr) => {
//         if (unlinkErr) console.error(unlinkErr);
//       });
//     }
//   });
// });

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
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

// helper: convert uploaded file to base64 string
const pdfToBase64 = (filePath) => {
  const fileData = fs.readFileSync(filePath);
  return Buffer.from(fileData).toString("base64");
};

// retry wrapper with exponential backoff for transient 429/503
async function generateWithRetries(payload, attempts = 4, baseDelay = 1000) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await client.models.generateContent(payload);
    } catch (err) {
      const status = err?.status || err?.code || 0;
      if (i === attempts - 1 || ![429, 503].includes(status)) throw err;
      const wait = baseDelay * Math.pow(2, i);
      console.warn(
        `generateWithRetries: attempt ${i + 1} failed (status ${status}), retrying after ${wait}ms`
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

app.post("/api/optimize-for-job", upload.single("cv"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No CV uploaded" });

    const base64CV = pdfToBase64(req.file.path);

    const prompt = `
את/ה יועץ/ת קריירה ומומחה/ית קורות חיים.
משימה: קרא/י את קורות החיים המצורפים (base64) והצג/י רק המלצות לשיפור בעברית, כל המלצה בשורה נפרדת.
אל תמציא/י ניסיון שאינו קיים. בסיום הוסף/י משפט מחמיא אחד על ההשקעה.
קורות חיים (base64): ${base64CV}
    `;

    const modelName = process.env.MODEL_NAME || "models/gemini-2.0-flash";
    const payload = {
      model: modelName,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    const aiResponse = await generateWithRetries(payload);

    let aiOutput = "";

    try {
      aiOutput =
        aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text ||
        aiResponse?.candidates?.[0]?.content?.[0]?.text ||
        aiResponse?.outputText ||
        aiResponse?.text ||
        (typeof aiResponse === "string" ? aiResponse : "");
    } catch {
      aiOutput = "";
    }

    if ((!aiOutput || aiOutput.length < 2) && aiResponse?.candidates?.[0]?.content) {
      const allParts =
        aiResponse?.candidates?.[0]?.content
          .flatMap((c) =>
            (c.parts || []).filter((p) => p && p.text).map((p) => p.text)
          ) || [];
      aiOutput = allParts.join("\n");
    }

    const parsedOutput = { suggestions: [], compliment: "", score: 0 };

    if (aiOutput && typeof aiOutput === "string") {
      const lines = aiOutput
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const complimentKeywords = ["ניכרת", "מצוין", "מעולה", "מחמיא", "השקעה", "כל הכבוד", "מצוינים"];
      const lastLine = lines[lines.length - 1] || "";
      if (complimentKeywords.some((k) => lastLine.includes(k))) {
        parsedOutput.compliment = lastLine;
        lines.pop();
      }

      parsedOutput.suggestions = lines
        .map((line) => line.replace(/^[•\-\*\d\.\)\s]+/, "").trim())
        .filter((l) => l.length > 0);
    } else {
      parsedOutput.suggestions = ["לא הצלחתי לנתח את קורות החיים."];
    }

    function suggestionSeverityMultiplier(text) {
      const high = ["חובה", "הכרחי", "חסר", "צריך", "חסרה", "להוסיף"];
      const medium = ["מומלץ", "כדאי", "עדיף", "מוטב"];
      const low = ["לשפר", "לחדד", "לנסח", "להבהיר"];

      const t = text.toLowerCase();
      if (high.some((w) => t.includes(w))) return 1.5;
      if (medium.some((w) => t.includes(w))) return 1.2;
      if (low.some((w) => t.includes(w))) return 0.9;
      return 1.0;
    }

    function calculateCVScoreEnhanced(suggestions, compliment) {
      const maxPoints = 100;
      const baseDeductionPerSuggestion = 8;
      let totalDeduction = 0;

      for (const s of suggestions) {
        const lengthFactor = Math.min(5, Math.floor(s.length / 100));
        const severity = suggestionSeverityMultiplier(s);
        const deduction = Math.round(baseDeductionPerSuggestion * severity + lengthFactor);
        totalDeduction += deduction;
      }

      let bonus = 0;
      if (compliment && compliment.length > 5) bonus += 5;
      if (suggestions.length === 0) bonus = 20;

      let score = Math.max(0, maxPoints - totalDeduction + bonus);
      if (score > 100) score = 100;
      if (score < 0) score = 0;
      return Math.round(score);
    }

    parsedOutput.score = calculateCVScoreEnhanced(parsedOutput.suggestions, parsedOutput.compliment);
if (parsedOutput.score >= 0 && parsedOutput.score <= 2) {
  parsedOutput.compliment += (parsedOutput.compliment ? " " : "") + "יש גרוע יותר";
} else if (parsedOutput.score >= 3 && parsedOutput.score <= 39) {
  parsedOutput.compliment += (parsedOutput.compliment ? " " : "") + "אפשר לשפר";
} else if (parsedOutput.score >= 40 && parsedOutput.score <= 69) {
  parsedOutput.compliment += (parsedOutput.compliment ? " " : "") + "לא רע, אבל יש מה לשפר";
} else if (parsedOutput.score >= 70 && parsedOutput.score <= 89) {
  parsedOutput.compliment += (parsedOutput.compliment ? " " : "") + "טוב מאוד!";
} else if (parsedOutput.score >= 90 && parsedOutput.score <= 100) {
  parsedOutput.compliment += (parsedOutput.compliment ? " " : "") + "מצוין!";
}
    try { fs.unlinkSync(req.file.path); } catch (e) { console.warn(e?.message || e); }

    return res.json({ analysis: parsedOutput });
  } catch (err) {
    console.error(err);
    const status = err?.status || err?.code || 500;
    let message = err?.message || "Internal server error";
    if (err?.error) message = typeof err.error === "string" ? err.error : JSON.stringify(err.error);

    return res.status(status).json({
      error: message,
      stack: process.env.NODE_ENV === "production" ? undefined : err?.stack,
    });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// import PDFDocument from "pdfkit";
// import fs from "fs";
// import os from "os";
// import { GoogleGenAI } from "@google/genai";
// import PDFDocument from "pdfkit";

// export const optimizeCVService = async (base64CV, jobDescription) => {
//   const genAI = new GoogleGenAI({
//     apiKey: process.env.GOOGLE_API_KEY,
//   });

//   // Convert uploaded file back to text
//   const originalCVText = Buffer.from(base64CV, "base64").toString("utf8");

//   const prompt = `
// אתה כותב קורות חיים מקצועי. כתוב מחדש את קורות החיים הבאים במלואם כך שיהיו ברורים יותר, מובנים ומשופרים. התאם אותם לתיאור התפקיד של המשתמש.

// Job description:
// ${jobDescription}

// Original resume:
// ${originalCVText}

// Return ONLY a clean improved resume text (no explanations).
//   `;

//   const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
//   const result = await model.generateContent(prompt);
//   const improvedCV = result.response.text();

//   // Convert improved CV text → PDF
//   const doc = new PDFDocument({ size: "A4", margin: 40 });
//   const buffers = [];
//   doc.on("data", buffers.push.bind(buffers));
//   doc.on("end", () => {});

//   doc.font("Times-Roman").fontSize(12).text(improvedCV, {
//     align: "left",
//   });

//   doc.end();

//   return Buffer.concat(buffers);
// };
// services/pdfService.js
import fs from "fs";
import os from "os";
import path from "path";
import PDFDocument from "pdfkit";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { GoogleGenAI } from "@google/genai";
import { fileURLToPath } from "url";
import crypto from "crypto";

// helper to write temp file
const writeTempFile = (buffer, ext = "") => {
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  const p = path.join(os.tmpdir(), name);
  fs.writeFileSync(p, buffer);
  return p;
};

const extractTextFromBuffer = async (buffer, mimetype, originalName) => {
  const lower = (originalName || "").toLowerCase();
  try {
    if (mimetype === "application/pdf" || lower.endsWith(".pdf")) {
      const data = await pdfParse(buffer);
      return (data && data.text) ? data.text : "";
    }

    if (
      mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lower.endsWith(".docx")
    ) {
      // mammoth accepts a Buffer directly (Node)
      const res = await mammoth.extractRawText({ buffer });
      return res.value || "";
    }

    if (mimetype === "application/msword" || lower.endsWith(".doc")) {
      // mammoth can sometimes handle doc but it's not guaranteed.
      const res = await mammoth.extractRawText({ buffer }).catch(() => ({ value: "" }));
      if (res && res.value) return res.value;
    }

    // fallback: try to decode as utf8 plain text
    return buffer.toString("utf8");
  } catch (e) {
    // best-effort fallback
    try {
      return buffer.toString("utf8");
    } catch (ee) {
      return "";
    }
  }
};

const callGenAIForImprovedResume = async (originalText, jobDescription) => {
  const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

  // Keep prompt concise but informative. Trim originalText if very large.
  const originalTrimmed =
    originalText.length > 50000 ? originalText.slice(0, 50000) + "\n...(truncated)" : originalText;

  const prompt = `
You are a professional resume writer. Rewrite the following resume as a complete, clean, well-structured CV, tailored to the provided job description.
Output ONLY the improved resume (no commentary, no numbered list of changes).
Write sections: Contact (name/email/phone if present), Professional Summary, Skills/Technologies, Experience (bulleted, with achievements), Education, Projects (if relevant).
Keep formatting plain text.

Job description:
${jobDescription || "(none provided)"}

Original resume (raw text):
${originalTrimmed}
  `;

  // Example using the same pattern as earlier messages. Adjust to your GenAI SDK usage if different.
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);

  // adapt depending on SDK shape
  // try multiple possible shapes defensively
  let improvedText = "";
  if (!result) throw new Error("No response from GenAI");
  if (result.response && typeof result.response.text === "function") {
    improvedText = result.response.text();
  } else if (result.output && Array.isArray(result.output) && result.output.length) {
    improvedText = result.output.map(o => o.content || o.text || "").join("\n");
  } else if (result.text) {
    improvedText = result.text;
  } else {
    improvedText = JSON.stringify(result).slice(0, 20000);
  }

  return improvedText;
};

export const optimizeCVService = async (base64CV, jobDescription = "", originalName = "uploaded", mimetype = "") => {
  // decode
  const buffer = Buffer.from(base64CV, "base64");

  // extract text from uploaded file
  const extractedText = await extractTextFromBuffer(buffer, mimetype, originalName);

  // call AI to produce an improved resume text
  const improvedText = await callGenAIForImprovedResume(extractedText, jobDescription);

  // convert improved text into a PDF (simple layout)
  const doc = new PDFDocument({ size: "A4", margin: 40, autoFirstPage: true });
  const buffers = [];
  doc.on("data", buffers.push.bind(buffers));
  doc.on("end", () => {});

  // Basic nice formatting: split by double newlines into sections
  const lines = improvedText.split(/\r?\n/);

  // Header: if first lines look like name/contact, print larger
  doc.fontSize(12);
  let y = doc.y;

  // Print all text; keep line breaks
  doc.font("Times-Roman").fontSize(11);
  for (const line of lines) {
    // Avoid extremely long lines -- wrap automatically by doc.text
    doc.text(line, { align: "left", paragraphGap: 2 });
  }

  doc.end();

  const pdfBuffer = Buffer.concat(buffers);

  // cleanup not necessary because we didn't create temp files (except maybe in extraction)
  return pdfBuffer;
};

import fs from "fs";
import os from "os";
import path from "path";
import PDFDocument from "pdfkit";
import mammoth from "mammoth";
import { GoogleGenAI } from "@google/genai";
import { fileURLToPath } from "url";
import crypto from "crypto";

import PDFPoppler from "pdf-poppler";
import { createWorker } from "tesseract.js";

const writeTempFile = (buffer, ext = "") => {
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  const p = path.join(os.tmpdir(), name);
  fs.writeFileSync(p, buffer);
  console.log("Temp file written:", p);
  return p;
};
const extractPdfUsingOCR = async (buffer) => {
  console.log("Starting PDF OCR extraction...");

  const tempPdfPath = writeTempFile(buffer, ".pdf");
  console.log("Temporary PDF path:", tempPdfPath);

  const outputDir = path.join(os.tmpdir(), "ocr_out_" + Date.now());
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  console.log("Output directory for PNGs:", outputDir);

  await PDFPoppler.convert(tempPdfPath, {
    format: "png",
    out_dir: outputDir,
    out_prefix: "page",
    page: null,
  });
  console.log("PDF converted to PNG images.");
  const worker = await createWorker("eng+heb");
  await worker.load();
  console.log("Tesseract worker loaded.");

  const files = fs
    .readdirSync(outputDir)
    .filter((f) => f.endsWith(".png"))
    .sort();
  console.log("PNG files found for OCR:", files);

  let fullText = "";

  for (const file of files) {
    console.log("Processing OCR for file:", file);
    const result = await worker.recognize(path.join(outputDir, file));
    fullText += result.data.text + "\n";
  }

  await worker.terminate();
  console.log("OCR worker terminated. Extracted text length:", fullText.length);

  return fullText;
};

const extractTextFromBuffer = async (buffer, mimetype, originalName) => {
  console.log("Extracting text from buffer. Type:", mimetype, "Name:", originalName);

  const lower = (originalName || "").toLowerCase();

  try {
    if (mimetype === "application/pdf" || lower.endsWith(".pdf")) {
      const text = await extractPdfUsingOCR(buffer);
      console.log("PDF text extraction successful. Length:", text.length);
      return text;
    }

    if (
      mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lower.endsWith(".docx")
    ) {
      const res = await mammoth.extractRawText({ buffer });
      console.log(".docx extraction successful. Length:", res.value.length);
      return res.value || "";
    }

    if (mimetype === "application/msword" || lower.endsWith(".doc")) {
      const res = await mammoth.extractRawText({ buffer }).catch(() => ({ value: "" }));
      if (res?.value) {
        console.log(".doc extraction successful. Length:", res.value.length);
        return res.value;
      }
    }

    console.log("Fallback: using UTF-8 text extraction.");
    return buffer.toString("utf8");

  } catch (e) {
    console.log("Error during text extraction:", e);
    try {
      return buffer.toString("utf8");
    } catch {
      console.log("Fallback UTF-8 extraction failed.");
      return "";
    }
  }
};
const callGenAIForImprovedResume = async (originalText, jobDescription) => {
  console.log("Calling GenAI to improve resume (English output)...");
  const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

  const originalTrimmed =
    originalText.length > 50000
      ? originalText.slice(0, 50000) + "\n...(truncated)"
      : originalText;

  const prompt = `
You are a professional resume writer. Your task is to create a complete, professional, well-structured CV IN ENGLISH ONLY.

CRITICAL REQUIREMENTS:
1. Output MUST be 100% in English - no Hebrew, no other languages
2. If the input CV is in Hebrew or any other language, translate ALL content to professional English
3. Preserve all the candidate's experience, skills, and achievements but express them in clear, professional English
4. Use standard English resume format and terminology

Format the resume with these sections (in this order):
- [Full Name] (centered, large)
- Contact Information (email, phone, LinkedIn, GitHub if available)
- Professional Summary (2-3 sentences)
- Core Skills (bullet points)
- Professional Experience (with company, dates, achievements)
- Education
- Projects (if relevant)
- Certifications/Languages (if applicable)

Style guidelines:
- Use action verbs (Developed, Managed, Implemented, etc.)
- Quantify achievements where possible
- Keep it concise and impactful
- Use bullet points for experience and skills
- Professional tone throughout

${jobDescription ? `Tailor the resume for this job description: ${jobDescription}` : ''}

Input CV (translate to English if needed):
${originalTrimmed}

OUTPUT ONLY THE IMPROVED RESUME IN ENGLISH - NO COMMENTARY, NO EXPLANATIONS.
  `;

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  const result = await model.generateContent(prompt);

  let improvedText = "";

  if (result?.response?.text) {
    improvedText = result.response.text();
  } else if (result?.text) {
    improvedText = result.text;
  } else {
    improvedText = JSON.stringify(result).slice(0, 20000);
  }

  console.log("GenAI improved resume length:", improvedText.length);
  console.log("✅ Resume generated in English");
  
  return improvedText;
};

export const optimizeCVService = async (
  base64CV,
  jobDescription = "",
  originalName = "uploaded",
  mimetype = ""
) => {
  console.log("Optimize CV Service started for:", originalName);

  const buffer = Buffer.from(base64CV, "base64");

  const extractedText = await extractTextFromBuffer(buffer, mimetype, originalName);
  console.log("Text extraction completed. Length:", extractedText.length);

  const improvedText = await callGenAIForImprovedResume(
    extractedText,
    jobDescription
  );

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const buffers = [];

  doc.on("data", buffers.push.bind(buffers));
  doc.on("end", () => {
    console.log("PDF generation completed. Final buffer length:", Buffer.concat(buffers).length);
  });

  doc.font("Times-Roman").fontSize(11);
  const lines = improvedText.split(/\r?\n/);

  for (const line of lines) {
    doc.text(line, { align: "left", paragraphGap: 2 });
  }

  doc.end();

  return Buffer.concat(buffers);
};
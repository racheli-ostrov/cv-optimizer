// // import fs from "fs";
// // import os from "os";
// // import path from "path";
// // import PDFDocument from "pdfkit";
// // import pdfParse from "pdf-parse";
// // import mammoth from "mammoth";
// // import { GoogleGenAI } from "@google/genai";
// // import { fileURLToPath } from "url";
// // import crypto from "crypto";

// // // helper to write temp file
// // const writeTempFile = (buffer, ext = "") => {
// //   const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
// //   const p = path.join(os.tmpdir(), name);
// //   fs.writeFileSync(p, buffer);
// //   return p;
// // };

// // const extractTextFromBuffer = async (buffer, mimetype, originalName) => {
// //   const lower = (originalName || "").toLowerCase();
// //   try {
// //     if (mimetype === "application/pdf" || lower.endsWith(".pdf")) {
// //       const data = await pdfParse(buffer);
// //       return (data && data.text) ? data.text : "";
// //     }

// //     if (
// //       mimetype ===
// //         "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
// //       lower.endsWith(".docx")
// //     ) {
// //       // mammoth accepts a Buffer directly (Node)
// //       const res = await mammoth.extractRawText({ buffer });
// //       return res.value || "";
// //     }

// //     if (mimetype === "application/msword" || lower.endsWith(".doc")) {
// //       // mammoth can sometimes handle doc but it's not guaranteed.
// //       const res = await mammoth.extractRawText({ buffer }).catch(() => ({ value: "" }));
// //       if (res && res.value) return res.value;
// //     }

// //     // fallback: try to decode as utf8 plain text
// //     return buffer.toString("utf8");
// //   } catch (e) {
// //     // best-effort fallback
// //     try {
// //       return buffer.toString("utf8");
// //     } catch (ee) {
// //       return "";
// //     }
// //   }
// // };

// // const callGenAIForImprovedResume = async (originalText, jobDescription) => {
// //   const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

// //   // Keep prompt concise but informative. Trim originalText if very large.
// //   const originalTrimmed =
// //     originalText.length > 50000 ? originalText.slice(0, 50000) + "\n...(truncated)" : originalText;

// //   const prompt = `
// // You are a professional resume writer. Rewrite the following resume as a complete, clean, well-structured CV, tailored to the provided job description.
// // Output ONLY the improved resume (no commentary, no numbered list of changes).
// // Write sections: Contact (name/email/phone if present), Professional Summary, Skills/Technologies, Experience (bulleted, with achievements), Education, Projects (if relevant).
// // Keep formatting plain text.

// // Job description:
// // ${jobDescription || "(none provided)"}

// // Original resume (raw text):
// // ${originalTrimmed}
// //   `;

// //   // Example using the same pattern as earlier messages. Adjust to your GenAI SDK usage if different.
// //   const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
// //   const result = await model.generateContent(prompt);

// //   // adapt depending on SDK shape
// //   // try multiple possible shapes defensively
// //   let improvedText = "";
// //   if (!result) throw new Error("No response from GenAI");
// //   if (result.response && typeof result.response.text === "function") {
// //     improvedText = result.response.text();
// //   } else if (result.output && Array.isArray(result.output) && result.output.length) {
// //     improvedText = result.output.map(o => o.content || o.text || "").join("\n");
// //   } else if (result.text) {
// //     improvedText = result.text;
// //   } else {
// //     improvedText = JSON.stringify(result).slice(0, 20000);
// //   }

// //   return improvedText;
// // };

// // export const optimizeCVService = async (base64CV, jobDescription = "", originalName = "uploaded", mimetype = "") => {
// //   // decode
// //   const buffer = Buffer.from(base64CV, "base64");

// //   // extract text from uploaded file
// //   const extractedText = await extractTextFromBuffer(buffer, mimetype, originalName);

// //   // call AI to produce an improved resume text
// //   const improvedText = await callGenAIForImprovedResume(extractedText, jobDescription);

// //   // convert improved text into a PDF (simple layout)
// //   const doc = new PDFDocument({ size: "A4", margin: 40, autoFirstPage: true });
// //   const buffers = [];
// //   doc.on("data", buffers.push.bind(buffers));
// //   doc.on("end", () => {});

// //   // Basic nice formatting: split by double newlines into sections
// //   const lines = improvedText.split(/\r?\n/);

// //   // Header: if first lines look like name/contact, print larger
// //   doc.fontSize(12);
// //   let y = doc.y;

// //   // Print all text; keep line breaks
// //   doc.font("Times-Roman").fontSize(11);
// //   for (const line of lines) {
// //     // Avoid extremely long lines -- wrap automatically by doc.text
// //     doc.text(line, { align: "left", paragraphGap: 2 });
// //   }

// //   doc.end();

// //   const pdfBuffer = Buffer.concat(buffers);

// //   // cleanup not necessary because we didn't create temp files (except maybe in extraction)
// //   return pdfBuffer;
// // };
// import fs from "fs";
// import os from "os";
// import path from "path";
// import PDFDocument from "pdfkit";
// import mammoth from "mammoth";
// import { GoogleGenAI } from "@google/genai";
// import { fileURLToPath } from "url";
// import crypto from "crypto";

// import PDFPoppler from "pdf-poppler";
// import { createWorker } from "tesseract.js";


// // helper to write temp file
// const writeTempFile = (buffer, ext = "") => {
//   const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
//   const p = path.join(os.tmpdir(), name);
//   fs.writeFileSync(p, buffer);
//   return p;
// };


// // ------------------------------------------------------
// // 🔥 OCR for PDF
// // ------------------------------------------------------
// const extractPdfUsingOCR = async (buffer) => {
//   const tempPdfPath = writeTempFile(buffer, ".pdf");
//   const outputDir = path.join(os.tmpdir(), "ocr_out_" + Date.now());

//   if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

//   // Step 1: Convert PDF → PNG images
//   await PDFPoppler.convert(tempPdfPath, {
//     format: "png",
//     out_dir: outputDir,
//     out_prefix: "page",
//     page: null,
//   });

//   // Step 2: OCR images
//   const worker = await createWorker("eng+heb");
//   await worker.load();

//   const files = fs
//     .readdirSync(outputDir)
//     .filter((f) => f.endsWith(".png"))
//     .sort();

//   let fullText = "";

//   for (const file of files) {
//     const result = await worker.recognize(path.join(outputDir, file));
//     fullText += result.data.text + "\n";
//   }

//   await worker.terminate();

//   return fullText;
// };


// // ------------------------------------------------------
// // 🔥 TEXT EXTRACTION with OCR fallback for PDFs
// // ------------------------------------------------------
// const extractTextFromBuffer = async (buffer, mimetype, originalName) => {
//   const lower = (originalName || "").toLowerCase();

//   try {
//     // Always OCR for PDFs
//     if (mimetype === "application/pdf" || lower.endsWith(".pdf")) {
//       return await extractPdfUsingOCR(buffer);
//     }

//     if (
//       mimetype ===
//       "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
//       lower.endsWith(".docx")
//     ) {
//       const res = await mammoth.extractRawText({ buffer });
//       return res.value || "";
//     }

//     if (mimetype === "application/msword" || lower.endsWith(".doc")) {
//       const res = await mammoth.extractRawText({ buffer }).catch(() => ({ value: "" }));
//       if (res?.value) return res.value;
//     }

//     // fallback to plain UTF-8 text
//     return buffer.toString("utf8");

//   } catch (e) {
//     try {
//       return buffer.toString("utf8");
//     } catch {
//       return "";
//     }
//   }
// };



// // ------------------------------------------------------
// // 🔥 GEN AI — Improve Resume
// // ------------------------------------------------------
// const callGenAIForImprovedResume = async (originalText, jobDescription) => {
//   const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

//   const originalTrimmed =
//     originalText.length > 50000
//       ? originalText.slice(0, 50000) + "\n...(truncated)"
//       : originalText;

//   const prompt = `
// You are a professional resume writer. Rewrite the following resume as a complete, clean, well-structured CV, tailored to the provided job description.
// Output ONLY the improved resume (no commentary, no explanations).
// Write sections: Contact, Professional Summary, Skills, Experience (bulleted), Education, Projects (if relevant).
// Keep formatting plain text.

// Job description:
// ${jobDescription || "(none)"}

// Original resume text:
// ${originalTrimmed}
//   `;

//   const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
//   const result = await model.generateContent(prompt);

//   let improvedText = "";

//   if (result?.response?.text) {
//     improvedText = result.response.text();
//   } else if (result?.text) {
//     improvedText = result.text;
//   } else {
//     improvedText = JSON.stringify(result).slice(0, 20000);
//   }

//   return improvedText;
// };



// // ------------------------------------------------------
// // 🔥 MAIN SERVICE — receives Base64, outputs improved PDF
// // ------------------------------------------------------
// export const optimizeCVService = async (
//   base64CV,
//   jobDescription = "",
//   originalName = "uploaded",
//   mimetype = ""
// ) => {
//   // decode file
//   const buffer = Buffer.from(base64CV, "base64");

//   // extract text (OCR if PDF)
//   const extractedText = await extractTextFromBuffer(buffer, mimetype, originalName);

//   // improve with AI
//   const improvedText = await callGenAIForImprovedResume(
//     extractedText,
//     jobDescription
//   );

//   // convert improved resume → PDF
//   const doc = new PDFDocument({ size: "A4", margin: 40 });
//   const buffers = [];

//   doc.on("data", buffers.push.bind(buffers));
//   doc.on("end", () => { });

//   doc.font("Times-Roman").fontSize(11);
//   const lines = improvedText.split(/\r?\n/);

//   for (const line of lines) {
//     doc.text(line, { align: "left", paragraphGap: 2 });
//   }

//   doc.end();

//   return Buffer.concat(buffers);
// };
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

// helper to write temp file
const writeTempFile = (buffer, ext = "") => {
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  const p = path.join(os.tmpdir(), name);
  fs.writeFileSync(p, buffer);
  console.log("Temp file written:", p);
  return p;
};

// ------------------------------------------------------
// 🔥 OCR for PDF
// ------------------------------------------------------
const extractPdfUsingOCR = async (buffer) => {
  console.log("Starting PDF OCR extraction...");

  const tempPdfPath = writeTempFile(buffer, ".pdf");
  console.log("Temporary PDF path:", tempPdfPath);

  const outputDir = path.join(os.tmpdir(), "ocr_out_" + Date.now());
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  console.log("Output directory for PNGs:", outputDir);

  // Step 1: Convert PDF → PNG images
  await PDFPoppler.convert(tempPdfPath, {
    format: "png",
    out_dir: outputDir,
    out_prefix: "page",
    page: null,
  });
  console.log("PDF converted to PNG images.");

  // Step 2: OCR images
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

// ------------------------------------------------------
// 🔥 TEXT EXTRACTION with OCR fallback for PDFs
// ------------------------------------------------------
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

// ------------------------------------------------------
// 🔥 GEN AI — Improve Resume
// ------------------------------------------------------
const callGenAIForImprovedResume = async (originalText, jobDescription) => {
  console.log("Calling GenAI to improve resume...");
  const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

  const originalTrimmed =
    originalText.length > 50000
      ? originalText.slice(0, 50000) + "\n...(truncated)"
      : originalText;

  const prompt = `
You are a professional resume writer. Rewrite the following resume as a complete, clean, well-structured CV, tailored to the provided job description.
Output ONLY the improved resume (no commentary, no explanations).
Write sections: Contact, Professional Summary, Skills, Experience (bulleted), Education, Projects (if relevant).
Keep formatting plain text.

Job description:
${jobDescription || "(none)"}

Original resume text:
${originalTrimmed}
  `;

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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
  return improvedText;
};

// ------------------------------------------------------
// 🔥 MAIN SERVICE — receives Base64, outputs improved PDF
// ------------------------------------------------------
export const optimizeCVService = async (
  base64CV,
  jobDescription = "",
  originalName = "uploaded",
  mimetype = ""
) => {
  console.log("Optimize CV Service started for:", originalName);

  // decode file
  const buffer = Buffer.from(base64CV, "base64");

  // extract text (OCR if PDF)
  const extractedText = await extractTextFromBuffer(buffer, mimetype, originalName);
  console.log("Text extraction completed. Length:", extractedText.length);

  // improve with AI
  const improvedText = await callGenAIForImprovedResume(
    extractedText,
    jobDescription
  );

  // convert improved resume → PDF
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

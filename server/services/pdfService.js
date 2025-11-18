import { GoogleGenAI } from "@google/genai";
import PDFDocument from "pdfkit";
import fs from "fs";

const client = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const optimizeCVService = async (base64CV, jobDescription) => {
  const prompt = `
You are an expert resume optimizer, HR analyst, and ATS specialist.

### Input:
1. Candidate Resume (raw text): ${base64CV}
2. Job Description: ${jobDescription}

### Output:
Return ONLY the optimized resume text.
`;

  const aiResponse = await client.models.generateContent({
    model: "text-bison-001",
    input: prompt,
  });

  const improvedContent = aiResponse.outputText || "No content";

  // יצירת PDF
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const buffers = [];
  doc.on("data", buffers.push.bind(buffers));
  doc.on("end", () => {});

  doc.font("Times-Roman").text(improvedContent, { align: "left" });
  doc.end();

  const pdfBuffer = Buffer.concat(buffers);

  const analysis = {}; // כאן אפשר להוסיף ניתוח אם רוצים

  return { improvedContent: pdfBuffer, analysis };
};

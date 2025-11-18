import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import dotenv from "dotenv";
import cors from "cors";
import { GenAIClient } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

const client = new GenAIClient({ apiKey: process.env.API_KEY });

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
});

app.post("/api/optimize-for-job", upload.single("cv"), async (req, res) => {
  try {
    const { jobDescription } = req.body;
    if (!req.file) return res.status(400).json({ error: "No CV uploaded" });
    if (!jobDescription) return res.status(400).json({ error: "Job description missing" });

    const base64CV = pdfToBase64(req.file.path);

    const prompt = `
You are an expert resume optimizer, HR analyst, and ATS specialist.

Your task: Rewrite and optimize the candidate’s resume so it fits the job description as accurately as possible, without inventing experience that does not exist. You may rephrase, restructure, highlight, or reorganize content — but never fabricate.

### Input:
1. Candidate Resume (raw text): ${base64CV}
2. Job Description: ${jobDescription}

### Requirements:
1. Create a fully optimized resume tailored to the job description.
2. Ensure the resume passes ATS scanners:
   - Use keywords from the job description naturally.
   - Emphasize measurable achievements (numbers, metrics, impact).
   - Strengthen relevant skills, tools, technologies, and responsibilities.
   - Reorganize sections to prioritize job-relevant content.
3. Improve clarity, language, professionalism, and formatting flow.
4. Keep the resume concise, focused, and strong.
5. Do NOT add skills or experience that are not supported by the resume.
6. If experience is relevant but weakly written, rewrite it to highlight impact.
7. Where appropriate, merge duplicate items and remove irrelevant content.
8. Output ONLY the optimized resume in clean text form, structured as:
   - Header (optional placeholders for personal info)
   - Professional Summary (short and tailored)
   - Skills (grouped and optimized)
   - Experience (rewritten + achievement-oriented)
   - Education
   - Certifications / Additional sections (if present in the CV)

### Output:
Return ONLY the optimized resume text. Do not provide explanations.
`;

    const aiResponse = await client.generate({
      model: "text-bison-001",
      input: prompt
    });

    const aiOutput = aiResponse.outputText || "{}";
    let parsedOutput;
    try {
      parsedOutput = JSON.parse(aiOutput);
    } catch (e) {
      parsedOutput = { error: "Could not parse AI output" };
    }

    const outputFileName = `optimized-${Date.now()}.pdf`;
    const outputPath = path.join("generated", outputFileName);
    await createPDF(outputPath, parsedOutput.improvedCVContent || "No content");

    fs.unlinkSync(req.file.path);

    res.json({
      analysis: parsedOutput,
      filename: outputFileName
    });

  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
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
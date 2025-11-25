import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export const downloadImprovedPDF = (req, res) => {
  const { improvedContent } = req.body;

  if (!improvedContent || improvedContent.trim() === "") {
    return res.status(400).json({ error: "No content provided" });
  }

  try {
    const outDir = path.join(process.cwd(), "generated-pdf");
    fs.mkdirSync(outDir, { recursive: true });

    const pdfName = `improved_${Date.now()}.pdf`;
    const pdfPath = path.join(outDir, pdfName);

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const stream = fs.createWriteStream(pdfPath);

    stream.on("error", (err) => {
      console.error("Write stream error:", err);
      if (!res.headersSent) res.status(500).json({ error: "Failed to write PDF" });
    });

    doc.on("error", (err) => {
      console.error("PDF document error:", err);
      if (!res.headersSent) res.status(500).json({ error: "Failed to generate PDF" });
    });

    doc.pipe(stream);

    const lines = improvedContent.split("\n");
    lines.forEach((line) => {
      if (line.trim() !== "") {
        doc.font("Helvetica").fontSize(12).text(line.trim(), { align: "left" });
        doc.moveDown(0.2);
      }
    });

    doc.end();

    stream.on("finish", () => {
      console.log(`✅ PDF created successfully: ${pdfName}`);
      res.download(pdfPath, pdfName, (err) => {
        if (err) {
          console.error(err);
          if (!res.headersSent) res.status(500).send("Error downloading the PDF");
        } else {
          fs.unlink(pdfPath, (unlinkErr) => {
            if (unlinkErr) console.error("Failed to delete temp file:", unlinkErr);
          });
        }
      });
    });

  } catch (err) {
    console.error("PDF Generation Error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate PDF" });
  }
};

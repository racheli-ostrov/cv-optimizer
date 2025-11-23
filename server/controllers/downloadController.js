import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

// פונקציה ליצירת PDF משופר מהתוכן שהתקבל
export const downloadImprovedPDF = (req, res) => {
  try {
    const { improvedContent } = req.body;

    if (!improvedContent || improvedContent.trim() === "") {
      return res.status(400).json({ error: "No content provided" });
    }

    // Ensure output directory exists
    const outDir = path.join(process.cwd(), "generated-pdf");
    fs.mkdirSync(outDir, { recursive: true });

    const lines = improvedContent.split("\n");
    const firstLine = lines[0] ? lines[0].trim().replace(/[\/\\?%*:|"<>]/g, "_") : "cv"; // מנקה תווים בעייתיים
    const pdfName = `${firstLine}_improved.pdf`;
    const pdfPath = path.join(outDir, pdfName);

    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(pdfPath);

    // Stream and doc error handling
    stream.on("error", (err) => {
      console.error("Write stream error:", err);
      if (!res.headersSent) res.status(500).json({ error: "Failed to write PDF" });
    });
    doc.on("error", (err) => {
      console.error("PDF document error:", err);
      if (!res.headersSent) res.status(500).json({ error: "Failed to generate PDF" });
    });

    doc.pipe(stream);

    // Load font
    const fontPath = path.join(process.cwd(), "fonts", "ComicSansMS.ttf");
    if (fs.existsSync(fontPath)) {
      doc.font(fontPath);
    } else {
      console.warn("Font file not found, using default");
    }

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      if (index === 0) {
        // השורה הראשונה – גדולה ביותר, כחול
        doc.fontSize(20).fillColor("blue").text(trimmedLine, { align: "left" });
        return; // אין רווח אחרי השורה הראשונה
      }

      if (index === 1) {
        // השורה השנייה – כותרת רגילה, כחול כהה
        doc.moveDown(0.2);
        doc.fontSize(16).fillColor("#003366").text(trimmedLine, { align: "left" });
        return;
      }

      const keywords = ["Education","Experience","Skills","Projects","Certifications","Awards","Volunteer Work","Internships","Profile",
        "Publications","Hobbies","Interests","References","Summary","Professional Profile","About Me","Objective","Career Objective","Key Skills","Core Competencies",
        "Achievements","Technical Skills","Soft Skills","Portfolio","Leadership Experience","Courses","Conferences","Workshops"];
      const isHeading = keywords.some(k => trimmedLine.startsWith(k));

      if (isHeading) {
        doc.moveDown(0.5);
        doc.fontSize(14).fillColor("blue").text(trimmedLine, { align: "left" });
        doc.moveDown(0.3);
      } else {
        doc.moveDown(0.15);
        doc.fontSize(12).fillColor("black").text(trimmedLine, { align: "left" });
      }
    });

    doc.end();

    stream.on("finish", () => {
      res.download(pdfPath, pdfName, (err) => {
        if (err) {
          console.error(err);
          if (!res.headersSent) res.status(500).send("Error downloading the PDF");
        } else {
          fs.unlink(pdfPath, () => {}); // מחיקה אחרי הורדה
        }
      });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
};

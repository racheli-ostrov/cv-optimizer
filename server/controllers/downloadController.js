// import PDFDocument from "pdfkit";
// import fs from "fs";
// import path from "path";

// export const downloadImprovedPDF = (req, res) => {
//   try {
//     const { improvedContent } = req.body;
// console.log("Received content:", improvedContent);
//     if (!improvedContent || improvedContent.trim() === "") {
//       return res.status(400).json({ error: "No content provided" });
//     }
//     // Ensure output directory exists to avoid stream ENOENT errors
//     const outDir = path.join(process.cwd(), "generated-pdf");
//     try {
//       fs.mkdirSync(outDir, { recursive: true });
//     } catch (e) {
//       console.error("Failed to ensure generated-pdf dir:", e);
//     }

//     const doc = new PDFDocument();
//     const pdfName = `improved_cv_${Date.now()}.pdf`;
//     const pdfPath = path.join(outDir, pdfName);
//     const stream = fs.createWriteStream(pdfPath);

//     // Handle stream errors to avoid crashing the process
//     stream.on("error", (err) => {
//       console.error("Write stream error:", err);
//       if (!res.headersSent) res.status(500).json({ error: "Failed to write PDF" });
//     });

//     doc.on("error", (err) => {
//       console.error("PDF document error:", err);
//       if (!res.headersSent) res.status(500).json({ error: "Failed to generate PDF" });
//     });

//     doc.pipe(stream);

//     // אם הגופן קיים – השתמשי בו
//     const fontPath = path.join(process.cwd(), "fonts", "Alef-Regular.ttf");
//     if (fs.existsSync(fontPath)) doc.font(fontPath);

//     doc.fontSize(12).text(improvedContent, { align: "left" });
//     doc.end();

//     stream.on("finish", () => {
//       res.download(pdfPath, "improved_cv.pdf", (err) => {
//         if (err) {
//           console.error(err);
//           if (!res.headersSent) res.status(500).send("Error downloading the PDF");
//         } else {
//           fs.unlink(pdfPath, () => {}); // למחוק אחרי הורדה
//         }
//       });
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to generate PDF" });
//   }
// };

// // Serve a previously-generated file from the `generated/` folder
// export const downloadGeneratedFile = (req, res) => {
//   try {
//     const { filename } = req.params;
//     if (!filename) return res.status(400).json({ error: "Filename required" });

//     const filePath = path.join(process.cwd(), "generated", filename);
//     if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });

//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

//     res.download(filePath, filename, (err) => {
//       if (err) {
//         console.error("Error sending file:", err);
//       } else {
//         // remove the file after successful download
//         fs.unlink(filePath, (unlinkErr) => {
//           if (unlinkErr) console.error("Failed to unlink file:", unlinkErr);
//         });
//       }
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to serve file" });
//   }
// };
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export const downloadImprovedPDF = (req, res) => {
  try {
    const { improvedContent, originalFileName } = req.body;
    console.log("Received content:", improvedContent);

    if (!improvedContent || improvedContent.trim() === "") {
      return res.status(400).json({ error: "No content provided" });
    }

    // Ensure output directory exists
    const outDir = path.join(process.cwd(), "generated-pdf");
    fs.mkdirSync(outDir, { recursive: true });

    const doc = new PDFDocument();
    const fileBaseName = path.parse(originalFileName || "cv").name;
    const pdfName = `${fileBaseName}_improved.pdf`;
    const pdfPath = path.join(outDir, pdfName);
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

    // Load Calibri Light font if exists
    const fontPath = path.join(process.cwd(), "fonts", "Calibri-Light.ttf");
    if (fs.existsSync(fontPath)) {
      doc.font(fontPath);
    }

    const baseFontSize = 12;
    const headerFontSize = baseFontSize + 1;
    const keywords = ["About Me","Summary","Professional Experience", "Profile","Key Skills","Selected Projects","Education", "Experience", "Skills", "Languages", "Projects", "Certificates"];

    const lines = improvedContent.split("\n");
    lines.forEach((line, index) => {
  const isHeader = index === 0 || keywords.some(kw => line.startsWith(kw));

  if (index === 0) {
    doc.moveDown(0.5);
    doc.fillColor("blue").fontSize(firstLineFontSize).text(line);
    doc.moveDown(0.5);
  } else if (isHeader) {
    doc.moveDown(0.5);
    doc.fillColor("blue").fontSize(headerFontSize).text(line);
    doc.moveDown(0.5);
  } else {
    doc.fillColor("black").fontSize(baseFontSize).text(line);
  }
});


    doc.end();

    stream.on("finish", () => {
      res.download(pdfPath, pdfName, (err) => {
        if (err) {
          console.error(err);
          if (!res.headersSent) res.status(500).send("Error downloading the PDF");
        } else {
          fs.unlink(pdfPath, () => {});
        }
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
};

// Serve previously generated file
export const downloadGeneratedFile = (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename) return res.status(400).json({ error: "Filename required" });

    const filePath = path.join(process.cwd(), "generated-pdf", filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    res.download(filePath, filename, (err) => {
      if (err) console.error("Error sending file:", err);
      else fs.unlink(filePath, (unlinkErr) => { if (unlinkErr) console.error("Failed to unlink file:", unlinkErr); });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to serve file" });
  }
};

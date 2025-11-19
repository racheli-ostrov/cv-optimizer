// // import fs from "fs";
// // import path from "path";

// // export const downloadPDF = (req, res) => {
// //   const { filename } = req.params;
// //   const filePath = path.join("generated", filename);

// //   if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });

// //   res.setHeader("Content-Type", "application/pdf");
// //   res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

// //   res.download(filePath, filename, (err) => {
// //     if (!err) fs.unlink(filePath, () => {});
// //   });
// // };
// import fs from "fs";
// import path from "path";
// import { optimizeCVService } from "../services/pdfService.js"; // הפונקציה שיוצרת PDF משופר

// export const downloadImprovedPDF = async (req, res) => {
//   try {
//     const { base64CV, jobDescription } = req.body;

//     if (!base64CV) return res.status(400).json({ error: "No CV data provided" });

//     // מייצרים PDF משופר
//     const { improvedContent } = await optimizeCVService(base64CV, jobDescription);

//     // יוצרים שם זמני לקובץ
//     const filename = `improved_cv_${Date.now()}.pdf`;
//     const tempPath = path.join("generated", filename);

//     fs.writeFileSync(tempPath, improvedContent);

//     // שולחים את הקובץ ללקוח
//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

//     res.download(tempPath, filename, (err) => {
//       if (!err) fs.unlink(tempPath, () => {}); // מוחקים לאחר ההורדה
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to generate improved PDF" });
//   }
// };
// controllers/downloadController.js
// controllers/downloadController.js
import PDFDocument from "pdfkit";
import fs from "fs";

export const downloadImprovedPDF = (req, res) => {
  const { improvedContent } = req.body;

  if (!improvedContent) {
    return res.status(400).json({ error: "No improved content provided" });
  }

  // יוצרים PDF חדש בזיכרון
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  let buffers = [];
  doc.on("data", buffers.push.bind(buffers));
  doc.on("end", () => {
    const pdfData = Buffer.concat(buffers);
    res
      .writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="improved_cv.pdf"',
        "Content-Length": pdfData.length,
      })
      .end(pdfData);
  });

  // --- עיצוב בסיסי ---
  doc.font("Helvetica-Bold").fontSize(18).text("קורות חיים משופרים", { align: "center" });
  doc.moveDown(1);

  doc.font("Helvetica").fontSize(12);

  const lines = improvedContent.split("\n");

  lines.forEach((line) => {
    if (line.trim() === "") {
      doc.moveDown(0.5); // רווח בין פסקאות
    } else if (line.startsWith("-") || line.startsWith("•")) {
      doc.text(line, { bullet: true, indent: 20 });
    } else {
      doc.text(line);
    }
  });

  doc.end();
};

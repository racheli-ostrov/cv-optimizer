// import PDFDocument from "pdfkit";
// import fs from "fs";
// export const downloadImprovedPDF = (req, res) => {
//   const { improvedContent } = req.body;
//   if (!improvedContent) return res.status(400).json({ error: "No improved content" });

//   const doc = new PDFDocument({ size: "A4", margin: 50 });
//   const buffers = [];
//   doc.on("data", buffers.push.bind(buffers));
//   doc.on("end", () => {
//     const pdfData = Buffer.concat(buffers);
//     res
//       .writeHead(200, {
//         "Content-Type": "application/pdf",
//         "Content-Disposition": 'attachment; filename="improved_cv.pdf"',
//         "Content-Length": pdfData.length,
//       })
//       .end(pdfData);
//   });

//   doc.font("Helvetica-Bold").fontSize(18).text("קורות חיים משופרים", { align: "center" });
//   doc.moveDown(1);

//   doc.font("Helvetica").fontSize(12);
//   improvedContent.split("\n").forEach(line => {
//     if (line.trim() === "") doc.moveDown(0.5);
//     else if (line.startsWith("-") || line.startsWith("•")) doc.text(line, { bullet: true, indent: 20 });
//     else doc.text(line);
//   });

//   doc.end();
// };
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export const downloadImprovedPDF = (req, res) => {
  try {
    const { improvedContent } = req.body;
console.log("Received content:", improvedContent);
    if (!improvedContent || improvedContent.trim() === "") {
      return res.status(400).json({ error: "No content provided" });
    }

    const doc = new PDFDocument();
    const pdfName = `improved_cv_${Date.now()}.pdf`;
    const pdfPath = path.join(process.cwd(), "generated-pdf", pdfName);
    const stream = fs.createWriteStream(pdfPath);

    doc.pipe(stream);

    // אם הגופן קיים – השתמשי בו
    const fontPath = path.join(process.cwd(), "fonts", "Alef-Regular.ttf");
    if (fs.existsSync(fontPath)) doc.font(fontPath);

    doc.fontSize(12).text(improvedContent, { align: "left" });
    doc.end();

    stream.on("finish", () => {
      res.download(pdfPath, "improved_cv.pdf", (err) => {
        if (err) {
          console.error(err);
          res.status(500).send("Error downloading the PDF");
        } else {
          fs.unlink(pdfPath, () => {}); // למחוק אחרי הורדה
        }
      });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
};
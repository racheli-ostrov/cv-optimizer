import fs from "fs";
import path from "path";

export const downloadPDF = (req, res) => {
  const { filename } = req.params;
  const filePath = path.join("generated", filename);

  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  res.download(filePath, filename, (err) => {
    if (!err) fs.unlink(filePath, () => {});
  });
};

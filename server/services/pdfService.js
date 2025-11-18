import PDFDocument from "pdfkit";
import fs from "fs";
import os from "os";

// Local fallback optimizer that produces a simple optimized CV PDF.
// This avoids a hard dependency on an external LLM and makes the app work offline.
export const optimizeCVService = async (base64CV, jobDescription) => {
  // Basic heuristic: build a short optimized text header using keywords from the job description.
  const jd = (jobDescription || "").toString();
  const keywords = Array.from(new Set(jd
    .replace(/[\W_]+/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 12)
  ));

  const optimizedTextLines = [];
  optimizedTextLines.push("Optimized Resume (auto-generated)");
  optimizedTextLines.push("=====================================");
  optimizedTextLines.push(`Tailored for: ${jd.substring(0, 300)}`);
  if (keywords.length) {
    optimizedTextLines.push("");
    optimizedTextLines.push("Suggested keywords to emphasize:");
    optimizedTextLines.push(keywords.join(", "));
  }
  optimizedTextLines.push("");
  optimizedTextLines.push("Summary (auto):");
  optimizedTextLines.push("Experienced candidate with relevant background. Emphasize achievements and quantifiable results tailored to the job description.");
  optimizedTextLines.push("");
  optimizedTextLines.push("(Original CV was uploaded and is available to the recruiter.)");

  const improvedContent = optimizedTextLines.join(os.EOL);

  // Create PDF buffer
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const buffers = [];
  doc.on("data", buffers.push.bind(buffers));
  doc.on("end", () => {});

  doc.font("Times-Roman").fontSize(12).text(improvedContent, { align: "left" });
  doc.end();

  const pdfBuffer = Buffer.concat(buffers);

  const analysis = { keywords };

  // Additional heuristic suggestions (try to decode base64 and run simple checks)
  let decoded = "";
  try {
    const buf = Buffer.from(base64CV, "base64");
    decoded = buf.toString("utf8");
  } catch (e) {
    decoded = "";
  }

  const suggestions = [];
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(decoded);
  const hasPhone = /\+?\d[\d \-()]{6,}\d/.test(decoded);
  if (!hasEmail) suggestions.push("הוסף כתובת אימייל מקצועית בראש הקורות החיים.");
  if (!hasPhone) suggestions.push("הוסף מספר טלפון ברור ליצירת קשר.");

  const lower = decoded.toLowerCase();
  const sections = ["ניסיון", "השכלה", "כישורים", "projects", "experience", "education"];
  const foundSection = sections.some(s => lower.includes(s));
  if (!foundSection) suggestions.push("הוספת כותרות ברורות (ניסיון/השכלה/כישורים) תשפר קריאות.");

  if (!/\d+/.test(decoded)) suggestions.push("הדגש הישגים כמותיים (אחוזים, סכומים, מספרים) כדי להמחיש השפעה.");

  // Technology check using job description keywords too
  if (keywords && keywords.length) {
    const techs = keywords.filter(k => /javascript|python|react|node|java|docker|sql|git|c#/i.test(k));
    if (!techs.length) suggestions.push("צויין תיאור משרה ללא אזכור טכנולוגיות — אם יש לך ניסיון בטכנולוגיות, ציין אותן בבירור.");
  }

  // action verbs
  if (/אחראי על|עבדתי|התמודד עם|היה אחראי/.test(lower)) suggestions.push("החלף ניסוחים פסיביים בפעלים מדידים וחזקים (למשל: 'הובילתי', 'שיפרתי', 'הגדלתי').");

  if (suggestions.length === 0) {
    suggestions.push("נראה שקורות החיים כוללים פרטים חשובים — שקול להדגיש הישגים כמותיים ולציין טכנולוגיות רלוונטיות.");
  }

  analysis.suggestions = suggestions;

  return { improvedContent: pdfBuffer, analysis };
};

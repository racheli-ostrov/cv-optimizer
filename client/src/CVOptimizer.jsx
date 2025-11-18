// CVOptimizer.jsx (moved into src)
import React, { useCallback, useRef, useState } from "react";
import "./styles.css";


// Dynamically import heavy libs to avoid bundling them if not necessary
const loadPdfJs = async () => {
  try {
    const pdfjs = await import("pdfjs-dist/build/pdf");
    try {
      if (pdfjs && pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js`;
      }
    } catch (e) {}
    return pdfjs;
  } catch (e) {
    console.warn("pdfjs-dist not available (did you install it?)", e);
    return null;
  }
};

const loadMammoth = async () => {
  try {
    const mammoth = await import("mammoth");
    return mammoth;
  } catch (e) {
    return null;
  }
};

export default function ResumeAIClient() {
  const [fileName, setFileName] = useState(null);
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const fileInputRef = useRef(null);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  async function handleFile(file) {
    setParsing(true);
    setAnalysis(null);
    setFileName(file.name);
    setUploadedFile(file);
    try {
      const text = await extractTextFromFile(file);
      setRawText(text);
      const heur = runHeuristicAnalysis(text);
      setAnalysis(heur);
    } catch (err) {
      console.error(err);
      setRawText("(שגיאה בקריאת הקובץ - נסה פורמט אחר או העלה שוב)");
    } finally {
      setParsing(false);
    }
  }

  async function extractTextFromFile(file) {
    const ext = (file.name || "").split(".").pop()?.toLowerCase() || "";
    if (ext === "txt") return await file.text();
    if (ext === "pdf") {
      const pdfjs = await loadPdfJs();
      if (!pdfjs) throw new Error("pdfjs not loaded");
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let full = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const txtContent = await page.getTextContent();
        const pageText = txtContent.items.map((it) => it.str).join(" ");
        full += pageText + "\n\n";
      }
      return full;
    }
    if (ext === "docx" || ext === "doc") {
      const mammoth = await loadMammoth();
      if (!mammoth) throw new Error("mammoth (DOCX parser) not installed");
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result && result.value ? result.value : "";
    }
    try { return await file.text(); } catch (e) { throw new Error("Unsupported file type or cannot read file"); }
  }

  function runHeuristicAnalysis(text) {
    const suggestions = [];
    const normalized = text.replace(/\s+/g, " ").trim();
    const length = normalized.length;
    const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
    const hasPhone = /\+?\d[\d \-()]{6,}\d/.test(text);
    if (!hasEmail) suggestions.push("אין כתובת אימייל מוקדמת בקורות החיים — הוסף כתובת אימייל מקצועית.");
    if (!hasPhone) suggestions.push("אין מספר טלפון ברור — ודא שמספר ליצירת קשר מופיע.");
    const lower = text.toLowerCase();
    const sections = ["התנסות","ניסיון","השכלה","השכלה","כישורים","skills","experience","education","projects","הישגים"];
    const foundSection = sections.some(s => lower.includes(s));
    if (!foundSection) suggestions.push("לא מזוהות כותרות ברורות (ניסיון/השכלה/כישורים). שקול להוסיף כותרות ברורות כדי לשפר קריאות.");
    const hasNumbers = /\d+/.test(text);
    if (!hasNumbers) suggestions.push("אין נתונים כמותיים - שקול להוסיף מספרים (אחוזים, סכומים, כמויות) כדי להדגיש הישגים.");
    if (length > 4000) suggestions.push("הקורות החיים ארוכים מאוד — שקול לקצר לעמוד או שניים ולהתמקד בהישגים הרלוונטיים.");
    else if (length < 600) suggestions.push("קורות החיים קצרים יחסית — הוסף פרטים רלוונטיים על פרויקטים, כישורים והישגים.");
    const passiveWords = ["אחראי על","התמודד עם","עבדתי על","היה אחראי"];
    const hasPassive = passiveWords.some(p => lower.includes(p));
    if (hasPassive) suggestions.push("שקול להחליף ניסוחים פסיבייים לפעלים חזקים ומדידים (למשל: 'שיפרתי', 'הובלת', 'הגדלתי').");
    if (!/javascript|python|java|react|node|docker|git|sql|c#/i.test(text)) suggestions.push("אין אזכור טכנולוגיות נפוצות — אם יש לך ניסיון בטכנולוגיות, ציין אותן במפורש.");
    const sentences = normalized.split(/[\.!?]\s/).filter(Boolean);
    const avgWords = sentences.length ? normalized.split(/\s+/).length / sentences.length : 0;
    const readability = Math.max(0, 100 - Math.min(80, Math.round(avgWords * 3)));
    if (avgWords > 25) suggestions.push("חלק מהמשפטים ארוכים מאוד — שקול לחלק משפטים מורכבים למשפטים קצרים וברורים.");
    if (!/תוֹר|CV|resume|קורות/gi.test(text)) suggestions.push("שקול להתחיל בכותרת ברורה עם שם ותפקיד רלוונטי (למשל: 'דנה לוי — מפתחת תוכנה').");
    const unique = Array.from(new Set(suggestions));
    return { suggestions: unique, scores: { readability: readability, lengthPenalty: length > 4000 ? 1 : 0 } };
  }

  async function callRemoteAI(apiUrl, text) {
    setLoadingAI(true);
    try {
      const res = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      if (!res.ok) throw new Error("remote AI failed");
      const body = await res.json();
      const remoteSuggestions = Array.isArray(body.suggestions) ? body.suggestions : [];
      setAnalysis(prev => ({ suggestions: [...(prev?.suggestions || []), "--- הצעות מתקדמות מהמנוע המרוחק ---", ...remoteSuggestions], scores: prev?.scores || {} }));
    } catch (e) {
      console.error(e);
      setAnalysis(prev => ({ suggestions: [...(prev?.suggestions || []), "שגיאה בבקשה למנוע החיצוני. ודא שהשרת פועל או בדוק את ה-API URL."], scores: prev?.scores || {} }));
    } finally { setLoadingAI(false); }
  }

  // Upload CV file and job description to the server endpoint which runs the LLM
  async function optimizeOnServer() {
    if (!uploadedFile) {
      alert("אין קובץ להעלות — העלה קובץ לפני שליחה לסרבר.");
      return;
    }
    if (!jobText) {
      alert("הזן תיאור משרה לפני שליחה לסרבר.");
      return;
    }

    setLoadingAI(true);
    setDownloadUrl(null);
    try {
      const form = new FormData();
      // server expects field name 'cv' for the uploaded file and jobDescription in body
      form.append("cv", uploadedFile);
      form.append("jobDescription", jobText);

      // If server runs locally on port 3000, call that URL. Adjust if different.
      const res = await fetch("http://localhost:3000/api/optimize-for-job", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Server returned an error");
      }

      const body = await res.json();
      if (body && body.filename) {
        const url = `http://localhost:3000/api/download/${encodeURIComponent(body.filename)}`;
        setDownloadUrl(url);
        // open in new tab to download
        window.open(url, "_blank");
      } else {
        alert("השרת החזיר תשובה ללא קובץ להורדה.");
      }
    } catch (e) {
      console.error(e);
      alert("שגיאה בתקשורת עם השרת: " + e.message);
    } finally {
      setLoadingAI(false);
    }
  }

  const [jobText, setJobText] = useState("");

  const downloadFile = (type) => {
    const content = rawText || "";
    const blob = new Blob([content], { type: type === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = type === "pdf" ? "optimized-cv.pdf" : "optimized-cv.docx";
    a.click();
    URL.revokeObjectURL(url);
  };

  function clearAll() { setFileName(null); setRawText(""); setAnalysis(null); }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Resume AI — העלה קורות חיים וקבל שיפור</h1>
      <div onDrop={onDrop} onDragOver={onDragOver} className="border-dashed border-2 border-gray-300 rounded-lg p-6 mb-4 bg-white">
        <p className="mb-2">גרור לכאן קובץ קורות חיים (PDF, DOCX, TXT) או לחץ על הכפתור להעלאה.</p>
        <div className="flex gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">העלה קובץ</button>
          <button onClick={clearAll} className="px-4 py-2 border rounded">נקה</button>
        </div>
        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={e => { if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]); }} />
        {fileName && <div className="mt-4 text-sm text-gray-600">קובץ: {fileName}</div>}
      </div>
      <div className="mb-6 p-4 border rounded bg-gray-50">
        <h3 className="font-semibold mb-2">תיאור משרה</h3>
        <p className="text-sm text-gray-600 mb-2">הדבק כאן את תיאור המשרה, והמערכת תתאים אוטומטית את קורות החיים.</p>
        <textarea className="w-full h-32 p-3 border rounded resize-none" placeholder="הדבק תיאור משרה..." value={jobText} onChange={e => setJobText(e.target.value)} />
        <button onClick={optimizeOnServer} disabled={loadingAI} className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">שלח לסרבר לאופטימיזציה</button>
        {downloadUrl && (
          <div className="mt-2">
            <a href={downloadUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">הורד קובץ ממחולל הסרבר</a>
          </div>
        )}
      </div>
      <div className="my-6 flex gap-4">
        <button onClick={() => downloadFile("pdf")} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">הורד PDF</button>
        <button onClick={() => downloadFile("docx")} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">הורד Word</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <div className="mb-2 text-sm font-medium">תצוגת טקסט חילוץ</div>
          <textarea className="w-full h-56 p-3 border rounded resize-none" value={rawText} onChange={e => setRawText(e.target.value)} />
          <div className="flex gap-2 mt-2">
            <button onClick={() => setAnalysis(runHeuristicAnalysis(rawText))} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">הרץ בדיקה מהירה</button>
            <button onClick={() => callRemoteAI("/api/analyze", rawText)} disabled={loadingAI} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50">הרץ עם מנוע חיצוני</button>
          </div>
          <div className="mt-4 text-sm text-gray-500">טיפ: אם אין חילוץ טוב מ־PDF, נסה לשמור כ־TXT או להעלות DOCX.</div>
        </div>
        <aside className="md:col-span-1 p-4 border rounded bg-gray-50">
          <h3 className="font-semibold mb-2">תוצאות הניתוח</h3>
          {parsing && <div className="text-sm">קורא קובץ...</div>}
          {!parsing && !analysis && <div className="text-sm text-gray-500">אין תוצאות עדיין. העלה קובץ או לחץ "הרץ בדיקה מהירה".</div>}
          {analysis && (
            <div className="space-y-2">
              <div className="text-sm font-medium">הצעות</div>
              <ul className="list-disc list-inside text-sm">{analysis.suggestions.map((s, i) => (<li key={i}>{s}</li>))}</ul>
              <div className="mt-2 text-xs text-gray-600">ניקוד קריאות (גס): {analysis.scores.readability ?? "-"}{analysis.scores.lengthPenalty ? " · אורך גדול מדי" : ""}</div>
            </div>
          )}
          <div className="mt-4"><div className="text-sm font-medium mb-1">שלבים מומלצים</div><ol className="list-decimal list-inside text-sm"><li>עדכן פרטי קשר ברורים בראש הקובץ.</li><li>הדגש הישגים כמותיים במקום תיאורי תפקיד בלבד.</li><li>ציין טכנולוגיות וכישורים מרכזיים בכותרת "Skills".</li><li>קצר משפטים ארוכים והשתמש בפעלים מדידים.</li></ol></div>
        </aside>
      </div>
      <div className="mt-6">
        <h3 className="font-semibold mb-2">אפשרויות מתקדמות</h3>
        <p className="text-sm text-gray-600 mb-2">אתה יכול לחבר את הכפתור "הרץ עם מנוע חיצוני" לנקודת קצה במערכת שלך שמריצה מודל שפה (OpenAI / Azure / או מודל פרטי). מומלץ להריץ קריאות ל־AI רק מהשרת (backend) ולא ישירות מקוד הלקוח כדי לשמור על מפתחות API.</p>
        <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">{`// דוגמה ל-body הנשלח ל-backend
POST /api/analyze
{ "text": "...הטקסט שיוחלץ..." }

// backend -> מפעיל מודל LLM ומחזיר:
{ "suggestions": ["הצע המלצה 1", "הצע המלצה 2"] }
`}</pre>
      </div>
      <footer className="mt-8 text-sm text-gray-500">נוצר על ידי ResumeAIClient — ניתן להתאים בקלות לצרכים נוספים: אי‑מייל אוטומטי, תיקוני פורמט, יצוא כ־PDF ועוד.</footer>
    </div>
  );
}

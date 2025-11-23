import React, { useRef, useState, useEffect } from "react";
import "./styles.css";

export default function CVOptimizer() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeFade, setWelcomeFade] = useState(false);
  const fileInputRef = useRef(null);
  const [waitingCount, setWaitingCount] = useState(0);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [cvSuggestions, setCvSuggestions] = useState([]);
  const [awaitingImproveAnswer, setAwaitingImproveAnswer] = useState(false);
  const [awaitingDownloadAnswer, setAwaitingDownloadAnswer] = useState(false);
  const [improvedContent, setImprovedContent] = useState("");

  useEffect(() => {
    addMessage("היי! ברוכה הבאה למערכת Resume AI ✨", "ai");
  }, []);

  const addMessage = (text, sender = "user") => {
    setMessages((prev) => [...prev, { text, sender }]);
  };



  async function sendFileToServer(file) {
    try {
      addMessage("מנתח את הנתונים שלך - תהליך זה עשוי לקחת כמה רגעים...", "ai");

      const form = new FormData();
      form.append("cv", file, file.name);

      const res = await fetch("http://localhost:3000/api/optimize-for-job", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const txt = await res.text();
        if (txt.includes('"code":429')) {
          addMessage("המערכת עמוסה כרגע, אנא נסה שנית בעוד מספר שניות ⏳", "ai");
          return;
        }
        addMessage(`שגיאה מהשרת: ${txt}`, "ai");
        return;
      }

      const body = await res.json();

      // שמירת ההמלצות לשיפור
      let suggestions = [];
      if (body.analysis && Array.isArray(body.analysis.suggestions)) {
        suggestions = body.analysis.suggestions;
      }
      setCvSuggestions(suggestions);

      // שמירת הגרסה המשופרת להורדה
      const improvedText = body.improvedResume || "";
      setImprovedContent(improvedText);

      // הודעות למשתמש
      setTimeout(() => {
        addMessage('האם אתה רוצה שנכתוב יחד קורות חיים משופרים?', "ai");
        setAwaitingImproveAnswer(true);
      }, 600);

      setAnalysisDone(true);

    } catch (e) {
      console.error(e);
      addMessage("שגיאה בתקשורת עם השרת — בדוק שהשרת רץ ונסה שוב.", "ai");
    }
  }

  // פונקציה להורדת PDF
  const downloadImprovedPDF = async (improvedContent) => {
    if (!improvedContent || improvedContent.trim() === "") {
      addMessage("אין תוכן משופר להורדה.", "ai");
      return;
    }

    const response = await fetch("http://localhost:3000/api/download-improved-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ improvedContent }),
    });

    if (!response.ok) {
      let txt = "Failed to generate PDF";
      try {
        txt = await response.text();
      } catch { }
      throw new Error(txt || "Failed to generate PDF");
    }

    const arrayBuffer = await response.arrayBuffer();

    const blob = new Blob([arrayBuffer], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    const firstLine = improvedContent.split("\n")[0].trim();
    const safeFileName = firstLine.replace(/[\/\\?%*:|"<>]/g, "_");
    a.href = url;
    a.download = `${safeFileName} improved.pdf`;
    document.body.appendChild(a); // חייבים להוסיף ל-DOM לפני click
    a.click();
    a.remove(); // להסיר אחרי ההורדה
    window.URL.revokeObjectURL(url); // לשחרר זיכרון


  };



  const onSend = async () => {
    if (!input.trim()) return;

    if (showWelcome) {
      setWelcomeFade(true);
      setTimeout(() => setShowWelcome(false), 500);
    }

    addMessage(input, "user");

    const answer = input.trim().toLowerCase();

    // פונקציה שממירה הצעות AI ל-type ו-severity
    function mapSuggestions(cvSuggestions) {
      return cvSuggestions.map(s => {
        let type = "content"; // ברירת מחדל
        let severity = 1;     // ברירת מחדל: קל

        const lower = s.toLowerCase();

        // זיהוי סוג ההצעה לפי מילים מפתח
        if (lower.includes("grammar") || lower.includes("spelling")) type = "grammar";
        else if (lower.includes("format") || lower.includes("layout")) type = "formatting";
        else if (lower.includes("experience") || lower.includes("work")) type = "experience";
        else if (lower.includes("skills") || lower.includes("ability")) type = "skills";
        else if (lower.includes("content") || lower.includes("description")) type = "content";

        // זיהוי חומרה לפי מילים מפתח
        if (lower.includes("major") || lower.includes("important")) severity = 3;
        else if (lower.includes("medium") || lower.includes("consider")) severity = 2;
        else severity = 1;

        return { text: s, type, severity };
      });
    }

    // פונקציה לחישוב הציון הדינמי
    function calculateCVScore(mappedSuggestions) {
      const baseWeights = {
        grammar: 5,
        formatting: 7,
        content: 10,
        skills: 8,
        experience: 10
      };

      let totalPoints = 0;
      mappedSuggestions.forEach(s => {
        if (s.type && baseWeights[s.type]) {
          totalPoints += baseWeights[s.type] * s.severity;
        }
      });

      let score = Math.max(0, 100 - totalPoints); // מתחיל מ-100 ומפחית נקודות
      if (mappedSuggestions.length === 0) score = 100; // אם אין הצעות → ציון מקסימלי

      return score;
    }

    // פונקציה שמקבלת את הצעות ה-AI ומחזירה את הציון והטקסט המפורמט
    function processCVSuggestions(cvSuggestions) {
      const mapped = mapSuggestions(cvSuggestions);
      const score = calculateCVScore(mapped);
      const formattedText = mapped.map(s => s.text).join("\n");

      return { score, formattedText };
    }

    // שימוש בפונקציה
    const { score, formattedText } = processCVSuggestions(cvSuggestions);



    // --- שלב 1: ניתוח והצגת המלצות לשיפור ---
    if (awaitingImproveAnswer) {
      if (answer === "כן" || answer === "yes") {
        if (cvSuggestions.length > 0) {
          const first = cvSuggestions[0];
          const last = cvSuggestions[cvSuggestions.length - 1];
          const middle = cvSuggestions.slice(1, -1);

          let formattedSuggestions = "";
          if (first) formattedSuggestions += `${first}\n`;
          middle.forEach((s, i) => {
            formattedSuggestions += `${i + 1}. ${s}\n`;
          });
          if (last && cvSuggestions.length > 1) formattedSuggestions += `${last}\n`;

          const { score } = processCVSuggestions(cvSuggestions); // מחשב את הציון הדינמי
          addMessage(
            `הקורות חיים שלך מצוינים והם מקבלים ציון של ${score}.\n\n${formattedSuggestions}`,
            "ai"
          );

        } else {
          addMessage("אין לי הערות לשיפור, קורות החיים שלך מצוינים!", "ai");
        }

        setAwaitingImproveAnswer(false);
        setAwaitingDownloadAnswer(true); // שלב הבא: הורדת PDF
        addMessage("שנוציא יחד קובץ חדש ומשוכלל יותר של קורות חיים בשבילך?", "ai");
      } else if (answer === "לא" || answer === "no") {
        addMessage(
          "חבל מאוד--- יכולת לקבל קורות חיים טובים יותר, אם את/ה מתחרט/ת אפשר תמיד להעלות שוב",
          "ai"
        );
        setAwaitingImproveAnswer(false);
      } else {
        addMessage(' 🤔 על פי תשובתך לא הבנתי אם כן או לא', "ai");
      }

      setInput("");
      return;
    }

    // --- שלב 2: הורדת PDF ---
    if (awaitingDownloadAnswer) {
      if (answer === "כן" || answer === "yes") {
        try {
          // קריאה לפונקציה שמבקשת מהשרת ליצור ולהחזיר PDF
          await downloadImprovedPDF(improvedContent);
          addMessage("ה-PDF נוצר בהצלחה! תוכל/י להוריד אותו עכשיו.", "ai");
        } catch (err) {
          addMessage("שגיאה ביצירת ה-PDF, נסה/י שוב מאוחר יותר.", "ai");
        }
      } else if (answer === "לא" || answer === "no") {
        addMessage("בסדר, אם תרצה/י אפשר תמיד לנסות שוב.", "ai");
      } else {
        addMessage(' 🤔 לא הבנתי אם רוצים להוריד את הקובץ או לא', "ai");
      }

      setAwaitingDownloadAnswer(false);
      setInput("");
      return;
    }

    // --- אם המשתמש עוד לא העלה קובץ ---
    if (!uploadedFile) {
      setWaitingCount(waitingCount + 1);
      setTimeout(() => {
        addMessage(
          waitingCount === 0 ? "היי אני מחכה לקורות חיים שלך" : "קורות חיים חביבי ,קורות חיים -לא סיפורי חיים",
          "ai"
        );
      }, 600);
      setInput("");
      return;
    }

    if (analysisDone) {
      setInput("");
      return;
    }

    setInput("");
  };

  const handleFileUpload = (file) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      addMessage("❌ נא להעלות קובץ Word או PDF בלבד", "ai");
      return;
    }

    setFileName(file.name);
    setUploadedFile(file);
    setWaitingCount(0);
    setAnalysisDone(false);
    setCvSuggestions([]);
    setAwaitingImproveAnswer(false);
    addMessage(`📄 ${file.name}`, "user");

    setTimeout(() => {
      addMessage("הקורות חיים באמצע ניתוח- זה הזמן להתפלל🙏", "ai");
    }, 400);

    setTimeout(() => {
      addMessage("קיבלתי את הקורות חיים שלך- ניכרת ההשקעה והזמן🙌", "ai");
    }, 1200);

    setTimeout(() => {
      sendFileToServer(file);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto fade-in" style={{ paddingBottom: "6rem" }}>
      <h3 className="text-3xl font-bold mb-4" style={{ color: "var(--gemini-indigo)" }}>
        🐾 ChatCV — הבא נשדרג את הקורות חיים שלך
      </h3>

      <div className="shadow-card p-4" style={{ height: "70vh", overflowY: "auto" }}>
        {messages.map((msg, i) => {
          const isWelcome = msg.sender === "ai" && i === 0;
          return (
            <div
              key={i}
              className={`mb-4 flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              style={{
                opacity: isWelcome && welcomeFade ? 0 : 1,
                transition: isWelcome ? "opacity 0.5s ease" : undefined,
                display: isWelcome && !showWelcome ? "none" : "flex",
              }}
            >
              <div
                className="p-3 rounded-2xl msg-bubble"
                style={{
                  background:
                    msg.sender === "user"
                      ? "linear-gradient(to right, var(--gemini-blue), var(--gemini-indigo))"
                      : "var(--gemini-card)",
                  color: msg.sender === "user" ? "white" : "var(--gemini-text)",
                  boxShadow:
                    msg.sender === "ai" ? "0 0 12px rgba(99,102,241,0.5)" : "none",
                }}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="shadow-card"
        style={{
          position: "fixed",
          bottom: "1rem",
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "64rem",
          display: "flex",
          gap: "0.5rem",
          padding: "1rem",
          background: "var(--gemini-card)",
        }}
      >
        <button
          className="btn-purple"
          onClick={() => fileInputRef.current?.click()}
          style={{ whiteSpace: "nowrap" }}
        >
          ✚
        </button>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
        />

        <input
          className="flex-1"
          placeholder="Ask Anything"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
      </div>
    </div>
  );
}
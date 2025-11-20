
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
  const [improvingSuggestions, setImprovingSuggestions] = useState([]);
  const [awaitingImproveAnswer, setAwaitingImproveAnswer] = useState(false);
  const [awaitingDownloadAnswer, setAwaitingDownloadAnswer] = useState(false);
  const [improvedContent, setImprovedContent] = useState("");
  useEffect(() => {
    addMessage("היי! ברוכה הבאה למערכת Resume AI ✨", "ai");
  }, []);

  const addMessage = (text, sender = "user") => {
    setMessages((prev) => [...prev, { text, sender }]);
  };

  // Reset UI to initial waiting-for-CV state
  const resetToInitial = () => {
    addMessage("היי אני מחכה לקורות חיים שלך — את/ה יכול/ה להעלות קובץ בכל שלב", "ai");
    setUploadedFile(null);
    setFileName(null);
    setAnalysisDone(false);
    setImprovedContent("");
    setImprovingSuggestions([]);
    setAwaitingImproveAnswer(false);
    setAwaitingDownloadAnswer(false);
    setInput("");
  };

  const onSend = async () => {
    if (!input.trim()) return;

    if (showWelcome) {
      setWelcomeFade(true);
      setTimeout(() => setShowWelcome(false), 500);
    }

    addMessage(input, "user");

    const answer = input.trim().toLowerCase();

    // --- שלב 1: ניתוח והצגת המלצות לשיפור ---
    if (awaitingImproveAnswer) {
      if (answer === "כן" || answer === "yes" || answer === "fi" || answer === "כו") {
        if (improvingSuggestions.length > 0) {
          const first = improvingSuggestions[0];
          const last = improvingSuggestions[improvingSuggestions.length - 1];
          const middle = improvingSuggestions.slice(1, -1);

          let formattedSuggestions = "";
          if (first) formattedSuggestions += `${first}\n`;
          middle.forEach((s, i) => {
            formattedSuggestions += `${i + 1}. ${s}\n`;
          });
          if (last && improvingSuggestions.length > 1) formattedSuggestions += `${last}\n`;

          addMessage(
            `קורות החיים שלך מצוינים!!! הנה כמה המלצות לשיפור:\n\n${formattedSuggestions}`, 
            "ai"
          );
        } else {
          addMessage("אין לי הערות לשיפור, קורות החיים שלך מצוינים!", "ai");
        }

        setAwaitingImproveAnswer(false);
        setAwaitingDownloadAnswer(true); // שלב הבא: הורדת PDF
        addMessage("שנוציא יחד קובץ חדש ומשוכלל יותר של קורות חיים בשבילך?", "ai");
      } else if (answer === "לא" || answer === "no") {
        // User declined improvement flow: reset to initial waiting state
        resetToInitial();
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
        } catch (err) {
          addMessage("שגיאה ביצירת ה-PDF, נסה/י שוב מאוחר יותר.", "ai");
        }
      } else if (answer === "לא" || answer === "no") {
        // User declined download: reset to initial waiting state
        resetToInitial();
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

  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  const handleFileUpload = async (file) => {
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
    setImprovingSuggestions([]);
    setAwaitingImproveAnswer(false);
    addMessage(`📄 ${ file.name }`, "user");

    // show AI messages with a short delay between them to simulate typing
    await wait(500);
    addMessage("קורות החיים באמצע ניתוח- זה הזמן להתפלל🙏", "ai");
    await wait(500);
    addMessage("קיבלתי את קורות החיים שלך- ניכרת ההשקעה והזמן🙌", "ai");
    await wait(500);

    // Small additional pause before starting server upload
    // addMessage("מכינה את הקובץ לשליחה לשרת…", "ai");
    sendFileToServer(file);
  };

  async function sendFileToServer(file) {
    try {
      addMessage("מנתח את הנתונים שלך -תהליך זה עשוי לקחת כמה רגעים...", "ai");
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
        addMessage(`שגיאה מהשרת: ${ txt }`, "ai");
        return;
      }

      const body = await res.json();
      let suggestions = [];
      if (body.analysis && Array.isArray(body.analysis.suggestions)) {
        suggestions = body.analysis.suggestions;
      }
      setImprovingSuggestions(suggestions);

      setTimeout(() => {
        addMessage('האם אתה רוצה שנכתוב יחד קורות חיים משופרים?', "ai");
        setAwaitingImproveAnswer(true);
      }, 600);

      setImprovedContent("קורות חיים משופרים:\n\n" + suggestions.join("\n"));
      setAnalysisDone(true);
    } catch (e) {
      console.error(e);
      addMessage("שגיאה בתקשורת עם השרת — בדוק שהשרת רץ ונסה שוב.", "ai");
    }
  }

  const downloadImprovedPDF = async (improvedContent) => {
    console.log("Sending to PDF:", improvedContent);
    const response = await fetch("http://localhost:3000/api/download-improved-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ improvedContent }),
    });
    if (!response.ok) {
      // Try to extract server error text for better debugging
      let txt = "Failed to generate PDF";
      try {
        txt = await response.text();
      } catch (e) {
        // ignore
      }
      throw new Error(txt || "Failed to generate PDF");
    }

    // Read as ArrayBuffer then build a Blob with explicit PDF MIME type
    const arrayBuffer = await response.arrayBuffer();
    // Quick sanity check: small responses may be error messages
    if (arrayBuffer.byteLength < 50) {
      // decode as text to surface server-side error
      const txt = new TextDecoder().decode(arrayBuffer);
      throw new Error(`Server returned unexpected small response: ${ txt }`);
    }

    const blob = new Blob([arrayBuffer], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "improved_cv.pdf";
    a.click();

    // small delay to let the browser start the download, then reset UI
    try {
      await wait(500);
    } catch (e) {
      // ignore if wait isn't available
    }

    // show a friendly closing message and reset state back to initial
    addMessage("מקווים שאת/ה מרוצה — עדכן/י כשקיבלת משרה! 🙂", "ai");
    setUploadedFile(null);
    setFileName(null);
    setAnalysisDone(false);
    setImprovedContent("");
    setImprovingSuggestions([]);
    setAwaitingImproveAnswer(false);
    setAwaitingDownloadAnswer(false);
    setInput("");
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
              className={`mb - 4 flex ${ msg.sender === "user" ? "justify-end" : "justify-start" }`}
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
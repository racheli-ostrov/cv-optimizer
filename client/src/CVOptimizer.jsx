// Gemini Chat React component: Welcome message with fade-out effect after first Enter
import React, { useCallback, useRef, useState, useEffect } from "react";
import "./styles.css";

export default function CVOptimizer() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeFade, setWelcomeFade] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Show welcome message on first load
    addMessage("היי! ברוכה הבאה למערכת Resume AI ✨", "ai");
  }, []);

  const addMessage = (text, sender = "user") => {
    setMessages((prev) => [...prev, { text, sender }]);
  };

  const onSend = () => {
    if (!input.trim()) return;

    if (showWelcome) {
      setWelcomeFade(true);
      setTimeout(() => setShowWelcome(false), 500); // fade out duration
    }

    addMessage(input, "user");
    // If a file is uploaded, treat the input as a job description and send to server
    if (uploadedFile) {
      addMessage("קיבלתי! שולחת את הקובץ לסרבר לעיבוד...", "ai");
      sendFileToServer(uploadedFile, input.trim());
    } else {
      // No file: keep the friendly mock response
      setTimeout(() => {
        addMessage("קיבלתי! מנתחת את קורות החיים שלך ✨", "ai");
      }, 600);
    }

    setInput("");
  };

  const handleFileUpload = (file) => {
    setFileName(file.name);
    setUploadedFile(file);
    addMessage(`📄 קובץ נטען: ${file.name}`, "user");

    setTimeout(() => {
      addMessage("מחלצת טקסט מהקובץ…", "ai");
    }, 400);
    setTimeout(() => {
      addMessage("הטקסט חולץ בהצלחה! עכשיו אפשר לנתח או לערוך אותו.", "ai");
    }, 1200);
    // don't auto-send here; wait for user to enter job description and press Enter
    sendFileToServer(file, "software developer");
  };

  async function sendFileToServer(file, jobDescription) {
    try {
      let jd = jobDescription || "software developer";
      addMessage("מעלה קובץ ומחכה לתשובה מהשרת...", "ai");
      const form = new FormData();
      // include filename explicitly
      if (file && file instanceof File) {
        form.append("cv", file, file.name);
      } else {
        // if it's a blob-like, append as-is
        form.append("cv", file);
      }
      form.append("jobDescription", jd);

      // debug: list form entries
      try {
        for (const pair of form.entries()) {
          console.log("Form entry:", pair[0], pair[1]);
        }
      } catch (e) {
        console.warn(e);
      }

      const res = await fetch("http://localhost:3000/api/optimize-for-job", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const txt = await res.text();
        addMessage(`שגיאה מהשרת: ${txt}`, "ai");
        return;
      }

      const body = await res.json();
      if (body && body.filename) {
        const downloadUrl = `http://localhost:3000/api/download/${encodeURIComponent(body.filename)}`;
        addMessage("הסרבר חזר עם קובץ מעובד — תחילת הורדה אוטומטית.", "ai");
        // Open download in new tab
        window.open(downloadUrl, "_blank");
        addMessage(`✅ קובץ מוכן להורדה: ${body.filename}`, "ai");
        // If server returned analysis, show suggestions
        if (body.analysis && Array.isArray(body.analysis.suggestions)) {
          addMessage("ניתוח והצעות לשיפור:", "ai");
          body.analysis.suggestions.forEach(s => addMessage(`• ${s}`, "ai"));
        } else if (body.analysis && body.analysis.keywords) {
          addMessage(`מילות מפתח זוהו: ${body.analysis.keywords.join(", ")}`, "ai");
        }
      } else {
        addMessage("הסרבר החזיר תשובה אך לא סיפק קובץ להורדה.", "ai");
      }
    } catch (e) {
      console.error(e);
      addMessage("שגיאה בתקשורת עם השרת — בדוק שהשרת רץ ונסה שוב.", "ai");
    }
  }

  return (
    <div className="max-w-4xl mx-auto fade-in" style={{ paddingBottom: "6rem" }}>
      <h3 className="text-3xl font-bold mb-4" style={{ color: "var(--gemini-indigo)" }}>
        🐾 ChatCV — בואי נשדרג את הקורות חיים שלך
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
                display: isWelcome && !showWelcome ? 'none' : 'flex'
              }}
            >
              <div
                className="p-3 rounded-2xl max-w-xs"
                style={{
                  background:
                    msg.sender === "user"
                      ? "linear-gradient(to right, var(--gemini-blue), var(--gemini-indigo))"
                      : "var(--gemini-card)",
                  color: msg.sender === "user" ? "white" : "var(--gemini-text)",
                  boxShadow: msg.sender === "ai" ? "0 0 12px rgba(99,102,241,0.5)" : "none",
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
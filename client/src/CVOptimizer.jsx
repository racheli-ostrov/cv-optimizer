// import React, { useRef, useState, useEffect } from "react";
// import "./styles.css";

// export default function CVOptimizer() {
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState("");
//   const [fileName, setFileName] = useState(null);
//   const [uploadedFile, setUploadedFile] = useState(null);
//   const [showWelcome, setShowWelcome] = useState(true);
//   const [welcomeFade, setWelcomeFade] = useState(false);
//   const fileInputRef = useRef(null);
//   const [waitingCount, setWaitingCount] = useState(0);
//   const [analysisDone, setAnalysisDone] = useState(false);
//   const [cvSuggestions, setCvSuggestions] = useState([]);
//   const [awaitingImproveAnswer, setAwaitingImproveAnswer] = useState(false);

//   useEffect(() => {
//     addMessage("היי! ברוכה הבאה למערכת Resume AI ✨", "ai");
//   }, []);

//   const addMessage = (text, sender = "user") => {
//     setMessages((prev) => [...prev, { text, sender }]);
//   };

// // ...existing code...
//   const onSend = () => {
//     if (!input.trim()) return;

//     if (showWelcome) {
//       setWelcomeFade(true);
//       setTimeout(() => setShowWelcome(false), 500);
//     }

//     addMessage(input, "user");

//     if (awaitingImproveAnswer) {
//       const answer = input.trim().toLowerCase();
//       if (answer === "כן" || answer === "yes") {
//         if (cvSuggestions.length > 0) {
//           // clean suggestions (ensure they are strings and remove accidental JSON wrapper)
//           const cleanSuggestions = cvSuggestions.map((s) =>
//             typeof s === "string" ? s.replace(/^\{[\s\S]*\}$/g, "").trim() : String(s)
//           );

//           const numbered = cleanSuggestions
//             .map((s, i) => `${i + 1}. ${s}`)
//             .join("\n");

//           // ensure an empty line before the numbered list so each item starts on its own line
//           addMessage(
//             `הקורות חיים שלך מצוינים והם מקבלים ציון של ${cleanSuggestions.length}.\n\nהערות לשיפור הקורות החיים:\n\n${numbered}`,
//             "ai"
//           );
//         } else {
//           addMessage("אין לי הערות לשיפור, קורות החיים שלך מצוינים!", "ai");
//         }
//         setAwaitingImproveAnswer(false);
//         // new separate question message
//         addMessage("שנוציא יחד קובץ חדש ומתוקן של קורות חיים בשבילך?", "ai");
//       } else if (answer === "לא" || answer === "no") {
//         addMessage("חבל מאוד--- יכולת לקבל קורות חיים טובים יותר, אם את/ה מתחרט/ת אפשר תמיד להעלות שוב", "ai");
//         setAwaitingImproveAnswer(false);
//       } else {
//         addMessage('אנא ענה "כן" או "לא"', "ai");
//       }
//       setInput("");
//       return;
//     }

//     // אם לא הועלה קובץ, הצג הודעת המתנה מתאימה
//     if (!uploadedFile) {
//       setWaitingCount(waitingCount + 1);
//       setTimeout(() => {
//         addMessage(
//           waitingCount === 0
//             ? "היי אני מחכה לקורות חיים שלך"
//             : "עדיין מחכה----",
//           "ai"
//         );
//       }, 600);
//       setInput("");
//       return;
//     }

//     // אם כבר בוצע ניתוח, הצג הודעות שירות בלבד
//     if (analysisDone) {
//       setInput("");
//       return;
//     }

//     setInput("");
//   };

//   const handleFileUpload = (file) => {
//     setFileName(file.name);
//     setUploadedFile(file);
//     setWaitingCount(0);
//     setAnalysisDone(false);
//     setCvSuggestions([]);
//     setAwaitingImproveAnswer(false);
//     addMessage(`📄 קובץ נטען: ${file.name}`, "user");

//     setTimeout(() => {
//       addMessage("הקורות חיים באמצע ניתוח- זה הזמן להתפלל🙏", "ai");
//     }, 400);

//     setTimeout(() => {
//       addMessage("קיבלתי את הקורות חיים שלך- ניכרת ההשקעה והזמן🙌", "ai");
//       // שלח לשרת לקבלת המלצות בלבד
//       sendFileToServer(file);
//     }, 1200);
//   };

//   async function sendFileToServer(file) {
//     try {
//       addMessage("מנתח את הנתונים שלך -תהליך זה עלול לקחת כמה רגעים...", "ai");
//       const form = new FormData();
//       if (file && file instanceof File) {
//         form.append("cv", file, file.name);
//       } else {
//         form.append("cv", file);
//       }

//       const res = await fetch("http://localhost:3000/api/optimize-for-job", {
//         method: "POST",
//         body: form,
//       });

//       if (!res.ok) {
//         const txt = await res.text();
//         addMessage(`שגיאה מהשרת: ${txt}`, "ai");
//         return;
//       }

//       const body = await res.json();

//       // שמור את ההערות לשיפור במצב
//       let suggestions = [];
//       if (
//         body.analysis &&
//         Array.isArray(body.analysis.suggestions) &&
//         body.analysis.suggestions.length > 0
//       ) {
//         suggestions = body.analysis.suggestions;
//       }
//       setCvSuggestions(suggestions);

//       // שאל את המשתמש אם הוא רוצה לשפר יחד
//       setTimeout(() => {
//         addMessage('האם אתה רוצה שנכתוב יחד קורות חיים משופרים?', "ai");
//         setAwaitingImproveAnswer(true);
//       }, 600);

//       setAnalysisDone(true);
//     } catch (e) {
//       console.error(e);
//       addMessage("שגיאה בתקשורת עם השרת — בדוק שהשרת רץ ונסה שוב.", "ai");
//     }
//   }

//   return (
//     <div className="max-w-4xl mx-auto fade-in" style={{ paddingBottom: "6rem" }}>
//       <h3 className="text-3xl font-bold mb-4" style={{ color: "var(--gemini-indigo)" }}>
//         🐾 ChatCV — בואי נשדרג את הקורות חיים שלך
//       </h3>

//       <div className="shadow-card p-4" style={{ height: "70vh", overflowY: "auto" }}>
//         {messages.map((msg, i) => {
//           const isWelcome = msg.sender === "ai" && i === 0;
//           return (
//             <div
//               key={i}
//               className={`mb-4 flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
//               style={{
//                 opacity: isWelcome && welcomeFade ? 0 : 1,
//                 transition: isWelcome ? "opacity 0.5s ease" : undefined,
//                 display: isWelcome && !showWelcome ? 'none' : 'flex'
//               }}
//             >
//                 <div
//                 className="p-3 rounded-2xl msg-bubble"
//                 style={{
//                   background:
//                     msg.sender === "user"
//                       ? "linear-gradient(to right, var(--gemini-blue), var(--gemini-indigo))"
//                       : "var(--gemini-card)",
//                   color: msg.sender === "user" ? "white" : "var(--gemini-text)",
//                   boxShadow: msg.sender === "ai" ? "0 0 12px rgba(99,102,241,0.5)" : "none",
//                 }}
//               >
//                 {msg.text}
//               </div>
//             </div>
//           );
//         })}
//       </div>

//       <div
//         className="shadow-card"
//         style={{
//           position: "fixed",
//           bottom: "1rem",
//           left: "50%",
//           transform: "translateX(-50%)",
//           width: "100%",
//           maxWidth: "64rem",
//           display: "flex",
//           gap: "0.5rem",
//           padding: "1rem",
//           background: "var(--gemini-card)",
//         }}
//       >
//         <button
//           className="btn-purple"
//           onClick={() => fileInputRef.current?.click()}
//           style={{ whiteSpace: "nowrap" }}
//         >
//           ✚
//         </button>

//         <input
//           ref={fileInputRef}
//           type="file"
//           className="hidden"
//           onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
//         />

//         <input
//           className="flex-1"
//           placeholder="Ask Anything"
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onKeyDown={(e) => {
//             if (e.key === "Enter" && !e.shiftKey) {
//               e.preventDefault();
//               onSend();
//             }
//           }}
//         />
//       </div>
//     </div>
//   );
// }
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

  useEffect(() => {
    addMessage("היי! ברוכה הבאה למערכת Resume AI ✨", "ai");
  }, []);

  const addMessage = (text, sender = "user") => {
    setMessages((prev) => [...prev, { text, sender }]);
  };

  const onSend = () => {
    if (!input.trim()) return;

    if (showWelcome) {
      setWelcomeFade(true);
      setTimeout(() => setShowWelcome(false), 500);
    }

    addMessage(input, "user");

    if (awaitingImproveAnswer) {
      const answer = input.trim().toLowerCase();
      if (answer === "כן" || answer === "yes") {
        if (cvSuggestions.length > 0) {
          // הפורמט החדש: ראשונה ולאחרונה בלי מספר, האמצעיות ממוספרות
          const first = cvSuggestions[0];
          const last = cvSuggestions[cvSuggestions.length - 1];
          const middle = cvSuggestions.slice(1, -1);

          let formattedSuggestions = "";
          if (first) formattedSuggestions += `${first}\n`;
          middle.forEach((s, i) => {
            formattedSuggestions += `${i + 1}. ${s}\n`;
          });
          if (last && cvSuggestions.length > 1) formattedSuggestions += `${last}\n`;

          addMessage(
            `הקורות חיים שלך מצוינים והם מקבלים ציון של ${cvSuggestions.length}.\n\n${formattedSuggestions}`,
            "ai"
          );
        } else {
          addMessage("אין לי הערות לשיפור, קורות החיים שלך מצוינים!", "ai");
        }
        setAwaitingImproveAnswer(false);
        addMessage("שנוציא יחד קובץ חדש ומשוכלל יותר של קורות חיים בשבילך?", "ai");
      } else if (answer === "לא" || answer === "no") {
        addMessage(
          "חבל מאוד--- יכולת לקבל קורות חיים טובים יותר, אם את/ה מתחרט/ת אפשר תמיד להעלות שוב",
          "ai"
        );
        setAwaitingImproveAnswer(false);
      } else {
        addMessage(' 🤔על פי תשובתך לא הבנתי אם כן או לא', "ai");
      }
      setInput("");
      return;
    }

    if (!uploadedFile) {
      setWaitingCount(waitingCount + 1);
      setTimeout(() => {
        addMessage(
          waitingCount === 0
            ? "היי אני מחכה לקורות חיים שלך"
            : "עדיין מחכה----",
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
    setFileName(file.name);
    setUploadedFile(file);
    setWaitingCount(0);
    setAnalysisDone(false);
    setCvSuggestions([]);
    setAwaitingImproveAnswer(false);
    addMessage(`📄 קובץ נטען: ${file.name}`, "user");

    setTimeout(() => {
      addMessage("הקורות חיים באמצע ניתוח- זה הזמן להתפלל🙏", "ai");
    }, 400);

    setTimeout(() => {
      addMessage("קיבלתי את הקורות חיים שלך- ניכרת ההשקעה והזמן🙌", "ai");
      sendFileToServer(file);
    }, 1200);
  };

  // async function sendFileToServer(file) {
  //   try {
  //     addMessage("מנתח את הנתונים שלך -תהליך זה עלול לקחת כמה רגעים...", "ai");
  //     const form = new FormData();
  //     form.append("cv", file, file.name);

  //     const res = await fetch("http://localhost:3000/api/optimize-for-job", {
  //       method: "POST",
  //       body: form,
  //     });

  //     if (!res.ok) {
  //       const txt = await res.text();
  //       addMessage(`שגיאה מהשרת: ${txt}`, "ai");
  //       return;
  //     }

  //     const body = await res.json();
  //     let suggestions = [];
  //     if (body.analysis && Array.isArray(body.analysis.suggestions)) {
  //       suggestions = body.analysis.suggestions;
  //     }
  //     setCvSuggestions(suggestions);

  //     setTimeout(() => {
  //       addMessage('האם אתה רוצה שנכתוב יחד קורות חיים משופרים?', "ai");
  //       setAwaitingImproveAnswer(true);
  //     }, 600);

  //     setAnalysisDone(true);
  //   } catch (e) {
  //     console.error(e);
  //     addMessage("שגיאה בתקשורת עם השרת — בדוק שהשרת רץ ונסה שוב.", "ai");
  //   }
  // }
async function sendFileToServer(file) {
  try {
    addMessage("מנתח את הנתונים שלך -תהליך זה עלול לקחת כמה רגעים...", "ai");
    const form = new FormData();
    form.append("cv", file, file.name);

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

    let suggestions = [];
    if (body.analysis && Array.isArray(body.analysis.suggestions)) {
      suggestions = body.analysis.suggestions;
    }
    setCvSuggestions(suggestions);

    // קבלת ההערה מה־backend
    const compliment = body.analysis?.compliment || "";
    if (compliment) {
      addMessage(`📌 : ${compliment}`, "ai");
    }
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
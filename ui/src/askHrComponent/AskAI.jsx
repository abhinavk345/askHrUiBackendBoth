
import { useState, useEffect, useRef } from "react";
import "../askHrComponent/AskAI.css";
import askLogo from "../images/askLogos.png";
import Menu from "./Menu";

// Import sound files
import sendSound from "../sounds/send.mp3";
import receiveSound from "../sounds/whatsappSend.mp3";

function AskAI() {
  const [chatHistory, setChatHistory] = useState({});
  const [showTooltip, setShowTooltip] = useState(true);
  const [tooltipText, setTooltipText] = useState("Need help?");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [abortController, setAbortController] = useState(null);

  const [username, setUsername] = useState("");
  const [showUserModal, setShowUserModal] = useState(false);
  const [hasExitedChat, setHasExitedChat] = useState(false);

  const [tempUsername, setTempUsername] = useState("");
  const [tempEmail, setTempEmail] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]); 
  // Draggable AI button
  const [aiPos, setAiPos] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 100 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragThreshold = 5;

  const chatEndRef = useRef(null);

  const messages = [
  "Need help?",
  "I'm here 👋",
  "Ask me anything!",
  "Need more help?",
];

useEffect(() => {
    const saved = localStorage.getItem("chatHistory");
    if (saved) setChatHistory(JSON.parse(saved));
  }, []);
 
  useEffect(() => {
    if (!username || chat.length === 0) return;

    setChatHistory((prev) => {
      const updated = { ...prev, [username]: chat };
      localStorage.setItem("chatHistory", JSON.stringify(updated));
      return updated;
    });
  }, [chat, username]);

const showTooltipAgain = () => {
  const random = messages[Math.floor(Math.random() * messages.length)];
  setTooltipText(random);
  //setShowTooltip(true);
  showTooltipAgain();
};

const closeChat = () => {
  setHasExitedChat(true);    
  setShowUserModal(false);  
  setOpen(false);

  setTooltipText("Need more help?");
  setShowTooltip(true);
};

const handleNewChat = () => {
  pushUndoStack(chat);
  setChat([]);
  setTempUsername("");
  setHasExitedChat(false); // ✅ allow modal again
  setShowUserModal(true);
};

useEffect(() => {
  if (!showTooltip) return;

  const timer = setTimeout(() => {
    setShowTooltip(false);
  }, 5000);

  return () => clearTimeout(timer);
}, [showTooltip]);

  /* Scroll to bottom */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  /* ================= DRAGGABLE BUTTON ================= */
  const handleMouseDown = (e) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold) {
      setAiPos((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      dragStart.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => setDragging(false); 

  useEffect(() => {
  if (!hasExitedChat && !username) {
    setShowUserModal(true);
  }
  }, [username, hasExitedChat]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  /* ================= SOUND EFFECTS ================= */
  const playSound = (sound) => {
    const audio = new Audio(sound);
    audio.volume = 0.5;
    audio.play();
  };

  /* ================= UNDO / REDO HELPERS ================= */
  const pushUndoStack = (prevChat) => {
    setUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(prevChat))]);
    setRedoStack([]); // clear redo on new change
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((prevRedo) => [...prevRedo, JSON.parse(JSON.stringify(chat))]);
    setChat(prev);
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prevUndo) => [...prevUndo, JSON.parse(JSON.stringify(chat))]);
    setChat(next);
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
  };

  const copyLastAI = () => {
    const lastAI = chat.filter((msg) => msg.role === "ai").pop();
    if (lastAI) {
      navigator.clipboard.writeText(lastAI.text);
      alert("Last AI response copied to clipboard!");
    }
  };

  /* ================= BACKEND CALL ================= */
  const callBackend = async () => {
    if (!message.trim() || showUserModal) return;

    pushUndoStack(chat);

    const time = new Date().toLocaleTimeString();
    const userText = message;
    setMessage("");

    setChat((prev) => [...prev, { role: "user", text: userText, time }]);
    playSound(sendSound);

    const controller = new AbortController();
    setAbortController(controller);
    setLoading(true);

    try {
      const res = await fetch(
        `http://localhost:9090/askhr/api/v1/chat?message=${encodeURIComponent(userText)}`,
        { signal: controller.signal }
      );

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let aiText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        aiText += decoder.decode(value, { stream: true });

        setChat((prev) => {
          const updated = [...prev];
          if (updated[updated.length - 1]?.role === "ai") {
            updated[updated.length - 1].text = aiText;
          } else {
            updated.push({ role: "ai", text: aiText, time: new Date().toLocaleTimeString() });
          }
          return updated;
        });
      }

      playSound(receiveSound);
    } catch (err) {
      if (err.name === "AbortError") {
        setChat((prev) => [...prev, { role: "ai", text: "❌ Response stopped.", time: new Date().toLocaleTimeString() }]);
      } else {
        setChat((prev) => [
          ...prev,
          {
            role: "ai",
            text: "❌ Error occurred. Click to retry.",
            time: new Date().toLocaleTimeString(),
            failed: true,
            originalMessage: userText,
          },
        ]);
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  /* ================= RETRY MESSAGE ================= */
  const retryMessage = (msg) => {
    pushUndoStack(chat);
    setMessage(msg);
    setChat((prev) => prev.filter((m) => m.originalMessage !== msg));
    callBackend();
  };

  /* ================= USER MODAL ================= */
  const saveUsername = () => {
    if (!tempUsername.trim()) return;
    setUsername(tempUsername);
    setShowUserModal(false);
    setChat([
      {
        role: "ai",
        text: `Hello ${tempUsername}, good morning 👋\nHow can I help you today?`,
        time: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === "z") handleUndo();
    if (e.ctrlKey && e.key === "y") handleRedo();
    if (e.ctrlKey && e.key === "c") copyLastAI();
    if (e.key === "Enter") {
      if (showUserModal) saveUsername();
      else callBackend();
    }
  };

  /* ================= FILE MENU FUNCTIONS ================= */

  const handleClearChat = () => {
    pushUndoStack(chat);
    setChat([]);
  };

  const handleExportChat = () => {
    const content = chat.map((msg) => `${msg.role.toUpperCase()}: ${msg.text}`).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chat.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

   const handleExitChat = () => {
    setTempUsername("");
    setTempEmail("");
    pushUndoStack(chat);
    setChat([]);
   // setOpen(false);
   closeChat();
     
  };
   const handleClearHistory = () => {
      if (!window.confirm("Are you sure you want to clear all chat history?")) {
        return;
      }
      setChatHistory({});
      setChat([]);
      setUsername("");
      setTempUsername("");
      setTempEmail("");
      setShowUserModal(true);
      localStorage.removeItem("chatHistory");

      alert("All chat history cleared.");
};

  

  const handleSaveSession = () => {
    localStorage.setItem("chatSession", JSON.stringify(chat));
    alert("Session saved!");
  };

  const handleLoadSession = () => {
    const content = localStorage.getItem("chatSession");
    if (content) {
      setChat(JSON.parse(content));
      alert("Session loaded!");
    } else {
      alert("No saved session found.");
    }
  };
  const historyMenuItems = Object.keys(chatHistory).length
  ? Object.keys(chatHistory).map((user) => ({
      label: (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span
            onClick={() => {
              setUsername(user);
              setChat(chatHistory[user]);
              setShowUserModal(false);
              setOpen(true);
            }}
            style={{ cursor: "pointer", flex: 1 }}
          >
            {user}
          </span>

          <span
            onClick={(e) => {
              e.stopPropagation(); // 🔴 VERY IMPORTANT
              deleteHistoryUser(user);
            }}
            style={{
              color: "red",
              cursor: "pointer",
              fontWeight: "bold",
            }}
            title="Delete history"
          >
            ❌
          </span>
        </div>
      ),
      onClick: () => {}, // handled manually above
    }))
  : [{ label: "No History Found", onClick: () => {} }];


  /* ================= MENU ITEMS ================= */
  const fileMenuItems = [
    { label: "New Chat", onClick: handleNewChat },
    { label: "Clear Chat", onClick: handleClearChat },
    { label: "Export Chat", onClick: handleExportChat },
    { label: "Exit Chat", onClick: handleExitChat },
    { label: "Clear History", onClick: handleClearHistory},
    
  ];

  const editMenuItems = [
    { label: "Undo", onClick: handleUndo },
    { label: "Redo", onClick: handleRedo },
    { label: "Copy Last AI Response", onClick: copyLastAI },
  ];

  const searchMenuItems = [
    { label: "Find in Chat", onClick: () => setShowSearch(true) },
    { label: "Find Next", onClick: () => alert("Find Next clicked!") },
  ];

  const sessionMenuItems = [
    { label: "Save Session", onClick: handleSaveSession },
    { label: "Load Session", onClick: handleLoadSession },
    { label: "Clear Session", onClick: handleClearChat },
  ];

  const helpMenuItems = [
    { label: "Documentation", onClick: () => window.open("https://example.com/docs", "_blank") },
    { label: "About", onClick: () => alert("HR Help Assistant v1.0 by Abhinav Kumar") },
  ];

  const deleteHistoryUser = (user) => {
  const updated = { ...chatHistory };
  delete updated[user];

  setChatHistory(updated);
  localStorage.setItem("chatHistory", JSON.stringify(updated));

  // If currently open user is deleted
  if (username === user) {
    setUsername("");
    setChat([]);
    setShowUserModal(true);
  }
};
  
  /* ================= JSX ================= */
if (!open) {
  return (
    <div
      className="ai-tooltip-wrapper"
      style={{
        left: aiPos.x,
        top: aiPos.y,
        position: "fixed",
      }}
      onMouseDown={handleMouseDown}
      onClick={() => {
        if (!dragging) {
          if (!username) setShowUserModal(true);
          setOpen(true);
        }
      }}
    >
      {/* Tooltip */}
      {showTooltip && (
        <div className="ai-tooltip">
          <button
            className="ai-tooltip-close"
            onClick={(e) => {
              e.stopPropagation(); // prevent opening chat
              setShowTooltip(false);
            }}
          >
            ✕
          </button>

          <div className="ai-tooltip-title">{tooltipText}</div>
            <div className="ai-tooltip-sub">
              Get instant answers to your queries.
            </div>

          <span className="ai-tooltip-arrow" />
        </div>
      )}

      {/* AI Button */}
      <div className="floating-icon">AI</div>
    </div>
  );
}


  return (
    <div className="app-root">
      <div className="container open">
        <div className="close-btn" onClick={closeChat}>✕</div>

        {/* HEADER */}
        <div className="header">
          <div className="icon"><img src={askLogo} alt="AI" /></div>
          <div className="title">HR Help Assistant {username && `(${username})`}</div>
        </div>

        {/* MENU BAR */}
        <div className="menu-bar">
          <Menu title="File" items={fileMenuItems} />
          <Menu title="Edit" items={editMenuItems} />
          <Menu title="History" items={historyMenuItems} />
          <Menu title="Search" items={searchMenuItems} />
          <Menu title="Session" items={sessionMenuItems} />
          <Menu title="Help" items={helpMenuItems} />
          
        </div>

        {/* RESPONSE AREA */}
        <div className="response-area">
          {showUserModal && (
            <div className="inline-modal">
              <h4>Welcome! 👋</h4>
              <p>Please enter Name to start chat.</p>
              <input
                placeholder="Your Name"
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                 required
              />
               <input
                type="email"
                placeholder="Your Email <Optional>"
                value={tempEmail}
                onChange={(e) => setTempEmail(e.target.value)}
                onKeyDown={handleKeyDown}
/>              <div className="footer-note">Note:Email keep as Id and chat saved in DB.</div>
            
                 <button
                  onClick={saveUsername}
                  disabled={!tempUsername.trim()}
                  className={!tempUsername.trim() ? "disabled-btn" : ""}
                >
                  Continue
                </button>
            </div>
          )}

          {showSearch && (
            <div className="inline-modal">
              <h4>Search Chat 🔍</h4>
              <input
                placeholder="Enter keyword"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const keyword = e.target.value.toLowerCase();
                    const found = chat.find((msg) => msg.text.toLowerCase().includes(keyword));
                    if (found) alert(`Found: ${found.text}`);
                    else alert("No match found");
                  }
                }}
              />
              <button onClick={() => setShowSearch(false)}>Close</button>
            </div>
          )}

          {!showUserModal && !showSearch && (
            <div className="chat-body">
              {chat.map((msg, i) => (
                <div
                  key={i}
                  className={`chat-bubble ${msg.role} ${msg.failed ? "retry" : ""}`}
                  onClick={() => msg.failed && retryMessage(msg.originalMessage)}
                >
                  {msg.text}
                  <div className="timestamp">{msg.time}</div>
                </div>
              ))}
              {loading && (
                <div className="chat-bubble ai">
                  <div className="typing">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="footer">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="How can I help you today?"
          />
          <button
            className={loading ? "pause" : ""}
            onClick={() => {
              if (loading && abortController) abortController.abort();
              else callBackend();
            }}
          >
            {loading ? "Pause" : "Ask"}
          </button>
        </div>

        <div className="footer-note">&copy; Developed by Abhinav Kumar @ 2026</div>
      </div>
    </div>
  );
}

export default AskAI;

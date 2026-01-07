import { useState } from "react";
import "./App.css";

function App() {
  const [open, setOpen] = useState(true);
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const callBackend = async () => {
    if (!message.trim()) return;

    setLoading(true);
    setResponse("");

    try {
      const res = await fetch(
        `http://localhost:9090/askhr/api/v1/test?message=${encodeURIComponent(
          message
        )}`
      );

      if (!res.ok) {
        throw new Error("API failed");
      }

      const data = await res.text(); // change to res.json() if API returns JSON
      setResponse(data);
    } catch (err) {
      setResponse("Error while calling backend API");
    } finally {
      setLoading(false);
    }
  };

  /* Minimized icon */
  if (!open) {
    return (
      <div className="floating-icon" onClick={() => setOpen(true)}>
        AI
      </div>
    );
  }

  return (
    <div className="app-root">
      <div className="container">
        {/* Close */}
        <div className="close-btn" onClick={() => setOpen(false)}>
          ✕
        </div>

        {/* Header */}
        <div className="header">
          <div className="icon">AI</div>
          <div className="title">Smart Response Generator</div>
        </div>

        {/* Response */}
        <div className="response-area">
          <textarea
            value={loading ? "Generating response..." : response}
            readOnly
            placeholder="Generated response will appear here..."
          />
        </div>

        {/* Input */}
        <div className="footer">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter request type or query..."
            onKeyDown={(e) => e.key === "Enter" && callBackend()}
          />
          <button onClick={callBackend} disabled={loading}>
            {loading ? "Please wait..." : "Submit"}
          </button>
        </div>

        <div className="hint">
          Connected to backend @ localhost:9090
        </div>
      </div>
    </div>
  );
}

export default App;

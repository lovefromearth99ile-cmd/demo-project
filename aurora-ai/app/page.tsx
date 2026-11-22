"use client";

import LiveVoice from "./components/LiveVoice";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const STORAGE_KEY = "aurora-ai-chat-v1";
const starters = [
  { icon: "⌘", title: "Help me code", prompt: "Help me understand a programming concept step by step." },
  { icon: "∑", title: "Explore mathematics", prompt: "Teach me a mathematics topic from the basics with an example." },
  { icon: "✳", title: "Think through an idea", prompt: "Help me explore an idea and turn it into a practical plan." },
  { icon: "文", title: "Speak Bengali", prompt: "বাংলায় কথা বলি। তুমি কী কী বিষয়ে আমাকে সাহায্য করতে পারো?" }
];

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now() + Math.random());
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [serviceMode, setServiceMode] = useState<"checking" | "demo" | "live" | "setup">("checking");
  const [historyReady, setHistoryReady] = useState(false);
  const [notice, setNotice] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setMessages(parsed.slice(-60));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setHistoryReady(true);

    fetch("/api/health")
      .then((response) => response.json())
      .then((data) => setServiceMode(data.demoMode ? "demo" : data.configured ? "live" : "setup"))
      .catch(() => setServiceMode("setup"));
  }, []);

  useEffect(() => {
    if (historyReady) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-60)));
      } catch {
        setNotice("Browser storage is full. Older chats may not be saved.");
      }
    }
  }, [messages, historyReady]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function startPrompt(prompt: string) {
    setInput(prompt);
    textareaRef.current?.focus();
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: Message[] = [
      ...messages,
      { id: makeId(), role: "user", content: text }
    ];
    setMessages(nextMessages);
    setInput("");
    setNotice("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-20).map(({ role, content }) => ({ role, content }))
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong.");
      setMessages((current) => [
        ...current,
        { id: makeId(), role: "assistant", content: data.reply }
      ]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't send your message.");
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function clearChat() {
    if (loading) return;
    setMessages([]);
    setNotice("");
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Aurora home">
          <span className="brand-mark"><span /></span>
          <span className="brand-name">aurora<span>.</span></span>
        </a>

        <button className="new-chat" onClick={clearChat}>
          <span className="plus">＋</span> New conversation
          <span className="shortcut">⌘ K</span>
        </button>

        <div className="side-label">YOUR WORKSPACE</div>
        <div className="workspace-card">
          <div className="workspace-icon">✳</div>
          <div>
            <strong>Personal space</strong>
            <span>Your ideas live here</span>
          </div>
          <span className="workspace-dot" />
        </div>

        <div className="side-label recent-label">RECENT</div>
        {messages.length > 0 ? (
          <button className="recent-item" onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth" })}>
            <span>◌</span><span className="recent-text">{messages.find((m) => m.role === "user")?.content || "Conversation"}</span>
          </button>
        ) : (
          <p className="empty-history">Your conversations will appear here.</p>
        )}

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">A</div>
            <div className="profile-copy"><strong>Aurora workspace</strong><span>Personal edition</span></div>
            <span className="more">···</span>
          </div>
          <div className="privacy-note"><span className="lock">⌑</span> Chat history stays in this browser.</div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>New conversation</strong></div>
          <div className="top-actions">
            <LiveVoice />
            <div className={`connection ${serviceMode === "live" ? "online" : serviceMode === "demo" ? "demo" : serviceMode === "setup" ? "offline" : ""}`}>
              <span className="connection-dot" />
              {serviceMode === "checking" ? "Checking connection" : serviceMode === "demo" ? "Demo chat · Live Voice uses paid API" : serviceMode === "live" ? "AI connected" : "Setup required"}
            </div>
            <a className="github-link" href="https://github.com/lovefromearth99ile-cmd/demo-project/tree/main/aurora-ai" target="_blank" rel="noreferrer">Project ↗</a>
          </div>
        </header>

        <div className="conversation" aria-live="polite">
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="orb-wrap"><div className="orb"><span /><i /><b /></div></div>
              <div className="eyebrow"><span /> A NEW KIND OF THINKING SPACE</div>
              <h1>Big thoughts.<br /><em>Bright possibilities.</em></h1>
              <p className="welcome-copy">Hello, I’m Aurora. Bring a question, an idea, or a challenge.<br className="desktop-break" /> Let’s work through it together.</p>

              <div className="suggestion-grid">
                {starters.map((item) => (
                  <button className="suggestion" key={item.title} onClick={() => startPrompt(item.prompt)}>
                    <span className="suggestion-icon">{item.icon}</span>
                    <span className="suggestion-title">{item.title}</span>
                    <span className="suggestion-arrow">↗</span>
                  </button>
                ))}
              </div>
              <div className="welcome-foot"><span className="sparkle">✦</span> Curious by design. Built to grow with you.</div>
            </div>
          ) : (
            <div className="message-list">
              <div className="thread-heading"><span className="thread-orb">✳</span><div><strong>Your conversation</strong><small>History is saved in this browser</small></div></div>
              {messages.map((message) => (
                <article className={`message-row ${message.role}`} key={message.id}>
                  {message.role === "assistant" && <div className="message-avatar">✳</div>}
                  <div className="message-content">
                    <div className="message-author">{message.role === "user" ? "You" : "Aurora"}</div>
                    <div className="message-bubble">{message.content}</div>
                  </div>
                  {message.role === "user" && <div className="user-avatar">A</div>}
                </article>
              ))}
              {loading && <div className="typing"><span /><span /><span /><small>Aurora is thinking</small></div>}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="composer-area">
          {notice && <div className="notice" role="alert">{notice}</div>}
          <form className="composer" onSubmit={sendMessage}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything, explore an idea, or just say hello..."
              rows={1}
              maxLength={6000}
              aria-label="Message Aurora"
              disabled={loading}
            />
            <div className="composer-footer">
              <div className="composer-hint"><span>↵</span> to send <i /> <span>⇧ ↵</span> for a new line</div>
              <button className="send-button" type="submit" disabled={!input.trim() || loading} aria-label="Send message">
                {loading ? <span className="send-loader" /> : <span>↑</span>}
              </button>
            </div>
          </form>
          <p className="disclaimer">{serviceMode === "demo" ? "Demo Mode uses sample replies only; no live AI model or API credits are used." : "Messages are sent to OpenAI to generate replies. Avoid sharing sensitive personal information."}</p>
        </div>
      </section>
    </main>
  );
}
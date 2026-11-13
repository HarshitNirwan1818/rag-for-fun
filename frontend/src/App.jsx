import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

export default function App() {
    const [files, setFiles] = useState([]);
    const [uploadResults, setUploadResults] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [query, setQuery] = useState("");
    const [chatLog, setChatLog] = useState([]);
    const [loading, setLoading] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const chatEndRef = useRef(null);

    const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

    // Theme color dictionary
    const theme = {
        appBg: darkMode ? "#0f172a" : "#f1f5f9",
        cardBg: darkMode ? "#1e293b" : "#ffffff",
        textMain: darkMode ? "#f8fafc" : "#1e293b",
        textMuted: darkMode ? "#94a3b8" : "#64748b",
        border: darkMode ? "#334155" : "#e2e8f0",
        inputBg: darkMode ? "#0f172a" : "#ffffff",
        inputBorder: darkMode ? "#475569" : "#cbd5e1",
        botBubbleBg: darkMode ? "#334155" : "#f1f5f9",
        botBubbleText: darkMode ? "#f8fafc" : "#1e293b",
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatLog, loading]);

    const handleUpload = async () => {
        if (files.length === 0 || uploading) return;
        const formData = new FormData();
        files.forEach(f => formData.append("files", f));

        try {
            setUploading(true);
            setUploadResults([]);
            const res = await axios.post(`${API_BASE}/upload`, formData);
            setUploadResults(res.data.files);
        } catch (err) {
            setUploadResults([{ filename: "Unknown", status: "error", detail: "Upload failed. Check backend connection." }]);
        } finally {
            setUploading(false);
        }
    };

    const handleSend = async () => {
        if (!query.trim() || loading) return;
        const userMsg = query;
        const newLog = [...chatLog, { sender: "user", text: userMsg }];
        setChatLog(newLog);
        setQuery("");
        setLoading(true);

        try {
            const res = await axios.post(`${API_BASE}/chat`, { question: userMsg });

            const botReply = typeof res.data.response === 'object'
                ? res.data.response.result
                : res.data.response;

            setChatLog([...newLog, { sender: "ai", text: botReply }]);
        } catch (err) {
            setChatLog([...newLog, { sender: "ai", text: "Error fetching response from knowledge base." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            background: theme.appBg,
            padding: "40px 20px",
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            transition: "background 0.3s ease"
        }}>
            <div style={{ maxWidth: "850px", margin: "auto" }}>

                {/* Header with Theme Toggle */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                    <div>
                        <h2 style={{ color: theme.textMain, margin: "0 0 4px 0", fontSize: "28px" }}>Org-Level RAG Assistant</h2>
                        <p style={{ color: theme.textMuted, margin: 0, fontSize: "15px" }}>Upload corporate documentation and chat intelligently.</p>
                    </div>
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        style={{
                            background: theme.cardBg,
                            color: theme.textMain,
                            border: `1px solid ${theme.border}`,
                            padding: "8px 16px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "500",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                        }}
                    >
                        {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
                    </button>
                </div>

                {/* Upload Card */}
                <div style={{
                    background: theme.cardBg,
                    border: `1px solid ${theme.border}`,
                    padding: "24px",
                    marginBottom: "30px",
                    borderRadius: "16px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
                }}>
                    <h3 style={{ margin: "0 0 16px 0", color: theme.textMain, fontSize: "18px" }}>1. Upload Knowledge Base Documents</h3>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                        <input
                            type="file"
                            multiple
                            accept=".pdf,.txt"
                            onChange={(e) => setFiles(Array.from(e.target.files))}
                            style={{
                                flex: 1,
                                padding: "8px",
                                border: `1px dashed ${theme.inputBorder}`,
                                borderRadius: "8px",
                                background: theme.inputBg,
                                color: theme.textMain,
                                cursor: "pointer"
                            }}
                        />
                        <button
                            onClick={handleUpload}
                            disabled={files.length === 0 || uploading}
                            style={{
                                background: files.length === 0 || uploading ? "#a5b4fc" : "#4f46e5",
                                color: "#fff",
                                border: "none",
                                padding: "10px 20px",
                                borderRadius: "8px",
                                fontWeight: "600",
                                cursor: files.length === 0 || uploading ? "not-allowed" : "pointer",
                                whiteSpace: "nowrap"
                            }}
                        >
                            {uploading ? "Indexing..." : `Upload & Index${files.length > 1 ? ` (${files.length} files)` : ""}`}
                        </button>
                    </div>

                    {/* Per-file results */}
                    {uploadResults.length > 0 && (
                        <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                            {uploadResults.map((r, i) => (
                                <div key={i} style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    background: r.status === "success" ? (darkMode ? "#14532d33" : "#f0fdf4") : (darkMode ? "#7f1d1d33" : "#fef2f2"),
                                    border: `1px solid ${r.status === "success" ? "#86efac" : "#fca5a5"}`
                                }}>
                                    <span style={{ fontSize: "13px", color: theme.textMain, fontWeight: "500" }}>
                                        {r.status === "success" ? "✅" : "❌"} {r.filename}
                                    </span>
                                    <span style={{ fontSize: "12px", color: theme.textMuted }}>
                                        {r.status === "success"
                                            ? `${r.chunks_indexed} chunks`
                                            : r.detail}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Chat Card */}
                <div style={{
                    background: theme.cardBg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: "16px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                    overflow: "hidden"
                }}>
                    <div style={{ padding: "20px 24px", borderBottom: `1px solid ${theme.border}`, background: theme.cardBg }}>
                        <h3 style={{ margin: 0, color: theme.textMain, fontSize: "18px" }}>2. Chat with Documents</h3>
                    </div>

                    {/* Chat Messages Area */}
                    <div style={{
                        height: "400px",
                        overflowY: "auto",
                        padding: "24px",
                        background: theme.cardBg,
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px"
                    }}>
                        {chatLog.length === 0 && (
                            <div style={{ margin: "auto", textAlign: "center", color: theme.textMuted }}>
                                <p style={{ fontSize: "16px", marginBottom: "4px" }}>No messages yet.</p>
                                <p style={{ fontSize: "14px" }}>Ask a question below to query your uploaded documents.</p>
                            </div>
                        )}

                        {chatLog.map((msg, idx) => (
                            <div key={idx} style={{
                                display: "flex",
                                justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                                width: "100%"
                            }}>
                                <div style={{
                                    maxWidth: "75%",
                                    background: msg.sender === "user" ? "#4f46e5" : theme.botBubbleBg,
                                    color: msg.sender === "user" ? "#ffffff" : theme.botBubbleText,
                                    padding: "12px 16px",
                                    borderRadius: msg.sender === "user" ? "16px 16px 0 16px" : "16px 16px 16px 0",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                    fontSize: "14px",
                                    lineHeight: "1.5",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word"
                                }}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div style={{ display: "flex", justifyContent: "flex-start" }}>
                                <div style={{
                                    background: theme.botBubbleBg,
                                    color: theme.textMuted,
                                    padding: "12px 16px",
                                    borderRadius: "16px 16px 16px 0",
                                    fontStyle: "italic",
                                    fontSize: "14px"
                                }}>
                                    AI is reading documents...
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input Area */}
                    <div style={{
                        padding: "16px 24px",
                        borderTop: `1px solid ${theme.border}`,
                        background: theme.cardBg,
                        display: "flex",
                        gap: "12px"
                    }}>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask something about your docs..."
                            style={{
                                flex: 1,
                                padding: "12px 16px",
                                borderRadius: "8px",
                                border: `1px solid ${theme.inputBorder}`,
                                outline: "none",
                                fontSize: "14px",
                                background: theme.inputBg,
                                color: theme.textMain
                            }}
                        />
                        <button
                            onClick={handleSend}
                            style={{
                                background: "#4f46e5",
                                color: "#fff",
                                border: "none",
                                padding: "0 24px",
                                borderRadius: "8px",
                                fontWeight: "600",
                                cursor: "pointer"
                            }}
                        >
                            Send
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
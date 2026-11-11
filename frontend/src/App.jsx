import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

export default function App() {
    const [file, setFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState("");
    const [query, setQuery] = useState("");
    const [chatLog, setChatLog] = useState([]);
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef(null);

    const API_BASE = "http://localhost:8000";

    // Auto-scroll to the bottom of the chat log
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatLog, loading]);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);

        try {
            setUploadStatus("Uploading & Indexing...");
            const res = await axios.post(`${API_BASE}/upload`, formData);
            setUploadStatus(res.data.message || "File uploaded successfully!");
        } catch (err) {
            setUploadStatus("Upload failed. Check backend connection.");
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
            background: "#f1f5f9",
            padding: "40px 20px",
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
        }}>
            <div style={{ maxWidth: "850px", margin: "auto" }}>

                {/* Header */}
                <div style={{ marginBottom: "30px", textAlign: "center" }}>
                    <h2 style={{ color: "#1e293b", margin: "0 0 8px 0", fontSize: "28px" }}>Org-Level RAG Assistant</h2>
                    <p style={{ color: "#64748b", margin: 0, fontSize: "15px" }}>Upload corporate documentation and chat intelligently with your knowledge base.</p>
                </div>

                {/* Upload Card */}
                <div style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    padding: "24px",
                    marginBottom: "30px",
                    borderRadius: "16px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)"
                }}>
                    <h3 style={{ margin: "0 0 16px 0", color: "#334155", fontSize: "18px" }}>1. Upload Knowledge Base Document</h3>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                        <input
                            type="file"
                            onChange={(e) => setFile(e.target.files[0])}
                            style={{
                                flex: 1,
                                padding: "8px",
                                border: "1px dashed #cbd5e1",
                                borderRadius: "8px",
                                background: "#f8fafc",
                                cursor: "pointer"
                            }}
                        />
                        <button
                            onClick={handleUpload}
                            style={{
                                background: "#4f46e5",
                                color: "#fff",
                                border: "none",
                                padding: "10px 20px",
                                borderRadius: "8px",
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "background 0.2s"
                            }}
                            onMouseOver={(e) => e.target.style.background = "#4338ca"}
                            onMouseOut={(e) => e.target.style.background = "#4f46e5"}
                        >
                            Upload & Index
                        </button>
                    </div>
                    {uploadStatus && (
                        <p style={{ marginTop: "12px", fontSize: "14px", color: uploadStatus.includes("failed") ? "#dc2626" : "#16a34a", fontWeight: "500" }}>
                            {uploadStatus}
                        </p>
                    )}
                </div>

                {/* Chat Card */}
                <div style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
                    overflow: "hidden"
                }}>
                    <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                        <h3 style={{ margin: 0, color: "#334155", fontSize: "18px" }}>2. Chat with Documents</h3>
                    </div>

                    {/* Chat Messages Area */}
                    <div style={{
                        height: "400px",
                        overflowY: "auto",
                        padding: "24px",
                        background: "#ffffff",
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px"
                    }}>
                        {chatLog.length === 0 && (
                            <div style={{ margin: "auto", textAlign: "center", color: "#94a3b8" }}>
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
                                    background: msg.sender === "user" ? "#4f46e5" : "#f1f5f9",
                                    color: msg.sender === "user" ? "#ffffff" : "#1e293b",
                                    padding: "12px 16px",
                                    borderRadius: msg.sender === "user" ? "16px 16px 0 16px" : "16px 16px 16px 0",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                    fontSize: "14px", // <-- Change this from 145px to 14px
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
                                    background: "#f1f5f9",
                                    color: "#64748b",
                                    padding: "12px 16px",
                                    borderRadius: "16px 16px 16px 0",
                                    fontStyle: "italic",
                                    fontSize: "14px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px"
                                }}>
                                    <span className="pulse">AI is reading documents...</span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input Area */}
                    <div style={{
                        padding: "16px 24px",
                        borderTop: "1px solid #e2e8f0",
                        background: "#f8fafc",
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
                                border: "1px solid #cbd5e1",
                                outline: "none",
                                fontSize: "14px",
                                background: "#ffffff"
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
                                cursor: "pointer",
                                transition: "background 0.2s"
                            }}
                            onMouseOver={(e) => e.target.style.background = "#4338ca"}
                            onMouseOut={(e) => e.target.style.background = "#4f46e5"}
                        >
                            Send
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
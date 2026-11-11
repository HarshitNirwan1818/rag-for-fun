import React, { useState } from 'react';
import axios from 'axios';

export default function App() {
    const [file, setFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState("");
    const [query, setQuery] = useState("");
    const [chatLog, setChatLog] = useState([]);
    const [loading, setLoading] = useState(false);

    // Note: Adjust URL if running outside Docker (e.g., http://localhost:8000)
    const API_BASE = "http://localhost:8000";

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);

        try {
            setUploadStatus("Uploading & Indexing...");
            const res = await axios.post(`${API_BASE}/upload`, formData);
            setUploadStatus(res.data.message);
        } catch (err) {
            setUploadStatus("Upload failed. Check backend connection.");
        }
    };

    const handleSend = async () => {
        if (!query.trim() || loading) return;
        const newLog = [...chatLog, { sender: "user", text: query }];
        setChatLog(newLog);
        setQuery("");
        setLoading(true);

        try {
            const res = await axios.post(`${API_BASE}/chat`, { question: query });

            // Extract response safely whether it's a string or nested object
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
        <div style={{ padding: "40px", fontFamily: "Arial, sans-serif", maxWidth: "800px", margin: "auto" }}>
            <h2>Org-Level RAG Assistant</h2>

            {/* Upload Box */}
            <div style={{ border: "1px solid #ddd", padding: "20px", marginBottom: "25px", borderRadius: "8px", background: "#f9f9f9" }}>
                <h3>1. Upload Knowledge Base Document</h3>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} style={{ marginBottom: "10px" }} />
                <br />
                <button onClick={handleUpload} style={{ padding: "8px 16px", cursor: "pointer" }}>Upload & Index</button>
                <p style={{ marginTop: "10px", fontSize: "14px", color: "#555" }}>{uploadStatus}</p>
            </div>

            {/* Chat Box */}
            <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", background: "#f9f9f9" }}>
                <h3>2. Chat with Documents</h3>
                <div style={{ height: "350px", overflowY: "scroll", border: "1px solid #ccc", padding: "12px", marginBottom: "15px", background: "#fff", borderRadius: "4px" }}>
                    {chatLog.length === 0 && <p style={{ color: "#888", textAlign: "center" }}>No messages yet. Ask a question about your uploaded docs.</p>}
                    {chatLog.map((msg, idx) => (
                        <div key={idx} style={{ textAlign: msg.sender === "user" ? "right" : "left", margin: "10px 0" }}>
                            <span style={{
                                display: "inline-block",
                                background: msg.sender === "user" ? "#dcf8c6" : "#e4e6eb",
                                padding: "10px 14px",
                                borderRadius: "8px",
                                maxWidth: "75%",
                                textAlign: "left"
                            }}>
                                {msg.text}
                            </span>
                        </div>
                    ))}
                    {loading && <p style={{ fontStyle: "italic", color: "#666" }}>AI is reading documents...</p>}
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask something about your docs..."
                        style={{ flex: 1, padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                    <button onClick={handleSend} style={{ padding: "10px 20px", cursor: "pointer" }}>Send</button>
                </div>
            </div>
        </div>
    );
}
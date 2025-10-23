const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(bodyParser.json());

/* ===== SSE bus ===== */
const sseClients = new Set();

app.get("/stream/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    res.write('event: ping\ndata: "connected"\n\n');
    sseClients.add(res);

    req.on("close", () => {
        sseClients.delete(res);
    });
});

/* ===== SSE broadcast helper ===== */
function publishEvent(evt) {
    const data = JSON.stringify(evt);
    for (const res of sseClients) {
        res.write(`data: ${data}\n\n`);
    }
}
app.set("publishEvent", publishEvent);

/* ===== Health check (optional but useful) ===== */
app.get("/api/health", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT NOW() AS server_time");
        res.json({ status: "ok", db_time: rows[0].server_time });
    } catch (err) {
        console.error("❌ Database connection failed:", err);
        res.status(500).json({ error: "Database unreachable" });
    }
});

/* ===== Routes ===== */
app.use("/api", require("./routes/auth"));
app.use("/api", require("./routes/registration"));
app.use("/api", require("./routes/triage"));
app.use("/api", require("./routes/board"));
app.use("/api", require("./routes/patient"));

/* ===== Error handler ===== */
app.use((err, req, res, next) => {
    console.error("❌ Global error handler:", err);
    res.status(500).json({ error: "Internal Server Error" });
});

/* ===== Start server ===== */
app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
});

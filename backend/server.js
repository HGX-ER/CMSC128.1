const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
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

/* ===== Health check ===== */
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
// Import routes
const authRoutes = require("./routes/auth");
const registrationRoutes = require("./routes/registration");
const triageRoutes = require("./routes/triage");
const boardRoutes = require("./routes/board");
const patientRoutes = require("./routes/patient");
const getDoctorRoutes = require("./routes/getdoctor");
const whiteboardRoutes = require("./routes/whiteboard");
const doctorsRoutes = require("./routes/doctors");
const feedbackRoutes = require('./routes/feedback');

// Mount routes
app.use("/api", authRoutes);
app.use("/api", registrationRoutes);
app.use("/api/triage", triageRoutes);
app.use("/api", boardRoutes);
app.use("/api", patientRoutes);
app.use("/api/getdoctor", getDoctorRoutes);
app.use('/api', whiteboardRoutes);
app.use("/api", doctorsRoutes);
app.use('/api', feedbackRoutes);

/* ===== Error handler ===== */
app.use((err, req, res, next) => {
    console.error("❌ Global error handler:", err);
    res.status(500).json({ error: "Internal Server Error" });
});

/* ===== 404 handler for API routes ===== */
app.use("/api/*", (req, res) => {
    console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

/* ===== Start server ===== */
app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
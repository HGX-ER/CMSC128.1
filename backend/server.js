const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

/* ===== SSE bus ===== */
const sseClients = new Set();

app.get('/stream/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write('event: ping\ndata: "connected"\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
});

function publishEvent(evt) {
    const payload = `data: ${JSON.stringify(evt)}\n\n`;
    for (const res of sseClients) res.write(payload);
}

app.set('publishEvent', publishEvent);

/* ===== Routes ===== */
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/registration'));
app.use('/api', require('./routes/triage'));
app.use('/api', require('./routes/board'));
app.use('/api', require('./routes/patient'));


app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));

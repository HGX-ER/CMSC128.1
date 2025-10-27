// routes/board.js
const express = require("express");
const router = express.Router();
const db = require("../db");

/* -------------------------------------------
   Helper: resolve numeric encounters.id
   Accepts numeric ID or public code like ED001
-------------------------------------------- */
async function resolveEncounterNumericId(handle, connOrPool = db) {
    const v = String(handle ?? "").trim();
    if (!v) return null;

    // If pure digits, it's already the PK.
    if (/^\d+$/.test(v)) return Number(v);

    // Try known public code columns (extend if needed).
    const candidates = ["queue_number", "encounter_code", "public_id", "external_id", "encounter_id"];
    for (const col of candidates) {
        try {
            const [rows] = await connOrPool.query(
                `SELECT id FROM encounters WHERE ${col} = ? LIMIT 1`,
                [v]
            );
            if (rows.length) return rows[0].id;
        } catch (e) {
            // Unknown column? Skip to next.
            if (e.code !== "ER_BAD_FIELD_ERROR") throw e;
        }
    }
    return null;
}

/* -------------------------------------------
   Helper: read allowed enum values for encounter_events.type
-------------------------------------------- */
async function getAllowedEventTypes(connOrPool = db) {
    const [rows] = await connOrPool.query(
        `SELECT DATA_TYPE, COLUMN_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'encounter_events'
        AND COLUMN_NAME = 'type'
      LIMIT 1`
    );
    if (!rows.length) return null;
    if (rows[0].DATA_TYPE !== "enum") return null;

    // COLUMN_TYPE looks like: enum('doctor_assigned','nurse_assigned',...)
    const raw = rows[0].COLUMN_TYPE;
    const list = [];
    raw.replace(/'([^']*)'/g, (_, val) => {
        list.push(val);
        return "";
    });
    return list;
}

/* -------------------------------------------
   Helper: safe event insert (won't break txn)
-------------------------------------------- */
async function safeInsertEvent(conn, encounterId, preferred, payloadObj) {
    try {
        const allowed = await getAllowedEventTypes(conn);
        if (!allowed || !allowed.length) {
            // Not an enum? Use preferred directly.
            await conn.query(
                `INSERT INTO encounter_events (encounter_id, type, at, payload)
         VALUES (?, ?, NOW(), CAST(? AS JSON))`,
                [encounterId, preferred, JSON.stringify(payloadObj ?? {})]
            );
            return true;
        }

        // candidates in priority order
        const candidatesByContext = Array.isArray(preferred) ? preferred : [preferred];
        const fallbacks = ["doctor_assigned", "nurse_assigned", "stage_changed", "time_adjusted", "assignment", "info"];
        const tryList = [...candidatesByContext, ...fallbacks];

        const chosen = tryList.find((t) => allowed.includes(t)) ?? allowed[0];

        await conn.query(
            `INSERT INTO encounter_events (encounter_id, type, at, payload)
       VALUES (?, ?, NOW(), CAST(? AS JSON))`,
            [encounterId, chosen, JSON.stringify(payloadObj ?? {})]
        );
        return true;
    } catch (e) {
        // We never want event logging to abort the real update.
        console.warn("safeInsertEvent warning:", e && e.sqlMessage ? e.sqlMessage : e);
        return false;
    }
}

/* ============================================================
   GET /api/board
   Fetch all encounters with doctor and nurse info
   ============================================================ */
router.get("/board", async (_req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                e.id AS encounter_id,
                e.queue_number,
                e.status,
                e.priority_esi,
                e.assigned_doctor,
                e.assigned_nurse,
                e.arrival_time,
                TIMESTAMPDIFF(MINUTE, e.arrival_time, NOW()) AS waiting_min,
                p.id AS patient_id,
                p.full_name,
                p.dob,
                p.sex
            FROM encounters e
                     JOIN patients p ON p.id = e.patient_id
            WHERE e.status <> 'departed'
            ORDER BY e.arrival_time DESC
        `);

        const enriched = rows.map((r) => ({
            ...r,
            assignedDoctor: r.assigned_doctor || null,
            assignedNurse: r.assigned_nurse || null,
            stageHistory: [
                {
                    stage: r.status,
                    startTime: new Date(r.arrival_time),
                },
            ],
        }));

        res.json(enriched);
    } catch (err) {
        console.error("GET /board error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/* ============================================================
   GET /api/board/doctor/:username
   Get encounters assigned to a specific doctor
   ============================================================ */
router.get("/board/doctor/:username", async (req, res) => {
    const { username } = req.params;

    try {
        const [rows] = await db.query(
            `
                SELECT
                    e.id AS encounter_id,
                    e.queue_number,
                    e.status,
                    e.priority_esi,
                    e.assigned_doctor,
                    e.arrival_time,
                    TIMESTAMPDIFF(MINUTE, e.arrival_time, NOW()) AS waiting_min,
                    p.id AS patient_id,
                    p.full_name,
                    p.dob,
                    p.sex
                FROM encounters e
                         JOIN patients p ON p.id = e.patient_id
                WHERE e.assigned_doctor = ?
                ORDER BY e.arrival_time DESC
            `,
            [username]
        );

        res.json(rows);
    } catch (err) {
        console.error("GET /board/doctor error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/* ============================================================
   POST /api/board/assign-doctor
   Assign a doctor to an encounter
   Body: { encounter_id, doctor_username }  (encounter_id may be ED001)
   ============================================================ */
router.post("/board/assign-doctor", async (req, res) => {
    const { encounter_id, doctor_username } = req.body || {};
    if (!encounter_id || !doctor_username) {
        return res.status(400).json({ error: "Missing encounter_id or doctor_username" });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const numericId = await resolveEncounterNumericId(encounter_id, conn);
        if (!numericId) {
            await conn.rollback();
            return res.status(404).json({ error: "Encounter not found" });
        }

        await conn.query(
            `UPDATE encounters
             SET assigned_doctor = ?, status = 'waiting_doctor'
             WHERE id = ?`,
            [doctor_username, numericId]
        );

        // Try to log with enum-safe type; do not fail transaction if it doesn't fit.
        await safeInsertEvent(conn, numericId, ["doctor_assigned", "provider_assigned", "assignment"], { doctor: doctor_username });

        await conn.commit();

        // SSE (best-effort)
        req.app.get("publishEvent")?.({
            type: "assignment",
            encounter_id: numericId,
            doctor_username,
        });

        res.json({ success: true, message: "Doctor assigned successfully" });
    } catch (err) {
        await conn.rollback();
        console.error("POST /board/assign-doctor error:", err);
        res.status(500).json({ error: "Failed to assign doctor" });
    } finally {
        conn.release();
    }
});

/* ============================================================
   POST /api/board/assign-nurse
   Assign a nurse to an encounter
   Body: { encounter_id, nurse_username }  (encounter_id may be ED001)
   ============================================================ */
router.post("/board/assign-nurse", async (req, res) => {
    const { encounter_id, nurse_username } = req.body || {};
    if (!encounter_id || !nurse_username) {
        return res.status(400).json({ error: "Missing encounter_id or nurse_username" });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const numericId = await resolveEncounterNumericId(encounter_id, conn);
        if (!numericId) {
            await conn.rollback();
            return res.status(404).json({ error: "Encounter not found" });
        }

        await conn.query(
            `UPDATE encounters
             SET assigned_nurse = ?
             WHERE id = ?`,
            [nurse_username, numericId]
        );

        await safeInsertEvent(conn, numericId, ["nurse_assigned", "assignment"], { nurse: nurse_username });

        await conn.commit();

        req.app.get("publishEvent")?.({
            type: "nurse_assignment",
            encounter_id: numericId,
            nurse_username,
        });

        res.json({ success: true, message: "Nurse assigned successfully" });
    } catch (err) {
        await conn.rollback();
        console.error("POST /board/assign-nurse error:", err);
        res.status(500).json({ error: "Failed to assign nurse" });
    } finally {
        conn.release();
    }
});

/* ============================================================
   POST /api/board/move-stage
   Move encounter to a new stage/status
   Body: { encounter_id, stage }  (encounter_id may be ED001)
   ============================================================ */
router.post("/board/move-stage", async (req, res) => {
    const { encounter_id, stage } = req.body || {};
    if (!encounter_id || !stage) {
        return res.status(400).json({ error: "Missing encounter_id or stage" });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const numericId = await resolveEncounterNumericId(encounter_id, conn);
        if (!numericId) {
            await conn.rollback();
            return res.status(404).json({ error: "Encounter not found" });
        }

        await conn.query(
            `UPDATE encounters
             SET status = ?
             WHERE id = ?`,
            [stage, numericId]
        );

        await safeInsertEvent(conn, numericId, ["stage_changed", "status_changed", "stage_change"], { stage });

        await conn.commit();

        req.app.get("publishEvent")?.({
            type: "stage_change",
            encounter_id: numericId,
            stage,
        });

        res.json({ success: true });
    } catch (err) {
        await conn.rollback();
        console.error("POST /board/move-stage error:", err);
        res.status(500).json({ error: "Failed to move stage" });
    } finally {
        conn.release();
    }
});

/* ============================================================
   POST /api/board/adjust-stage-time
   Adjusts the start time of the CURRENT stage.
   Body: { encounter_id, stage_index, new_start_time }
   Note: Minimal implementation — if stage_index === 0,
         we adjust encounters.arrival_time; otherwise 501.
   ============================================================ */
router.post("/board/adjust-stage-time", async (req, res) => {
    const { encounter_id, stage_index, new_start_time } = req.body || {};
    if (encounter_id == null || new_start_time == null) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const idx = Number(stage_index ?? 0);
    const when = new Date(new_start_time);
    if (Number.isNaN(when.getTime())) {
        return res.status(400).json({ error: "new_start_time must be a valid date" });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const numericId = await resolveEncounterNumericId(encounter_id, conn);
        if (!numericId) {
            await conn.rollback();
            return res.status(404).json({ error: "Encounter not found" });
        }

        if (idx !== 0) {
            await conn.rollback();
            return res.status(501).json({ error: "Only arrival_time adjustment supported currently" });
        }

        await conn.query(
            `UPDATE encounters
             SET arrival_time = ?
             WHERE id = ?`,
            [when, numericId]
        );

        await safeInsertEvent(conn, numericId, ["stage_time_adjusted", "time_adjusted", "adjusted"], { new_start_time: when.toISOString() });

        await conn.commit();

        req.app.get("publishEvent")?.({
            type: "stage_time_adjusted",
            encounter_id: numericId,
            new_start_time: when.toISOString(),
        });

        res.json({ success: true });
    } catch (err) {
        await conn.rollback();
        console.error("POST /board/adjust-stage-time error:", err);
        res.status(500).json({ error: "Failed to adjust stage time" });
    } finally {
        conn.release();
    }
});

module.exports = router;

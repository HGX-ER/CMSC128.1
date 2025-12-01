const express = require('express');
const router = express.Router();
const db = require('../db');

// POST: Submit patient feedback
router.post('/feedback', async (req, res) => {
    try {
        const { queueNumber, rating, comment, stage, stageName } = req.body;

        if (!queueNumber || !rating || !stage) {
            return res.status(400).json({
                error: 'Missing required fields: queueNumber, rating, stage'
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        // Get encounter_id AND patient_name from queue_number
        const [encounters] = await db.query(
            `SELECT e.id, p.full_name AS patient_name
             FROM encounters e
                      JOIN patients p ON p.id = e.patient_id
             WHERE e.queue_number = ?`,
            [queueNumber]
        );

        if (encounters.length === 0) {
            return res.status(404).json({ error: 'Queue number not found' });
        }

        const encounterId = encounters[0].id;
        const patientName = encounters[0].patient_name;

        // Insert feedback including patient_name
        const [result] = await db.query(
            `INSERT INTO patient_feedback
             (encounter_id, queue_number, patient_name, rating, comment, stage, stage_display_name, submitted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [encounterId, queueNumber, patientName, rating, comment || null, stage, stageName || stage]
        );

        // Optional SSE event, but keep snake_case if you use it on frontend
        const publishEvent = req.app.get('publishEvent');
        if (publishEvent) {
            publishEvent({
                type: 'patient_feedback',
                data: {
                    id: result.insertId,
                    encounter_id: encounterId,
                    queue_number: queueNumber,
                    patient_name: patientName,
                    rating,
                    comment,
                    stage,
                    stage_display_name: stageName || stage,
                    submitted_at: new Date().toISOString()
                }
            });
        }

        res.json({
            success: true,
            message: 'Feedback submitted successfully',
            feedbackId: result.insertId
        });
    } catch (error) {
        console.error('❌ Error submitting feedback:', error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

// GET: Fetch all patient feedback (for ED Manager)
router.get('/feedback', async (req, res) => {
    try {
        const [feedback] = await db.query(
            `SELECT
                 pf.*,
                 p.full_name as patient_name,
                 e.priority_esi
             FROM patient_feedback pf
                      JOIN encounters e ON pf.encounter_id = e.id
                      JOIN patients p ON e.patient_id = p.id
             ORDER BY pf.submitted_at DESC`
        );

        res.json({ feedback });
    } catch (error) {
        console.error('❌ Error fetching feedback:', error);
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
});

// GET: Fetch feedback for specific patient
router.get('/feedback/:queueNumber', async (req, res) => {
    try {
        const { queueNumber } = req.params;

        const [feedback] = await db.query(
            `SELECT * FROM patient_feedback
             WHERE queue_number = ?
             ORDER BY submitted_at DESC`,
            [queueNumber]
        );

        res.json({ feedback });
    } catch (error) {
        console.error('❌ Error fetching patient feedback:', error);
        res.status(500).json({ error: 'Failed to fetch patient feedback' });
    }
});

// POST: Mark feedback as read
router.post('/feedback/read/:feedbackId', async (req, res) => {
    try {
        const { feedbackId } = req.params;

        const [result] = await db.query(
            `UPDATE patient_feedback 
             SET is_read = TRUE, read_at = NOW()
             WHERE id = ?`,
            [feedbackId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        res.json({
            success: true,
            message: 'Feedback marked as read'
        });
    } catch (error) {
        console.error('❌ Error marking feedback as read:', error);
        res.status(500).json({ error: 'Failed to mark feedback as read' });
    }
});

// POST: Mark feedback as unread
router.post('/feedback/unread/:feedbackId', async (req, res) => {
    try {
        const { feedbackId } = req.params;

        const [result] = await db.query(
            `UPDATE patient_feedback 
             SET is_read = FALSE, read_at = NULL
             WHERE id = ?`,
            [feedbackId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        res.json({
            success: true,
            message: 'Feedback marked as unread'
        });
    } catch (error) {
        console.error('❌ Error marking feedback as unread:', error);
        res.status(500).json({ error: 'Failed to mark feedback as unread' });
    }
});

module.exports = router;
// backend/routes/notifications.js
const express = require("express");
const { db, admin } = require("../firebaseAdmin");
const { requireAuth } = require("../middleware/auth");
const { serializeDoc } = require("../utils/serialize");

const router = express.Router();

// GET /api/notifications
router.get("/", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const snap = await db
      .collection("notifications")
      .where("userId", "==", uid)
      .orderBy("time", "desc")
      .limit(50)
      .get();

    const notifications = snap.docs.map((d) => serializeDoc(d.id, d.data()));
    res.json({ notifications });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/notifications/:id/read
router.post("/:id/read", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const ref = db.collection("notifications").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Not found" });

    const data = snap.data();
    if (data.userId !== uid) return res.status(403).json({ error: "Forbidden" });

    await ref.update({ read: true });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/notifications/mark-all-read
router.post("/mark-all-read", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const snap = await db.collection("notifications").where("userId", "==", uid).where("read", "==", false).get();

    const batch = db.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
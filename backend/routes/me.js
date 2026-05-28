// backend/routes/me.js
const express = require("express");
const { db, admin } = require("../firebaseAdmin");
const { requireAuth } = require("../middleware/auth");
const { serializeDoc } = require("../utils/serialize");

const router = express.Router();

// GET /api/me/profile
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();
    const user = snap.exists ? serializeDoc(snap.id, snap.data()) : { id: uid, email: req.user.email || "" };
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/me/profile
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const ref = db.collection("users").doc(uid);
    const body = req.body || {};

    // unique phone check
    if (body.phone) {
      const phoneSnap = await db.collection("users").where("phone", "==", body.phone).get();
      const conflict = phoneSnap.docs.find((d) => d.id !== uid);
      if (conflict) return res.status(409).json({ error: "Phone number already registered." });
    }

    await ref.set(
      {
        ...body,
        email: body.email || req.user.email || "",
        lastChanged: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(), // safe for first time; overwritten? firestore set merges below
      },
      { merge: true }
    );

    const snap = await ref.get();
    res.json({ user: serializeDoc(snap.id, snap.data()) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/me/auctions
router.get("/auctions", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;

    // created auctions
    const createdSnap = await db.collection("auctions").where("userId", "==", uid).get();
    const created = createdSnap.docs.map((d) => serializeDoc(d.id, d.data()));

    // joined auctions via collectionGroup participants (must store participants with userId field)
    const joinedRefsSnap = await db.collectionGroup("participants").where("userId", "==", uid).get();
    const joinedAuctionIds = new Set();
    joinedRefsSnap.docs.forEach((d) => {
      // path: auctions/{auctionId}/participants/{uid}
      const parts = d.ref.path.split("/");
      const auctionId = parts[1];
      if (auctionId) joinedAuctionIds.add(auctionId);
    });

    const joined = [];
    for (const auctionId of joinedAuctionIds) {
      // avoid duplicates where owner also participant
      if (created.some((a) => a.id === auctionId)) continue;
      const aSnap = await db.collection("auctions").doc(auctionId).get();
      if (aSnap.exists) joined.push(serializeDoc(aSnap.id, aSnap.data()));
    }

    const all = [...created, ...joined];

    // sort by createdAt desc if possible
    all.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    res.json({ auctions: all });
  } catch (e) {
    console.error("GET /api/me/auctions failed:", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
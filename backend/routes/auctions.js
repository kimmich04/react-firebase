// backend/routes/auctions.js
const express = require("express");
const { db, admin } = require("../firebaseAdmin");
const { requireAuth } = require("../middleware/auth");
const { serializeDoc } = require("../utils/serialize");

const router = express.Router();

// GET /api/auctions
router.get("/", async (req, res) => {
  try {
    // safer: limit + no orderBy to avoid missing createdAt crash
    const snap = await db.collection("auctions").limit(200).get();
    const auctions = snap.docs.map((d) => serializeDoc(d.id, d.data()));
    res.json({ auctions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/auctions/:id
router.get("/:id", async (req, res) => {
  try {
    const ref = db.collection("auctions").doc(req.params.id);
    const docSnap = await ref.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Auction not found" });
    res.json({ auction: serializeDoc(docSnap.id, docSnap.data()) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/auctions/:id/detail
router.get("/:id/detail", async (req, res) => {
  try {
    const auctionId = req.params.id;
    const ref = db.collection("auctions").doc(auctionId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Auction not found" });

    const auction = snap.data();

    // Lazy end auction when reading (replaces client timeout update)
    const end = auction.endTime?.toDate ? auction.endTime.toDate() : null;
    if (end && end < new Date() && auction.status !== "ended") {
      await ref.update({ status: "ended" });
      auction.status = "ended";
    }

    // bids sorted: amount desc, timestamp asc
    const bidsSnap = await db
      .collection("auctions")
      .doc(auctionId)
      .collection("bids")
      .orderBy("amount", "desc")
      .orderBy("timestamp", "asc")
      .limit(200)
      .get();

    const bids = bidsSnap.docs.map((d) => serializeDoc(d.id, d.data()));

    // participants count
    const participantsSnap = await db
      .collection("auctions")
      .doc(auctionId)
      .collection("participants")
      .get();

    const participantsCount = participantsSnap.size;

    // joined (optional auth)
    let joined = false;
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (token) {
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        const uid = decoded.uid;
        const p = await db
          .collection("auctions")
          .doc(auctionId)
          .collection("participants")
          .doc(uid)
          .get();
        joined = p.exists;
      } catch {
        joined = false;
      }
    }

    res.json({
      auction: serializeDoc(snap.id, auction),
      bids,
      participantsCount,
      joined,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auctions (auth)
router.post("/", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;

    // ban check
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : {};
    const bannedUntil = userData?.bannedUntil?.toDate ? userData.bannedUntil.toDate() : null;

    if (bannedUntil && bannedUntil > new Date()) {
      return res.status(403).json({ error: "You are banned from creating auctions." });
    }

    const {
      name,
      maxPeople,
      product,
      category,
      description,
      startingPrice,
      stepPrice,
      startTime,
      endTime,
      paymentDeadline,
      paymentInfo,
      imageUrls,
      imageUrl,
    } = req.body || {};

    if (!name || !product || !category || !description) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const deadline = new Date(paymentDeadline);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || Number.isNaN(deadline.getTime())) {
      return res.status(400).json({ error: "Invalid date fields." });
    }
    if (end <= start) return res.status(400).json({ error: "End time must be after start time." });
    if (deadline <= end) return res.status(400).json({ error: "Payment deadline must be after end time." });

    const auctionRef = db.collection("auctions").doc();

    await auctionRef.set({
      name,
      maxPeople: maxPeople || "",
      product,
      category,
      description,
      startingPrice: Number(startingPrice),
      stepPrice: stepPrice ? Number(stepPrice) : 1,
      startTime: admin.firestore.Timestamp.fromDate(start),
      endTime: admin.firestore.Timestamp.fromDate(end),
      paymentDeadline: admin.firestore.Timestamp.fromDate(deadline),
      paymentInfo: paymentInfo || "",
      imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
      imageUrl: imageUrl || "",
      userId: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "active",
      paymentStatus: "pending",
    });

    // notification
    await db.collection("notifications").add({
      userId: uid,
      message: `You created auction: ${name}`,
      auctionId: auctionRef.id,
      type: "create-auction",
      read: false,
      time: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ id: auctionRef.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/auctions/:id (auth owner)
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const ref = db.collection("auctions").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Auction not found" });

    const data = snap.data();
    if (data.userId !== uid) return res.status(403).json({ error: "Not owner" });

    const start = data.startTime?.toDate ? data.startTime.toDate() : null;
    if (start && start <= new Date()) {
      return res.status(400).json({ error: "Editing is disabled because auction started." });
    }

    const payload = req.body || {};
    const updated = {
      ...payload,
      startingPrice: payload.startingPrice != null ? Number(payload.startingPrice) : data.startingPrice,
      stepPrice: payload.stepPrice != null ? Number(payload.stepPrice) : data.stepPrice,
    };

    if (payload.startTime) updated.startTime = admin.firestore.Timestamp.fromDate(new Date(payload.startTime));
    if (payload.endTime) updated.endTime = admin.firestore.Timestamp.fromDate(new Date(payload.endTime));

    await ref.update(updated);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/auctions/:id (auth owner)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const ref = db.collection("auctions").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Auction not found" });

    const data = snap.data();
    if (data.userId !== uid) return res.status(403).json({ error: "Not owner" });

    const start = data.startTime?.toDate ? data.startTime.toDate() : null;
    if (start && start <= new Date()) {
      return res.status(400).json({ error: "Deleting is disabled because auction started." });
    }

    await ref.delete();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auctions/:id/join
router.post("/:id/join", requireAuth, async (req, res) => {
  try {
    const auctionId = req.params.id;
    const uid = req.user.uid;

    // ban check
    const userSnap = await db.collection("users").doc(uid).get();
    const bannedUntil = userSnap.data()?.bannedUntil?.toDate ? userSnap.data().bannedUntil.toDate() : null;
    if (bannedUntil && bannedUntil > new Date()) {
      return res.status(403).json({ error: "You are banned from joining auctions." });
    }

    const aRef = db.collection("auctions").doc(auctionId);
    const aSnap = await aRef.get();
    if (!aSnap.exists) return res.status(404).json({ error: "Auction not found" });

    const auction = aSnap.data();
    const start = auction.startTime?.toDate ? auction.startTime.toDate() : null;
    const end = auction.endTime?.toDate ? auction.endTime.toDate() : null;
    const now = new Date();

    if (!start || !end) return res.status(400).json({ error: "Auction time invalid" });
    if (now < start) return res.status(400).json({ error: "Auction has not started yet" });
    if (now > end) return res.status(400).json({ error: "Auction ended" });

    // max people
    const maxPeople = Number(auction.maxPeople || 0);
    if (maxPeople > 0) {
      const ps = await aRef.collection("participants").get();
      if (ps.size >= maxPeople) return res.status(400).json({ error: "Auction is full" });
    }

    const pRef = aRef.collection("participants").doc(uid);
    const pSnap = await pRef.get();
    if (pSnap.exists) return res.status(409).json({ error: "Already joined" });

    await pRef.set({
      userId: uid,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auctions/:id/bids
router.post("/:id/bids", requireAuth, async (req, res) => {
  try {
    const auctionId = req.params.id;
    const uid = req.user.uid;

    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount)) return res.status(400).json({ error: "Invalid bid amount" });

    // ban check
    const userSnap = await db.collection("users").doc(uid).get();
    const bannedUntil = userSnap.data()?.bannedUntil?.toDate ? userSnap.data().bannedUntil.toDate() : null;
    if (bannedUntil && bannedUntil > new Date()) {
      return res.status(403).json({ error: "You are banned from bidding." });
    }

    const aRef = db.collection("auctions").doc(auctionId);

    await db.runTransaction(async (tx) => {
      const aSnap = await tx.get(aRef);
      if (!aSnap.exists) throw new Error("Auction not found");

      const auction = aSnap.data();
      const start = auction.startTime?.toDate ? auction.startTime.toDate() : null;
      const end = auction.endTime?.toDate ? auction.endTime.toDate() : null;
      const now = new Date();

      if (!start || !end) throw new Error("Auction time invalid");
      if (now < start) throw new Error("Auction has not started yet");
      if (now > end) throw new Error("Auction ended");

      // must have joined
      const pRef = aRef.collection("participants").doc(uid);
      const pSnap = await tx.get(pRef);
      if (!pSnap.exists) throw new Error("You must join the auction before bidding");

      // get current highest bid
      const bidsQuery = aRef.collection("bids").orderBy("amount", "desc").orderBy("timestamp", "asc").limit(1);
      const highestSnap = await tx.get(bidsQuery);

      const startingPrice = Number(auction.startingPrice || 0);
      const currentHighest = highestSnap.empty
        ? startingPrice
        : Number(highestSnap.docs[0].data().amount || startingPrice);

      if (amount <= currentHighest) throw new Error("Bid must be higher than current highest bid");

      // username from firebase auth record
      const authUser = await admin.auth().getUser(uid);
      const username = authUser.displayName || "Unknown";

      const bidRef = aRef.collection("bids").doc();
      tx.set(bidRef, {
        userId: uid,
        username,
        amount,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // notify auction owner (if bidder isn't owner)
      if (auction.userId && auction.userId !== uid) {
        const nRef = db.collection("notifications").doc();
        tx.set(nRef, {
          userId: auction.userId,
          message: `A new bid of ${amount.toLocaleString("vi-VN")} VND was placed on your auction "${auction.name}" by ${username}.`,
          auctionId,
          read: false,
          time: admin.firestore.FieldValue.serverTimestamp(),
          type: "bid-owner",
        });
      }
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/auctions/:id/payment  (owner only)
router.post("/:id/payment", requireAuth, async (req, res) => {
  try {
    const auctionId = req.params.id;
    const uid = req.user.uid;
    const paymentStatus = req.body?.paymentStatus;

    if (!["pending", "approved"].includes(paymentStatus)) {
      return res.status(400).json({ error: "Invalid paymentStatus" });
    }

    const ref = db.collection("auctions").doc(auctionId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Auction not found" });

    const auction = snap.data();
    if (auction.userId !== uid) return res.status(403).json({ error: "Not owner" });

    await ref.update({ paymentStatus });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
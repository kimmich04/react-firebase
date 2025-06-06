import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {doc,getDoc,collection,query,orderBy,getDocs,addDoc,setDoc,onSnapshot,where,updateDoc,Timestamp} from "firebase/firestore";
import { auth, db } from "../Firebase";
import "../styles/AuctionDetail.scss";

const AuctionDetail = ({ user }) => {
  const { id } = useParams();
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highestBid, setHighestBid] = useState(null);
  const [userBid, setUserBid] = useState(null);
  const [stepPrice, setStepPrice] = useState(1);
  const [bids, setBids] = useState([]);
  const [joined, setJoined] = useState(false);
  const [availableBids, setAvailableBids] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [remainingTime, setRemainingTime] = useState("");
  const [editPaymentStatus, setEditPaymentStatus] = useState(false);
  const [localPaymentStatus, setLocalPaymentStatus] = useState("pending");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAuctionData = async () => {
      try {
        const auctionDoc = await getDoc(doc(db, "auctions", id));
        if (!auctionDoc.exists()) {
          setError("Auction not found.");
          setLoading(false);
          return;
        }
        const auctionData = auctionDoc.data();
        auctionData.startingPrice = Number(auctionData.startingPrice) || 0;
        auctionData.stepPrice =
          typeof auctionData.stepPrice === "number"
            ? auctionData.stepPrice
            : (typeof auctionData.stepPrice === "string" && !isNaN(Number(auctionData.stepPrice)))
              ? Number(auctionData.stepPrice)
              : 1;
        auctionData.maxPeople = Number(auctionData.maxPeople) || 0;

        setAuction(auctionData);
        setStepPrice(auctionData.stepPrice);
      } catch (err) {
        setError("Error fetching auction data: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAuctionData();
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "auctions", id), (auctionDoc) => {
      if (!auctionDoc.exists()) {
        setError("Auction not found.");
        setLoading(false);
        return;
      }
      const auctionData = auctionDoc.data();
      auctionData.startingPrice = Number(auctionData.startingPrice) || 0;
      auctionData.stepPrice =
        typeof auctionData.stepPrice === "number"
          ? auctionData.stepPrice
          : (typeof auctionData.stepPrice === "string" && !isNaN(Number(auctionData.stepPrice)))
            ? Number(auctionData.stepPrice)
            : 1;
      auctionData.maxPeople = Number(auctionData.maxPeople) || 0;

      setAuction(auctionData);
      setStepPrice(auctionData.stepPrice);
      setLoading(false);
    }, (err) => {
      setError("Error fetching auction data: " + err.message);
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!id || !auction) return;
    const bidsQuery = query(
      collection(db, "auctions", id, "bids"),
      orderBy("amount", "desc"),
      orderBy("timestamp", "asc")
    );
    const unsubscribe = onSnapshot(bidsQuery, (snapshot) => {
      const bidsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBids(bidsData);

      const highest = bidsData.length > 0
        ? Number(bidsData[0].amount)
        : Number(auction.startingPrice) || 0;
      setHighestBid(highest);
    });
    return () => unsubscribe();
  }, [id, auction]);

  useEffect(() => {
    if (
      auction &&
      typeof auction.startingPrice === "number" &&
      !isNaN(auction.startingPrice) &&
      typeof stepPrice === "number" &&
      !isNaN(stepPrice) &&
      stepPrice > 0
    ) {
      const baseBid =
        typeof highestBid === "number" && !isNaN(highestBid) && highestBid >= auction.startingPrice
          ? highestBid
          : auction.startingPrice;

      const maxOptions = 200;
      const bidsArr = Array.from({ length: maxOptions }, (_, i) => baseBid + stepPrice + i * stepPrice)
        .filter(bid => !isNaN(bid));
      setAvailableBids(bidsArr);

      if (userBid === null || userBid <= baseBid) {
        setUserBid(baseBid + stepPrice);
      }
    }
  }, [auction, highestBid, stepPrice]);

  useEffect(() => {
    setJoined(false);
    const checkParticipant = async () => {
      if (user && id) {
        const participantDoc = await getDoc(doc(db, "auctions", id, "participants", user.uid));
        setJoined(participantDoc.exists());
      }
    };
    checkParticipant();
  }, [user, id]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "auctions", id, "participants"),
      (snapshot) => {
        setParticipants(snapshot.docs.map(doc => doc.id));
      }
    );
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!user) return;
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("time", "desc")
    );
    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notificationsData);
    });
    return () => unsubscribe();
  }, [user]);

  const handleBid = async () => {
    // Fetch user ban status
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData.bannedUntil && userData.bannedUntil.toDate() > new Date()) {
        alert("You are banned from bidding until " + userData.bannedUntil.toDate().toLocaleString());
        return;
      }
    }

    if (userBid <= highestBid) {
      alert("Your bid must be higher than the current highest bid!");
      return;
    }
    try {
      await addDoc(collection(db, "auctions", id, "bids"), {
        userId: user.uid,
        username: user.displayName || "Unknown",
        amount: userBid,
        timestamp: Timestamp.now(),
      });

      if (auction.userId !== user.uid) {
        await addDoc(collection(db, "notifications"), {
          userId: auction.userId,
          message: `A new bid of ${userBid.toLocaleString('vi-VN')} VND was placed on your auction "${auction.name}" by ${user.displayName || "Unknown"}.`,
          auctionId: id,
          read: false,
          time: Timestamp.now(),
        });
      }

      const participantsSnapshot = await getDocs(collection(db, "auctions", id, "participants"));
      const notifiedUserIds = new Set();
      participantsSnapshot.forEach(docSnap => {
        const participantsData = docSnap.data();
        if (participantsData.userId !== user.uid && participantsData.userId !== auction.userId) {
          notifiedUserIds.add(participantsData.userId);
        }
      });
      for (const bidderId of notifiedUserIds) {
        await addDoc(collection(db, "notifications"), {
          userId: bidderId,
          message: `A new bid of ${userBid.toLocaleString('vi-VN')} VND was placed on auction "${auction.name}".`,
          auctionId: id,
          read: false,
          time: Timestamp.now(),
        });
      }

      alert("Bid placed successfully!");
    } catch (err) {
      setError("Error placing bid: " + err.message);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    // Ban check
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData.bannedUntil && userData.bannedUntil.toDate() > new Date()) {
        alert("You are banned from joining auctions until " + userData.bannedUntil.toDate().toLocaleString());
        return;
      }
    }

    try {
      // Check if the user is already a participant
      const participantRef = doc(db, "auctions", id, "participants", user.uid);
      const participantDoc = await getDoc(participantRef);

      if (participantDoc.exists()) {
        alert("You have already joined this auction!");
        return;
      }

      // Add the user as a participant
      await setDoc(participantRef, {
        userId: user.uid,
        joinedAt: Timestamp.now(),
      });
      setJoined(true);
      alert("You have joined the auction!");

      // Notification creation is handled globally in AuctionNotifications.js
    } catch (err) {
      setError("Error joining auction: " + err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(
      unread.map(n => updateDoc(doc(db, "notifications", n.id), { read: true }))
    );
  };

  useEffect(() => {
    if (!auction || !auction.endTime) return;

    const updateRemaining = () => {
      const now = new Date();
      const end = auction.endTime.toDate();
      const diff = end - now;

      if (diff <= 0) {
        setRemainingTime("Auction ended");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setRemainingTime(
        `${hours}h ${minutes}m ${seconds}s`
      );
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [auction]);

  useEffect(() => {
    if (!auction || !id || auction.status === "ended") return;

    const now = new Date();
    const end = auction.endTime && auction.endTime.toDate();
    if (!end) return;

    const msUntilEnd = end - now;
    if (msUntilEnd > 0) {
      const timeoutId = setTimeout(async () => {
        try {
          await updateDoc(doc(db, "auctions", id), { status: "ended" });
        } catch (err) {
          // Optionally handle error
          console.error("Failed to update auction status:", err);
        }
      }, msUntilEnd);

      return () => clearTimeout(timeoutId);
    }
  }, [auction, id]);

  useEffect(() => {
    if (auction && auction.paymentStatus) {
      setLocalPaymentStatus(auction.paymentStatus);
    }
  }, [auction]);

  const handlePaymentStatusChange = (e) => {
    setLocalPaymentStatus(e.target.value);
    setEditPaymentStatus(true);
  };

  const handleSavePaymentStatus = async () => {
    await updateDoc(doc(db, "auctions", id), { paymentStatus: localPaymentStatus });
    setEditPaymentStatus(false);
  };

  if (loading) return <p>Loading auction details...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!auction) return null;

  const isOwner = user && auction.userId === user.uid;
  const isFull = auction.maxPeople && participants.length >= auction.maxPeople;
  const now = new Date();
  const isOngoing =
    auction.startTime && auction.endTime &&
    auction.startTime.toDate() <= now && now <= auction.endTime.toDate();
  const isEnded = auction.endTime && auction.endTime.toDate() < now;

  if (isEnded) {
    const highest = bids[0];
    const isWinner = user && highest && highest.userId === user.uid;
    const isAuctioneer = user && auction.userId === user.uid;
    const showPayment =
      (isWinner || isAuctioneer) && highest;

    // Payment status and deadline fallback
    const paymentStatus = auction.paymentStatus || "pending";
    const paymentDeadline = auction.paymentDeadline
      ? auction.paymentDeadline.toDate().toLocaleString("en-GB")
      : "N/A";

    return (
      <div className="auction-result-container">
        <h2>Result for: {auction.name}</h2>
        {highest ? (
          <>
            <p>
              <strong>Winner:</strong> {highest.username || "Unknown"}
            </p>
            <p>
              <strong>Winning Bid:</strong> {Number(highest.amount).toLocaleString('vi-VN')} VND
            </p>
            {showPayment && (
              <div style={{ marginTop: "20px" }}>
                <p>
                  <strong>Payment Status:</strong>{" "}
                  {isAuctioneer ? (
                    auction.paymentStatus === "approved" ? (
                      <span>Approved</span>
                    ) : (
                      <>
                        <select
                          value={localPaymentStatus}
                          onChange={handlePaymentStatusChange}
                          disabled={
                            auction.paymentStatus === "approved" ||
                            (auction.paymentDeadline &&
                              auction.paymentDeadline.toDate() < new Date())
                          }
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                        </select>
                        {editPaymentStatus && localPaymentStatus === "approved" && (
                          <button
                            onClick={handleSavePaymentStatus}
                            style={{ marginLeft: 8 }}
                            disabled={
                              auction.paymentStatus === "approved" ||
                              (auction.paymentDeadline &&
                                auction.paymentDeadline.toDate() < new Date())
                            }
                          >
                            Save
                          </button>
                        )}
                      </>
                    )
                  ) : (
                    <span>
                      {(auction.paymentStatus
                        ? auction.paymentStatus.charAt(0).toUpperCase() +
                          auction.paymentStatus.slice(1)
                        : "Pending")}
                    </span>
                  )}
                </p>
                <p>
                  <strong>Payment Deadline:</strong>{" "}
                  <span>{paymentDeadline}</span>
                </p>
              </div>
            )}
          </>
        ) : (
          <p>No bids were placed. No winner.</p>
        )}
      </div>
    );
  }

  return (
    <div className="auction-detail-container">
      <h2>{auction.name}</h2>
      {auction.imageUrls && auction.imageUrls.length > 0 ? (
        <div className="product-images">
          {auction.imageUrls.map((url, index) => (
            <img key={index} src={url} alt={`${auction.name} - ${index + 1}`} style={{ maxWidth: '200px', maxHeight: '200px', margin: '10px' }} />
          ))}
        </div>
      ) : auction.imageUrl ? <img src={auction.imageUrl} alt={auction.name} style={{ maxWidth: '200px', maxHeight: '200px', margin: '10px' }} /> : null}
      <p><strong>Product:</strong> {auction.product}</p>
      <p><strong>Category:</strong> {auction.category}</p>
      <p><strong>Description: </strong>{auction.description}</p>
      <p>
        <strong>Starting Price: </strong>{
          typeof auction.startingPrice === "number" && !isNaN(auction.startingPrice)
            ? new Intl.NumberFormat('vi-VN').format(auction.startingPrice)
            : 'N/A'
        } VND
      </p>
      <p><strong>Max People:</strong> {auction.maxPeople || "N/A"}</p>
      <p><strong>Start Time:</strong> {auction.startTime ? auction.startTime.toDate().toLocaleString("en-GB") : "N/A"}</p>
      <p><strong>End Time:</strong> {auction.endTime ? auction.endTime.toDate().toLocaleString("en-GB") : "N/A"}</p>
      <p><strong>Remaining Time:</strong> {remainingTime}</p>
      <p><strong>Payment Deadline:</strong> {auction.paymentDeadline ? auction.paymentDeadline.toDate().toLocaleString("en-GB") : "N/A"}</p>
      {user && !isOwner && !isFull && isOngoing && (
        joined ? (
          <div>
            <label htmlFor="bidAmount">
              <strong>Your Bid</strong> (minimum {highestBid && stepPrice ? new Intl.NumberFormat('vi-VN').format(highestBid + stepPrice) : 'N/A'} VND):
            </label>
            <select
              id="bidAmount"
              value={userBid}
              onChange={e => setUserBid(Number(e.target.value))}
            >
              {availableBids.map(bidAmount => (
                <option key={bidAmount} value={bidAmount}>
                  {new Intl.NumberFormat('vi-VN').format(bidAmount)} VND
                </option>
              ))}
            </select>
            <p>
              <strong>Current Highest Bid:</strong> {
                bids.length > 0
                  ? Number(bids[0].amount).toLocaleString('vi-VN', { maximumFractionDigits: 0 })
                  : (auction && auction.startingPrice
                      ? Number(auction.startingPrice).toLocaleString('vi-VN', { maximumFractionDigits: 0 })
                      : 'N/A')
              } VND
            </p>
            <p>
             <strong> Step Price:</strong> {stepPrice ? new Intl.NumberFormat('vi-VN').format(stepPrice) : 'N/A'} VND
            </p>
            <button onClick={handleBid} disabled={userBid <= highestBid}>Place Bid</button>
          </div>
        ) : (
          <button onClick={handleJoin}>Join Auction</button>
        )
      )}
      {isFull && <p>This auction is full. No more participants can join.</p>}
      {joined && bids.length > 0 && (
        <div>
          <h3>Bids:</h3>
          <ul>
            {bids.map(bid => (
              <li key={bid.id}>
                User: {bid.username || "Unknown"} , Amount: {Number(bid.amount).toLocaleString('vi-VN')} VND, Time: {bid.timestamp.toDate().toLocaleString("en-GB")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AuctionDetail;

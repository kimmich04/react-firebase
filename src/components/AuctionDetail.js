import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, orderBy, getDocs, addDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from '../Firebase';
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
  const [winner, setWinner] = useState(null);
  const [participants, setParticipants] = useState([]);
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

        // Ensure numeric types
        auctionData.startingPrice = Number(auctionData.startingPrice) || 0;
        auctionData.stepPrice =
          typeof auctionData.stepPrice === "number"
            ? auctionData.stepPrice
            : (typeof auctionData.stepPrice === "string" && !isNaN(Number(auctionData.stepPrice)))
              ? Number(auctionData.stepPrice)
              : 1;
        auctionData.maxPeople = Number(auctionData.maxPeople) || 0;

        setAuction(auctionData);
        setStepPrice(auctionData.stepPrice); // <-- Add this line
      } catch (err) {
        setError("Error fetching auction data: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAuctionData();
  }, [id, user]);

  // Real-time bids and highest bid
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
      // Use highestBid if it's a valid number, otherwise use startingPrice
      const baseBid =
        typeof highestBid === "number" && !isNaN(highestBid) && highestBid >= auction.startingPrice
          ? highestBid
          : auction.startingPrice;

      // Always show at least 10 options, all guaranteed to be numbers
      const bidsArr = Array.from({ length: 10 }, (_, i) => baseBid + stepPrice + i * stepPrice)
        .filter(bid => !isNaN(bid));
      setAvailableBids(bidsArr);

      // Only update userBid if it's invalid
      if (userBid === null || userBid <= baseBid) {
        setUserBid(baseBid + stepPrice);
      }
    }
  }, [auction, highestBid, stepPrice]);

  useEffect(() => {
    // Reset joined state when user or auction changes
    setJoined(false);

    const checkParticipant = async () => {
      if (user && id) {
        const participantDoc = await getDoc(doc(db, "auctions", id, "participants", user.uid));
        setJoined(participantDoc.exists());
      }
    };
    checkParticipant();
  }, [user, id]);

  // Listen for real-time participants updates
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "auctions", id, "participants"),
      (snapshot) => {
        setParticipants(snapshot.docs.map(doc => doc.id));
      }
    );
    return () => unsub();
  }, [id]);

  const handleBid = async () => {
    // Always check against latest highestBid
    if (userBid <= highestBid) {
      alert("Your bid must be higher than the current highest bid!");
      return;
    }
    try {
      await addDoc(collection(db, "auctions", id, "bids"), {
        userId: user.uid,
        amount: userBid,
        timestamp: new Date(),
      });
      alert("Bid placed successfully!");
      // Don't update userBid here, let the onSnapshot handle it
    } catch (err) {
      setError("Error placing bid: " + err.message);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      // This will create or update the participant document under the auction
      await setDoc(doc(db, "auctions", id, "participants", user.uid), {
        userId: user.uid,
        joinedAt: new Date(),
      });
      setJoined(true);
      alert("You have joined the auction!");
    } catch (err) {
      setError("Error joining auction: " + err.message);
    }
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
      <p>Category: {auction.category}</p>
      <p>Description: {auction.description}</p>
      <p>
        Starting Price: {
          typeof auction.startingPrice === "number" && !isNaN(auction.startingPrice)
            ? new Intl.NumberFormat('vi-VN').format(auction.startingPrice)
            : 'N/A'
        } VND
      </p>
      {user && !isOwner && !isFull && isOngoing && (
        joined ? (
          <div>
            <label htmlFor="bidAmount">
              Your Bid (minimum {highestBid && stepPrice ? new Intl.NumberFormat('vi-VN').format(highestBid + stepPrice) : 'N/A'} VND):
            </label>
            <select
              id="bidAmount"
              value={userBid}
              onChange={e => setUserBid(Number(e.target.value))}
            >
              {availableBids.map((bidAmount) => (
                <option key={bidAmount} value={bidAmount}>
                  {new Intl.NumberFormat('vi-VN').format(bidAmount)} VND
                </option>
              ))}
            </select>
            <p>
              Current Highest Bid: {
                bids.length > 0
                  ? Number(bids[0].amount).toLocaleString('vi-VN', { maximumFractionDigits: 0 })
                  : (auction && auction.startingPrice
                      ? Number(auction.startingPrice).toLocaleString('vi-VN', { maximumFractionDigits: 0 })
                      : 'N/A')
              } VND
            </p>
            <p>
              Step Price: {stepPrice ? new Intl.NumberFormat('vi-VN').format(stepPrice) : 'N/A'} VND
            </p>
            <button onClick={handleBid} disabled={userBid <= highestBid}>Place Bid</button>
          </div>
        ) : (
          <button onClick={handleJoin}>Join Auction</button>
        )
      )}

      {isFull && <p>This auction is full. No more participants can join.</p>}

      {winner && (
        <div>
          <h3>Winner:</h3>
          <p>User: {winner}</p>
        </div>
      )}

      {bids.length > 0 && (
        <div>
          <h3>Bids:</h3>
          <ul>
            {bids.map(bid => (
              <li key={bid.id}>
                Amount: {Number(bid.amount).toLocaleString('vi-VN')} VND, Time: {bid.timestamp.toDate().toLocaleString("en-GB")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AuctionDetail;

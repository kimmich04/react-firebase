import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/AuctionDetail.scss";
import { api } from "../services/api";

function toDateSafe(x) {
  if (!x) return null;
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? null : d;
}

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
  const [participantsCount, setParticipantsCount] = useState(0);

  const [remainingTime, setRemainingTime] = useState("");
  const [editPaymentStatus, setEditPaymentStatus] = useState(false);
  const [localPaymentStatus, setLocalPaymentStatus] = useState("pending");

  const navigate = useNavigate();

  // Poll auction detail (includes bids + joined + participantsCount)
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setError(null);
        const data = await api.getAuctionDetail(id);
        if (!alive) return;

        const a = data.auction;
        a.startingPrice = Number(a.startingPrice) || 0;
        a.stepPrice =
          typeof a.stepPrice === "number"
            ? a.stepPrice
            : (typeof a.stepPrice === "string" && !isNaN(Number(a.stepPrice)))
              ? Number(a.stepPrice)
              : 1;
        a.maxPeople = Number(a.maxPeople) || 0;

        setAuction(a);
        setBids(data.bids || []);
        setJoined(Boolean(data.joined));
        setParticipantsCount(Number(data.participantsCount || 0));

        setStepPrice(a.stepPrice);
        if (a.paymentStatus) setLocalPaymentStatus(a.paymentStatus);

        // compute highest
        const highest = (data.bids && data.bids.length > 0)
          ? Number(data.bids[0].amount)
          : Number(a.startingPrice) || 0;
        setHighestBid(highest);

        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Error fetching auction detail");
        setLoading(false);
      }
    };

    load();
    const poll = setInterval(load, 2000);
    return () => {
      alive = false;
      clearInterval(poll);
    };
  }, [id]);

  // Build bid options
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
        .filter((bid) => !isNaN(bid));

      setAvailableBids(bidsArr);

      if (userBid === null || userBid <= baseBid) {
        setUserBid(baseBid + stepPrice);
      }
    }
  }, [auction, highestBid, stepPrice]);

  // Remaining time
  useEffect(() => {
    if (!auction?.endTime) return;

    const updateRemaining = () => {
      const end = toDateSafe(auction.endTime);
      if (!end) return setRemainingTime("N/A");

      const now = new Date();
      const diff = end - now;

      if (diff <= 0) {
        setRemainingTime("Auction ended");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setRemainingTime(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [auction]);

  const handleBid = async () => {
    if (!user) {
      navigate("/");
      return;
    }

    if (typeof userBid !== "number" || userBid <= (highestBid || 0)) {
      alert("Your bid must be higher than the current highest bid!");
      return;
    }

    try {
      await api.placeBid(id, { amount: userBid });
      alert("Bid placed successfully!");
    } catch (e) {
      alert(e.message);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      navigate("/");
      return;
    }
    try {
      await api.joinAuction(id);
      alert("You have joined the auction!");
    } catch (e) {
      alert(e.message);
    }
  };

  const handlePaymentStatusChange = (e) => {
    setLocalPaymentStatus(e.target.value);
    setEditPaymentStatus(true);
  };

  const handleSavePaymentStatus = async () => {
    try {
      await api.updatePaymentStatus(id, { paymentStatus: localPaymentStatus });
      setEditPaymentStatus(false);
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <p>Loading auction details...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!auction) return null;

  const isOwner = user && auction.userId === user.uid;

  const now = new Date();
  const start = toDateSafe(auction.startTime);
  const end = toDateSafe(auction.endTime);

  const isOngoing = start && end && start <= now && now <= end;
  const isEnded = end && end < now;

  const isFull = auction.maxPeople && participantsCount >= auction.maxPeople;

  // if ended: show result view
  if (isEnded) {
    const highest = bids[0];
    const isWinner = user && highest && highest.userId === user.uid;
    const isAuctioneer = user && auction.userId === user.uid;
    const showPayment = (isWinner || isAuctioneer) && highest;

    const paymentDeadline = auction.paymentDeadline
      ? toDateSafe(auction.paymentDeadline)?.toLocaleString("en-GB")
      : "N/A";

    return (
      <div className="auction-result-container">
        <h2>Result for: {auction.name}</h2>

        {highest ? (
          <>
            <p><strong>Winner:</strong> {highest.username || "Unknown"}</p>
            <p><strong>Winning Bid:</strong> {Number(highest.amount).toLocaleString("vi-VN")} VND</p>

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
                            (auction.paymentDeadline && toDateSafe(auction.paymentDeadline) < new Date())
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
                              (auction.paymentDeadline && toDateSafe(auction.paymentDeadline) < new Date())
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
                        ? auction.paymentStatus.charAt(0).toUpperCase() + auction.paymentStatus.slice(1)
                        : "Pending")}
                    </span>
                  )}
                </p>

                {auction.paymentInfo && (
                  <p><strong>Payment Information:</strong> {auction.paymentInfo}</p>
                )}

                <p>
                  <strong>Payment Deadline:</strong> <span>{paymentDeadline}</span>
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
            <img
              key={index}
              src={url}
              alt={`${auction.name} - ${index + 1}`}
              style={{ maxWidth: "200px", maxHeight: "200px", margin: "10px" }}
            />
          ))}
        </div>
      ) : auction.imageUrl ? (
        <img
          src={auction.imageUrl}
          alt={auction.name}
          style={{ maxWidth: "200px", maxHeight: "200px", margin: "10px" }}
        />
      ) : null}

      <p><strong>Product:</strong> {auction.product}</p>
      <p><strong>Category:</strong> {auction.category}</p>
      <p><strong>Description: </strong>{auction.description}</p>

      <p>
        <strong>Starting Price: </strong>
        {typeof auction.startingPrice === "number" && !isNaN(auction.startingPrice)
          ? new Intl.NumberFormat("vi-VN").format(auction.startingPrice)
          : "N/A"}{" "}
        VND
      </p>

      <p><strong>Max People:</strong> {auction.maxPeople || "N/A"}</p>
      <p><strong>Participants:</strong> {participantsCount}</p>

      <p><strong>Start Time:</strong> {start ? start.toLocaleString("en-GB") : "N/A"}</p>
      <p><strong>End Time:</strong> {end ? end.toLocaleString("en-GB") : "N/A"}</p>
      <p><strong>Remaining Time:</strong> {remainingTime}</p>

      <p>
        <strong>Payment Deadline:</strong>{" "}
        {auction.paymentDeadline ? toDateSafe(auction.paymentDeadline)?.toLocaleString("en-GB") : "N/A"}
      </p>

      {user && !isOwner && !isFull && isOngoing && (
        joined ? (
          <div>
            <label htmlFor="bidAmount">
              <strong>Your Bid</strong>{" "}
              (minimum{" "}
              {highestBid && stepPrice
                ? new Intl.NumberFormat("vi-VN").format(highestBid + stepPrice)
                : "N/A"}{" "}
              VND):
            </label>

            <select
              id="bidAmount"
              value={userBid || ""}
              onChange={(e) => setUserBid(Number(e.target.value))}
            >
              {availableBids.map((bidAmount) => (
                <option key={bidAmount} value={bidAmount}>
                  {new Intl.NumberFormat("vi-VN").format(bidAmount)} VND
                </option>
              ))}
            </select>

            <p>
              <strong>Current Highest Bid:</strong>{" "}
              {bids.length > 0
                ? Number(bids[0].amount).toLocaleString("vi-VN", { maximumFractionDigits: 0 })
                : (auction.startingPrice
                    ? Number(auction.startingPrice).toLocaleString("vi-VN", { maximumFractionDigits: 0 })
                    : "N/A")}{" "}
              VND
            </p>

            <p>
              <strong>Step Price:</strong>{" "}
              {stepPrice ? new Intl.NumberFormat("vi-VN").format(stepPrice) : "N/A"} VND
            </p>

            <button onClick={handleBid} disabled={(userBid || 0) <= (highestBid || 0)}>
              Place Bid
            </button>
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
            {bids.map((bid) => (
              <li key={bid.id}>
                User: {bid.username || "Unknown"}, Amount:{" "}
                {Number(bid.amount).toLocaleString("vi-VN")} VND, Time:{" "}
                {bid.timestamp ? toDateSafe(bid.timestamp)?.toLocaleString("en-GB") : "N/A"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AuctionDetail;
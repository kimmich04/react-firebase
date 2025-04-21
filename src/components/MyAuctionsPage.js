import React, { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db, auth } from "../Firebase";
import "../styles/MyAuctionsPage.scss";
import { useNavigate } from "react-router-dom";

export default function MyAuctionsPage({ searchTerm }) { // Add searchTerm prop
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredAuctions, setFilteredAuctions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const user = auth.currentUser;
        const q = query(
          collection(db, "auctions"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const fetchedAuctions = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAuctions(fetchedAuctions);
      } catch (err) {
        setError("Error fetching auctions: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAuctions();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = auctions.filter((auction) => {
        return (
          auction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          auction.product.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
      setFilteredAuctions(filtered);
    } else {
      setFilteredAuctions(auctions);
    }
  }, [searchTerm, auctions]);

  if (loading) return <p>Loading auctions...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div className="my-auctions-container">
      <div className="my-auctions-header">
        <h2>My Auctions</h2>
      </div>
      <div className="auctions-grid">
        {filteredAuctions.map((auction) => {
          const now = new Date();
          const start = auction.startTime?.toDate();
          const canEdit = start && now < start;

          return (
            <div
              key={auction.id}
              className="auction-card"
              onClick={() => navigate(`/auction/${auction.id}`)}
            >
              {auction.imageUrl && (
                <img
                  src={auction.imageUrl}
                  alt={auction.name}
                  className="auction-image"
                />
              )}

              <h3>{auction.name}</h3>
              <p className="meta"> Product: {auction.product}</p>
              <p className="meta"> Category: {auction.category}</p>
              <p className="starting-price"> Starting Price: {auction.startingPrice}</p>

              <div className="time-section">
                {auction.startTime && (
                  <p className="time">
                    🕒 Start: {auction.startTime.toDate().toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    })}
                  </p>
                )}
                {auction.endTime && (
                  <p className="time">
                    ⏰ End: {auction.endTime.toDate().toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    })}
                  </p>
                )}
              </div>

              <div className="detail-button">Detail</div>

              {canEdit && (
                <div
                  className="edit-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/auction/edit-auction/${auction.id}`);
                  }}
                >
                  Edit
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

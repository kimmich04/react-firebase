import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, getDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "../Firebase";
import "../styles/MyAuctionsPage.scss";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

export default function MyAuctionsPage({ searchTerm }) {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredAuctions, setFilteredAuctions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribeAuth;
    setLoading(true);

    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setAuctions([]);
        setLoading(false);
        return;
      }

      // Real-time listener for auctions
      const q = query(collection(db, "auctions"));
      const unsubscribeAuctions = onSnapshot(q, async (snapshot) => {
        const allAuctions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 2. Filter auctions where user is owner or participant
        const myAuctions = [];
        for (const auction of allAuctions) {
          if (auction.userId === user.uid) {
            myAuctions.push(auction);
            continue;
          }
          // Check if user is a participant
          const participantDoc = await getDoc(doc(db, "auctions", auction.id, "participants", user.uid));
          if (participantDoc.exists()) {
            myAuctions.push(auction);
          }
        }

        // Sort by createdAt descending if available
        myAuctions.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return b.createdAt.seconds - a.createdAt.seconds;
          }
          return 0;
        });

        setAuctions(myAuctions);
        setLoading(false);
      });

      // Clean up Firestore listener on unmount or logout
      return () => unsubscribeAuctions();
    });

    return () => unsubscribeAuth && unsubscribeAuth();
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
      <h3>Created Auctions</h3>
      <div className="auctions-grid">
        {filteredAuctions
          .filter(a => a.userId === auth.currentUser?.uid)
          .map((auction) => {
            const now = new Date();
            const start = auction.startTime?.toDate();
            const canEdit = start && now < start;

            return (
              <div
                key={auction.id}
                className="auction-card"
                onClick={() => navigate(`/auction/${auction.id}`)}
              >
                {auction.imageUrls && auction.imageUrls.length > 0 ? (
                  <img
                    src={auction.imageUrls[0]}
                    alt={auction.name}
                    className="auction-image"
                  />
                ) : auction.imageUrl && (
                  <img src={auction.imageUrl} alt={auction.name} className="auction-image" />
                )}

                <h3>{auction.name}</h3>
                <p className="meta"> Product: {auction.product}</p>
                <p className="meta"> Category: {auction.category}</p>
                <p className="starting-price">
                  Starting Price: {auction.startingPrice
                    ? `${new Intl.NumberFormat('vi-VN').format(Number(auction.startingPrice))} VND`
                    : 'N/A'}
                </p>

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
      <h3>Joined Auctions</h3>
      <div className="auctions-grid">
        {filteredAuctions
          .filter(a => a.userId !== auth.currentUser?.uid)
          .map((auction) => {
            const now = new Date();
            const start = auction.startTime?.toDate();
            const canEdit = start && now < start;

            return (
              <div
                key={auction.id}
                className="auction-card"
                onClick={() => navigate(`/auction/${auction.id}`)}
              >
                {auction.imageUrls && auction.imageUrls.length > 0 ? (
                  <img
                    src={auction.imageUrls[0]}
                    alt={auction.name}
                    className="auction-image"
                  />
                ) : auction.imageUrl && (
                  <img src={auction.imageUrl} alt={auction.name} className="auction-image" />
                )}

                <h3>{auction.name}</h3>
                <p className="meta"> Product: {auction.product}</p>
                <p className="meta"> Category: {auction.category}</p>
                <p className="starting-price">
                  Starting Price: {auction.startingPrice
                    ? `${new Intl.NumberFormat('vi-VN').format(Number(auction.startingPrice))} VND`
                    : 'N/A'}
                </p>

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
      {!loading && filteredAuctions.length === 0 && (
        <p style={{ textAlign: "center", color: "#888" }}>
          You have not joined or created any auctions yet.
        </p>
      )}
    </div>
  );
}


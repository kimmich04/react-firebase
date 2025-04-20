import React, { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../Firebase";
export default function MyAuctionsPage() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const q = query(
          collection(db, "auctions"),
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

  if (loading) return <p>Loading auctions...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div className="my-auctions-container">
      <h2>My Auctions</h2>
      <div className="auctions-grid">
        {auctions.map((auction) => (
          <div key={auction.id} className="auction-card">
            {auction.imageUrl && (
              <img
                src={auction.imageUrl}
                alt={auction.product}
                className="auction-image"
              />
            )}
            <h3>{auction.name}</h3>
            <p>Product: {auction.product}</p>
            <p>Category: {auction.category}</p>
            <p>Starting Price: {auction.startingPrice}</p>
            {auction.startTime && (
              <p>
                Start Time:{" "}
                {auction.startTime.toDate().toLocaleString()}
              </p>
            )}
            {auction.endTime && (
              <p>
                End Time: {auction.endTime.toDate().toLocaleString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

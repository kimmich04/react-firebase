import React, { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db, auth } from "../Firebase";
import "../styles/MyAuctionsPage.scss";
import { Link, useNavigate } from "react-router-dom";

export default function MyAuctionsPage() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const user = auth.currentUser;
        // if (!user) {
        //   setError("You must be logged in to view your auctions.");
        //   setLoading(false);
        //   return;
        // }

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

  // const goToEditAuction = () => {
  //   navigate("/auction/edit-auction/${auction.id}");
  // };

  if (loading) return <p>Loading auctions...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div className="my-auctions-container">
      <h2>My Auctions</h2>
      <div className="auctions-grid">
        {auctions.map((auction) => (
          <Link to={`/auction/${auction.id}`} className="auction-link" key={auction.id}>
          <div className="auction-card">
            {auction.imageUrl && (<img src={auction.imageUrl} alt={auction.name} className="auction-image"/>)}
        
            <h3>{auction.name}</h3>
            <p className="meta"> Product: {auction.product}</p>
            <p className="meta"> Category: {auction.category}</p>
            <p className="starting-price"> Starting Price: {auction.startingPrice}</p>
        
            <div className="time-section">
              {auction.startTime && (
                <p className="time">🕒 Start: {auction.startTime.toDate().toLocaleString("en-GB", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
                })}</p>
              )}
              {auction.endTime && (
                <p className="time">⏰ End: {auction.endTime.toDate().toLocaleString("en-GB", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
                })}</p>
              )}
            </div>
        
            <div className="detail-button">Detail</div>
            <Link to={`/auction/edit-auction/${auction.id}`} className="" key={auction.id}>
              <div className="edit-button" >Edit</div>
            </Link>
          </div>
        </Link>
        
        ))}
      </div>
    </div>
  );
}

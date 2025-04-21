import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../Firebase";
import "../styles/Products.scss";

export default function Product() {
  const { id } = useParams(); 
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAuction = async () => {
      try {
        const docSnap = await getDoc(doc(db, "auctions", id));
        if (docSnap.exists()) {
          setAuction(docSnap.data());
        } else {
          setError("Auction not found");
        }
      } catch (err) {
        setError("Error fetching auction: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAuction();
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!auction) return null;

  return (
    <div className="product-container">
      <div className="product-image">
        <img src={auction.imageUrl} alt={auction.name} />
      </div>
      <div className="product-details">
        <h2>{auction.name}</h2>
        <p><strong>Starting Price:</strong> {auction.startingPrice}</p>
        <p><strong>Product:</strong> {auction.product}</p>
        <p><strong>Category:</strong> {auction.category}</p>
        <p><strong>Description:</strong> {auction.description}</p>
        <p><strong>Start Time:</strong> {auction.startTime?.toDate().toLocaleString("en-GB")}</p>
        <p><strong>End Time:</strong> {auction.endTime?.toDate().toLocaleString("en-GB")}</p>
      </div>
    </div>

  );
}

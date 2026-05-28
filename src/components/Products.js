import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "../styles/Products.scss";
import { api } from "../services/api";

function toDateSafe(x) {
  if (!x) return null;
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function Product() {
  const { id } = useParams();
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAuction = async () => {
      try {
        const data = await api.getAuction(id);
        setAuction(data.auction);
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
        <img src={auction.imageUrl || auction.imageUrls?.[0]} alt={auction.name} />
      </div>
      <div className="product-details">
        <h2>{auction.name}</h2>
        <p><strong>Starting Price:</strong> {auction.startingPrice}</p>
        <p><strong>Product:</strong> {auction.product}</p>
        <p><strong>Category:</strong> {auction.category}</p>
        <p><strong>Description:</strong> {auction.description}</p>
        <p><strong>Start Time:</strong> {toDateSafe(auction.startTime)?.toLocaleString("en-GB")}</p>
        <p><strong>End Time:</strong> {toDateSafe(auction.endTime)?.toLocaleString("en-GB")}</p>
      </div>
    </div>
  );
}
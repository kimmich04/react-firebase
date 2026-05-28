import React, { useState, useEffect, useMemo } from "react";
import "../styles/MyAuctionsPage.scss";
import { useNavigate } from "react-router-dom";
import { onIdTokenChanged } from "firebase/auth";
import { auth } from "../Firebase";
import { api } from "../services/api";

function toDateSafe(x) {
  if (!x) return null;
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function MyAuctionsPage({ searchTerm }) {
  const [uid, setUid] = useState(null);
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (user) => {
      setError("");

      if (!user) {
        setUid(null);
        setAuctions([]);
        setLoading(false);
        return;
      }

      setUid(user.uid);

      try {
        setLoading(true);

        // IMPORTANT: force refresh token so backend gets a valid JWT
        await user.getIdToken(true);

        const data = await api.getMyAuctions();
        setAuctions(data?.auctions || []);
      } catch (e) {
        console.error("getMyAuctions failed:", e);
        setAuctions([]);
        setError(e?.message || "Failed to load your auctions.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const filteredAuctions = useMemo(() => {
    if (!searchTerm) return auctions;
    const term = searchTerm.toLowerCase();
    return auctions.filter(
      (a) =>
        (a.name || "").toLowerCase().includes(term) ||
        (a.product || "").toLowerCase().includes(term)
    );
  }, [auctions, searchTerm]);

  if (loading) return <p>Loading auctions...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  const created = filteredAuctions.filter((a) => a.userId === uid);
  const joined = filteredAuctions.filter((a) => a.userId !== uid);

  return (
    <div className="my-auctions-container">
      <div className="my-auctions-header">
        <h2>My Auctions</h2>
      </div>

      {created.length > 0 && (
        <>
          <h3>Created Auctions</h3>
          <div className="auctions-grid">
            {created.map((auction) => {
              const now = new Date();
              const start = toDateSafe(auction.startTime);
              const canEdit = start && now < start;

              return (
                <div
                  key={auction.id}
                  className="auction-card"
                  onClick={() => navigate(`/auction/${auction.id}`)}
                >
                  {auction.imageUrls?.length ? (
                    <img
                      src={auction.imageUrls[0]}
                      alt={auction.name}
                      className="auction-image"
                    />
                  ) : auction.imageUrl ? (
                    <img
                      src={auction.imageUrl}
                      alt={auction.name}
                      className="auction-image"
                    />
                  ) : null}

                  <h3>{auction.name}</h3>
                  <p className="meta">Product: {auction.product}</p>
                  <p className="meta">Category: {auction.category}</p>

                  <p className="starting-price">
                    Starting Price:{" "}
                    {auction.startingPrice
                      ? `${new Intl.NumberFormat("vi-VN").format(
                          Number(auction.startingPrice)
                        )} VND`
                      : "N/A"}
                  </p>

                  <div className="time-section">
                    {start && (
                      <p className="time">
                        🕒 Start:{" "}
                        {start.toLocaleString("en-GB", {
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
                        ⏰ End:{" "}
                        {toDateSafe(auction.endTime)?.toLocaleString("en-GB", {
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
        </>
      )}

      {joined.length > 0 && (
        <>
          <h3>Joined Auctions</h3>
          <div className="auctions-grid">
            {joined.map((auction) => (
              <div
                key={auction.id}
                className="auction-card"
                onClick={() => navigate(`/auction/${auction.id}`)}
              >
                {auction.imageUrls?.length ? (
                  <img
                    src={auction.imageUrls[0]}
                    alt={auction.name}
                    className="auction-image"
                  />
                ) : auction.imageUrl ? (
                  <img
                    src={auction.imageUrl}
                    alt={auction.name}
                    className="auction-image"
                  />
                ) : null}

                <h3>{auction.name}</h3>
                <p className="meta">Product: {auction.product}</p>
                <p className="meta">Category: {auction.category}</p>

                <div className="detail-button">Detail</div>
              </div>
            ))}
          </div>
        </>
      )}

      {created.length === 0 && joined.length === 0 && (
        <p style={{ textAlign: "center", color: "#888" }}>
          You have not joined or created any auctions yet.
        </p>
      )}
    </div>
  );
}
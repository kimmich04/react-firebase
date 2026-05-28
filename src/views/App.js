import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import CreateAuctionPage from "../components/CreateAuctionPage";
import ProfilePage from "../components/ProfilePage";
import "../styles/Navbar.scss";
import "@fortawesome/fontawesome-free/css/all.min.css";
import MyAuctionsPage from "../components/MyAuctionsPage";
import "../styles/HomePage.scss";
import AuctionDetail from "../components/AuctionDetail";
import EditAuctionsPage from "../components/EditAuctionsPage";
import AuctionNotifications from "../components/AuctionNotifications";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../Firebase";
import { api } from "../services/api";

function toDateSafe(x) {
  if (!x) return null;
  if (x instanceof Date) return x;
  // if backend sends ISO string or millis
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? null : d;
}

function App({ time, onTimeUpdate }) {
  const [upcomingAuctions, setUpcomingAuctions] = useState([]);
  const [ongoingAuctions, setOngoingAuctions] = useState([]);
  const [allAuctions, setAllAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredAuctions, setFilteredAuctions] = useState([]);
  const [isBanned, setIsBanned] = useState(false);
  const [banRemaining, setBanRemaining] = useState("");

  const categorizeAuctions = (fetchedAuctions) => {
    const now = new Date();
    const upcoming = [];
    const ongoing = [];

    fetchedAuctions.forEach((auction) => {
      if (!auction.startTime || !auction.endTime) return;

      const startTime = toDateSafe(auction.startTime);
      const endTime = toDateSafe(auction.endTime);
      if (!startTime || !endTime) return;

      if (startTime > now) upcoming.push(auction);
      else if (startTime <= now && endTime > now) ongoing.push(auction);
    });

    return { upcoming, ongoing };
  };

  // Fetch auctions (polling)
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setError(null);
        const data = await api.listAuctions();
        if (!alive) return;
        setAllAuctions(data.auctions || []);
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setError("Error fetching auctions: " + e.message);
        setLoading(false);
      }
    };

    load();
    const id = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Timer-based categorization logic
  useEffect(() => {
    const interval = setInterval(() => {
      const { upcoming, ongoing } = categorizeAuctions(allAuctions);
      setUpcomingAuctions(upcoming);
      setOngoingAuctions(ongoing);
    }, 1000);

    const { upcoming, ongoing } = categorizeAuctions(allAuctions);
    setUpcomingAuctions(upcoming);
    setOngoingAuctions(ongoing);

    return () => clearInterval(interval);
  }, [allAuctions]);

  // Filter auctions based on search term
  useEffect(() => {
    const combined = [...upcomingAuctions, ...ongoingAuctions];
    if (searchTerm) {
      const filtered = combined.filter((auction) => {
        return (
          (auction.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (auction.product || "").toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
      setFilteredAuctions(filtered);
    } else {
      setFilteredAuctions(combined);
    }
  }, [searchTerm, upcomingAuctions, ongoingAuctions]);

  // Ban status from backend
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsBanned(false);
        setBanRemaining("");
        return;
      }
      try {
        const profile = await api.getMyProfile();
        const bannedUntil = profile?.user?.bannedUntil ? new Date(profile.user.bannedUntil) : null;

        if (bannedUntil && bannedUntil > new Date()) {
          setIsBanned(true);
          const now = new Date();
          const diffMs = bannedUntil - now;
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
          const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);
          let msg = "";
          if (diffDays > 0) msg += `${diffDays} day${diffDays > 1 ? "s" : ""} `;
          if (diffHours > 0) msg += `${diffHours} hour${diffHours > 1 ? "s" : ""} `;
          if (diffMinutes > 0) msg += `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
          setBanRemaining(msg.trim());
        } else {
          setIsBanned(false);
          setBanRemaining("");
        }
      } catch {
        // if profile call fails, don't block UI
        setIsBanned(false);
        setBanRemaining("");
      }
    });

    return () => unsub();
  }, []);

  if (loading) return <p>Loading auctions...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  const currentUser = auth.currentUser;

  return (
    <Router>
      <div className="App">
        <Navbar onSearchChange={setSearchTerm} onTimeUpdate={onTimeUpdate} />
        <AuctionNotifications />
        <div className="main-content">
          <Routes>
            <Route path="/create-auction" element={<CreateAuctionPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/my-auctions" element={<MyAuctionsPage searchTerm={searchTerm} />} />
            <Route path="/auction/:id" element={<AuctionDetail user={auth.currentUser} />} />
            <Route path="/auction/edit-auction/:id" element={<EditAuctionsPage />} />

            <Route
              path="/"
              element={
                <div className="home-page-container">
                  <h2 style={{ color: "#222", fontWeight: "bold" }}>
                    Welcome to Online Auction
                  </h2>

                  {isBanned && (
                    <p style={{ color: "red", marginTop: 8 }}>
                      You are banned from creating auctions until your ban expires.
                      {banRemaining && <> (Remaining: {banRemaining})</>}
                    </p>
                  )}

                  <div className="home-page-button"></div>

                  {filteredAuctions.filter((a) => upcomingAuctions.includes(a)).length > 0 && (
                    <div className="auctions-section">
                      <h3>Upcoming Auctions</h3>
                      <div className="auctions-grid">
                        {filteredAuctions
                          .filter(
                            (auction) =>
                              upcomingAuctions.includes(auction) &&
                              (!currentUser || auction.userId !== currentUser.uid)
                          )
                          .map((auction) => (
                            <AuctionCard key={auction.id} auction={auction} />
                          ))}
                      </div>
                    </div>
                  )}

                  {filteredAuctions.filter((a) => ongoingAuctions.includes(a)).length > 0 && (
                    <div className="auctions-section">
                      <h3>Ongoing Auctions</h3>
                      <div className="auctions-grid">
                        {filteredAuctions
                          .filter(
                            (auction) =>
                              ongoingAuctions.includes(auction) &&
                              (!currentUser || auction.userId !== currentUser.uid)
                          )
                          .map((auction) => (
                            <AuctionCard key={auction.id} auction={auction} />
                          ))}
                      </div>
                    </div>
                  )}

                  {filteredAuctions.length === 0 && !loading && <p>No auctions found.</p>}
                </div>
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

const AuctionCard = ({ auction }) => {
  const start = toDateSafe(auction.startTime);
  const end = toDateSafe(auction.endTime);

  return (
    <div className="auction-card">
      {auction.imageUrls && auction.imageUrls.length > 0 ? (
        <img src={auction.imageUrls[0]} alt={auction.name} className="auction-image" />
      ) : (
        auction.imageUrl && <img src={auction.imageUrl} alt={auction.name} className="auction-image" />
      )}

      <h3>{auction.name}</h3>
      <p className="meta">Product: {auction.product}</p>
      <p className="meta">Category: {auction.category}</p>

      <p className="starting-price">
        Starting Price:{" "}
        {auction.startingPrice
          ? `${new Intl.NumberFormat("vi-VN").format(Number(auction.startingPrice))} VND`
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
        {end && (
          <p className="time">
            ⏰ End:{" "}
            {end.toLocaleString("en-GB", {
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

      <Link to={`/auction/${auction.id}`} className="detail-button-link">
        <div className="detail-button">Detail</div>
      </Link>
    </div>
  );
};

function Root() {
  const [time, setTime] = useState(new Date());
  return <App time={time} onTimeUpdate={setTime} />;
}

export { Root };
export default App;
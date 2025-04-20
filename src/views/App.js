import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import CreateAuctionPage from "../components/CreateAuctionPage";
import ProfilePage from "../components/ProfilePage";
import '../styles/Navbar.scss';
import "@fortawesome/fontawesome-free/css/all.min.css";
import MyAuctionsPage from "../components/MyAuctionPage";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { db } from "../Firebase";
import "../styles/HomePage.scss";

function App() {
  const [upcomingAuctions, setUpcomingAuctions] = useState([]);
  const [ongoingAuctions, setOngoingAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(""); // Add searchTerm state
  const [filteredAuctions, setFilteredAuctions] = useState([]); // Add filteredAuctions state

  useEffect(() => {
    const q = query(collection(db, "auctions"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedAuctions = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const now = new Date();
        const upcoming = [];
        const ongoing = [];

        fetchedAuctions.forEach((auction) => {
          const startTime = auction.startTime.toDate();
          const endTime = auction.endTime.toDate();

          if (startTime > now) {
            upcoming.push(auction);
          } else if (startTime <= now && endTime > now) {
            ongoing.push(auction);
          }
        });

        setUpcomingAuctions(upcoming);
        setOngoingAuctions(ongoing);
        setLoading(false);
      },
      (error) => {
        setError("Error fetching auctions: " + error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const allAuctions = [...upcomingAuctions, ...ongoingAuctions];
    if (searchTerm) {
      const filtered = allAuctions.filter((auction) => {
        return (
          auction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          auction.product.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
      setFilteredAuctions(filtered);
    } else {
      setFilteredAuctions(allAuctions);
    }
  }, [searchTerm, upcomingAuctions, ongoingAuctions]);

  if (loading) return <p>Loading auctions...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <Router>
      <div className="App">
        <Navbar onSearch={setSearchTerm} /> {/* Pass setSearchTerm as onSearch */}
        <div className="main-content">
          <Routes>
            <Route path="/create-auction" element={<CreateAuctionPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/my-auctions" element={<MyAuctionsPage />} />
            <Route path="/auction/:id" element={<Product />} />
            <Route path="/" element={
              <div className="home-page-container">
                <h2>Welcome to Online Auction</h2>
                <div className="home-page-button">
                </div>

                {/* Upcoming Auctions */}
                {filteredAuctions.filter((auction) => upcomingAuctions.includes(auction)).length > 0 && (
                  <div className="auctions-section">
                    <h3>Upcoming Auctions</h3>
                    <div className="auctions-grid">
                      {filteredAuctions.filter((auction) => upcomingAuctions.includes(auction)).map((auction) => (
                        <Link to={`/auction/${auction.id}`} className="auction-link" key={auction.id}>
                          <div className="auction-card">
                            {auction.imageUrl && (<img src={auction.imageUrl} alt={auction.name} className="auction-image" />)}
                            <h3>{auction.name}</h3>
                            <p className="meta"> Product: {auction.product}</p>
                            <p className="meta"> Category: {auction.category}</p>
                            <p className="starting-price"> Starting Price: {auction.startingPrice} </p>
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
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ongoing Auctions */}
                {filteredAuctions.filter((auction) => ongoingAuctions.includes(auction)).length > 0 && (
                  <div className="auctions-section">
                    <h3>Ongoing Auctions</h3>
                    <div className="auctions-grid">
                      {filteredAuctions.filter((auction) => ongoingAuctions.includes(auction)).map((auction) => (
                        <Link to={`/auction/${auction.id}`} className="auction-link" key={auction.id}>
                          <div className="auction-card">
                            {auction.imageUrl && (<img src={auction.imageUrl} alt={auction.name} className="auction-image" />)}
                            <h3>{auction.name}</h3>
                            <p className="meta"> Product: {auction.product}</p>
                            <p className="meta"> Category: {auction.category}</p>
                            <p className="starting-price"> Starting Price: {auction.startingPrice} </p>
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
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Auctions */}
                {filteredAuctions.length === 0 && !loading && (
                  <p>No auctions found.</p>
                )}
              </div>
            } />
          </Routes>

          
        </div>
      </div>
    </Router>
  );
}

export default App;

import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Navbar from "../components/Navbar";
import CreateAuctionPage from "../components/CreateAuctionPage";
import ProfilePage from "../components/ProfilePage";
import "../styles/Navbar.scss";
import "@fortawesome/fontawesome-free/css/all.min.css";
import MyAuctionsPage from "../components/MyAuctionsPage";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { db, auth } from "../Firebase";
import "../styles/HomePage.scss";
import AuctionDetail from "../components/AuctionDetail"; // This is correct for default export
import EditAuctionsPage from "../components/EditAuctionsPage";

import "../styles/HomePage.scss";

function App() {
  const [upcomingAuctions, setUpcomingAuctions] = useState([]);
  const [ongoingAuctions, setOngoingAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredAuctions, setFilteredAuctions] = useState([]);

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

  const currentUser = auth.currentUser;
  return (
    <Router>
      <div className="App">
        <Navbar onSearchChange={setSearchTerm} /> {/* Pass setSearchTerm as onSearchChange */}
        <div className="main-content">
          <Routes>
            <Route path="/create-auction" element={<CreateAuctionPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route
              path="/my-auctions"
              element={
                <MyAuctionsPage searchTerm={searchTerm} />
              }
            />{" "}
            {/* Pass searchTerm as a prop */}
            <Route path="/auction/:id" element={<AuctionDetail user={auth.currentUser} />} /> {/* Changed Product to AuctionDetail */}
            <Route path="/auction/edit-auction/:id" element={<EditAuctionsPage />} />


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
                      {filteredAuctions
                        .filter(
                          (auction) =>
                            upcomingAuctions.includes(auction) &&
                            (!currentUser || auction.userId !== currentUser.uid)
                        ).map((auction) => (
                          <AuctionCard key={auction.id} auction={auction} />
                        ))}
                    </div>
                  </div>
                )}


                {/* Ongoing Auctions */}
                {filteredAuctions.filter((auction) => ongoingAuctions.includes(auction)).length > 0 && (
                  <div className="auctions-section">
                    <h3>Ongoing Auctions</h3>
                    <div className="auctions-grid">
                      {filteredAuctions
                        .filter(
                          (auction) =>
                            ongoingAuctions.includes(auction) &&
                            (!currentUser || auction.userId !== currentUser.uid)
                        ).map((auction) => (
                          <AuctionCard key={auction.id} auction={auction} />
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

const AuctionCard = ({ auction }) => {
  return (
    <div className="auction-card">
      {auction.imageUrls && auction.imageUrls.length > 0 ? (
        <img src={auction.imageUrls[0]} alt={auction.name} className="auction-image" />
      ) : auction.imageUrl && (
        <img src={auction.imageUrl} alt={auction.name} className="auction-image" />
      )}
      <h3>{auction.name}</h3>
      <p className="meta">Product: {auction.product}</p>
      <p className="meta">Category: {auction.category}</p>
      <p className="starting-price">
        Starting Price: {auction.startingPrice
          ? `${new Intl.NumberFormat('vi-VN').format(Number(auction.startingPrice))} VND`
          : 'N/A'}
      </p>
      <div className="time-section">
        {auction.startTime && (
          <p className="time">
            🕒 Start:{" "}
            {auction.startTime.toDate().toLocaleString("en-GB", {
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
            {auction.endTime.toDate().toLocaleString("en-GB", {
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

export default App;

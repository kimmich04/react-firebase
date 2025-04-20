import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "../components/Navbar";
import CreateAuctionPage from "../components/CreateAuctionPage";
import ProfilePage from "../components/ProfilePage"; 
import '../styles/Navbar.scss';
import "@fortawesome/fontawesome-free/css/all.min.css";
import MyAuctionsPage from "../components/MyAuctionPage";
export default function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<h1>Welcome to Online Auction</h1>} />
            <Route path="/create-auction" element={<CreateAuctionPage />} />
            <Route path="/profile" element={<ProfilePage />} /> 
            <Route path="/my-auctions" element={<MyAuctionsPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "../components/Navbar";
import CreateAuctionPage from "../components/CreateAuctionPage";
import ProfilePage from "../components/ProfilePage"; 
import MyAuctionsPage from "../components/MyAuctionsPage";
import '../styles/Navbar.scss';
import "@fortawesome/fontawesome-free/css/all.min.css";
import Product from "../components/Products"; 

export default function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<h1>Welcome to Online Auction</h1>} />
            <Route path="/create-auction" element={<CreateAuctionPage />} />
            <Route path="/my-auctions" element={<MyAuctionsPage />} />
            <Route path="/profile" element={<ProfilePage />} /> 
            <Route path="/auction/:id" element={<Product />} />
            {/* <Route path="/auction/:id/edit" element={ProductEdit}/> */}
          </Routes>

          
        </div>
      </div>
    </Router>
  );
}
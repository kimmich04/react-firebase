import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "../components/Navbar";
import CreateAuctionPage from "../views/CreateAuctionPage"; // You'll create this file
import './App.scss';
import "@fortawesome/fontawesome-free/css/all.min.css";

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<h1>Welcome to Online Auction</h1>} />
            <Route path="/create-auction" element={<CreateAuctionPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;

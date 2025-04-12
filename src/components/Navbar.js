import React, { useState, useEffect } from "react";
import "../views/App.scss";
import AuthModal from "./AuthModal";

function Navbar() {
  const [time, setTime] = useState(new Date());
  const [authMode, setAuthMode] = useState(null); // 'login' or 'signup'

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <nav className="navbar">
      <div className="logo">Online Auction Hardware</div>

      <ul className="nav-links">
        <li>Create Auction</li>
        <li>My Auction</li>
        <li>News</li>
        <li>Contact</li>
      </ul>

      <div className="time-container">
        <div className="time">{time.toLocaleTimeString("en-US", { hour12: false })}</div>
        <div className="date">
          {time.toLocaleDateString("en-US", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </div>
      </div>

      <div className="search-bar">
        <input type="text" placeholder="Search..." />
        <i className="fas fa-search"></i>
      </div>

      <button className="login-button" onClick={() => setAuthMode("login")}>Login</button>
      <button className="sign-up-button" onClick={() => setAuthMode("signup")}>Sign up</button>

      {authMode && (
        <AuthModal mode={authMode} onClose={() => setAuthMode(null)} />
      )}
    </nav>
  );
}

export default Navbar;

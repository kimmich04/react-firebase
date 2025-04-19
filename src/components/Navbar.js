import React, { useState, useEffect, useRef } from "react";
import "../styles/Navbar.scss";
import AuthModal from "./AuthModal";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../Firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function Navbar() {
  const [time, setTime] = useState(new Date());
  const [authMode, setAuthMode] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const timeoutRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleAutoLogin = () => {
      setAuthMode("login");
    };
    window.addEventListener("open-login-after-signup", handleAutoLogin);
    return () => window.removeEventListener("open-login-after-signup", handleAutoLogin);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setShowDropdown(false);
    navigate("/");
  };

  const goToProfile = () => {
    navigate("/profile");
    setShowDropdown(false);
  };

  return (
    <nav className="navbar">
      <div className="logo">
        <Link to="/">Online Auction PC Hardware</Link>
      </div>

      <ul className="nav-links">
        <li onClick={() => (currentUser ? navigate("/create-auction") : setAuthMode("login"))}>Create Auction</li>
        <li onClick={() => (currentUser ? navigate("/my-auctions") : setAuthMode("login"))}>My Auction</li>
        <li><Link to="/news">News</Link></li>
        <li><Link to="/contact">Contact</Link></li>
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

      {!currentUser ? (
        <>
          <button className="login-button" onClick={() => setAuthMode("login")}>Login</button>
          <button className="sign-up-button" onClick={() => setAuthMode("signup")}>Sign up</button>
        </>
      ) : (
        <div
          className="user-profile"
          onMouseEnter={() => {
            clearTimeout(timeoutRef.current);
            setShowDropdown(true);
          }}
          onMouseLeave={() => {
            timeoutRef.current = setTimeout(() => {
              setShowDropdown(false);
            }, 200);
          }}
        >
          <div className="profile-content">
            <div className="avatar">👤</div>
            <span className="username">{currentUser.displayName || "User"}</span>
          </div>

          {showDropdown && (
            <div className="profile-dropdown">
              <div onClick={goToProfile}>👤 Manage Account</div>
              <div onClick={handleLogout}>🔓 Log out</div>
            </div>
          )}
        </div>
      )}

      {authMode && (
        <AuthModal mode={authMode} onClose={() => setAuthMode(null)} />
      )}
    </nav>
  );
}

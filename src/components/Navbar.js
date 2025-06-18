import React, { useState, useEffect, useRef } from "react";
import "../styles/Navbar.scss";
import AuthModal from "./AuthModal";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../Firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, onSnapshot, query, where, doc, getDoc, addDoc, orderBy, updateDoc } from "firebase/firestore";
import logo from "../images/logo2.jpg";

export default function Navbar({ onSearchChange, onTimeUpdate }) {
  const [time, setTime] = useState(new Date());
  const [authMode, setAuthMode] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const timeoutRef = useRef(null);
  const navigate = useNavigate();

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      const newTime = new Date();
      setTime(newTime);
      if (onTimeUpdate) {
        onTimeUpdate(newTime);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [onTimeUpdate]);

  // Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Fetch notifications
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid),
      orderBy("time", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [currentUser]);

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

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (onSearchChange) {
      onSearchChange(term);
    }
  };

  // Count unread notifications
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Handle bell click
  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
  };

  // Mark notification as read
  const handleNotificationClick = async (id) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
    setNotifications((notifications) =>
      notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
    );
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(
      unread.map(n => updateDoc(doc(db, "notifications", n.id), { read: true }))
    );
  };

  // Ensure unique notifications
  const uniqueNotifications = Array.from(
    new Map(notifications.map(n => [n.id, n])).values()
  );

  return (
    <nav className="navbar">
      <div className="logo">
        <Link to="/">
          <img src={logo} alt="Logo" className="logo-image" />
        </Link>
      </div>

      <ul className="nav-links">
        <li onClick={() => (currentUser ? navigate("/create-auction") : setAuthMode("login"))}>Create Auction</li>
        <li onClick={() => (currentUser ? navigate("/my-auctions") : setAuthMode("login"))}>My Auction</li>
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
        <input type="text" placeholder="Search..." value={searchTerm} onChange={handleSearchChange} />
        <i className="fas fa-search"></i>
      </div>

      {!currentUser ? (
        <>
          <button className="auth-button" onClick={() => setAuthMode("login")}>Login</button>
          <button className="auth-button" onClick={() => setAuthMode("signup")}>Sign up</button>
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

      <div className="navbar-user-section">
        <span
          className="navbar-notification"
          style={{ marginLeft: "12px", cursor: "pointer", position: "relative" }}
          onClick={handleBellClick}
        >
          <i className="fas fa-bell"></i>
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount}</span>
          )}
        </span>
        {showNotifications && (
          <div className="notification-popup">
            <div className="notification-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Notifications</span>
              <button
                onClick={handleMarkAllAsRead}
                style={{ fontSize: "12px", padding: "4px 8px", marginLeft: "8px" }}
              >
                Mark all as read
              </button>
            </div>
            <ul className="notification-list">
              {uniqueNotifications.length === 0 && (
                <li className="notification-empty">No notifications</li>
              )}
              {uniqueNotifications.map((n) => (
                <li
                  key={n.id}
                  className={`notification-item${n.read ? " read" : ""}`}
                  onClick={() => handleNotificationClick(n.id)}
                >
                  <div className="notification-message">{n.message}</div>
                  {n.time && (
                    <div className="notification-time" style={{ fontSize: "12px", color: "#888" }}>
                      {n.time.toDate().toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {authMode && (
        <AuthModal mode={authMode} onClose={() => setAuthMode(null)} />
      )}
    </nav>
  );
}

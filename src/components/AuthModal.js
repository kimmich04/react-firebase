import React from "react";
import "./AuthModal.scss";

function AuthModal({ mode, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{mode === "login" ? "Login" : "Sign Up"}</h2>

        <form>
          <input type="email" placeholder="Email" required />
          <input type="password" placeholder="Password" required />
          {mode === "signup" && <input type="text" placeholder="Username" required />}
          <button type="submit">{mode === "login" ? "Login" : "Create Account"}</button>
        </form>

        <button className="close-btn" onClick={onClose}>×</button>
      </div>
    </div>
  );
}

export default AuthModal;

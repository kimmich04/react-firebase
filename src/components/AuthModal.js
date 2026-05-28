import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { auth } from "../Firebase";
import "../styles/AuthModal.scss";
import { api } from "../services/api";

const REQUIRE_EMAIL_VERIFICATION = false;
const SEND_VERIFICATION_EMAIL = false;

export default function AuthModal({ mode, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (mode === "signup" && password !== confirmPassword) {
      setError("❌ Passwords do not match.");
      return;
    }

    try {
      if (mode === "signup") {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: username });

        if (SEND_VERIFICATION_EMAIL) {
          const { sendEmailVerification } = await import("firebase/auth");
          await sendEmailVerification(user);
          alert("A verification email has been sent. Please check your inbox!");
        }

        // Save profile via backend (checks unique phone)
        await api.upsertMyProfile({
          username,
          email,
          fullName,
          dob,
          sex,
          phone,
          address,
          verified: !REQUIRE_EMAIL_VERIFICATION,
        });

        onClose();

        setTimeout(() => {
          window.dispatchEvent(new Event("open-login-after-signup"));
        }, 100);

        // optional
        // await signOut(auth);

      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await user.reload();

        if (REQUIRE_EMAIL_VERIFICATION && !user.emailVerified) {
          setError("❌ Please verify your email before logging in.");
          await signOut(auth);
          return;
        }

        onClose();
      }
    } catch (err) {
      setError(err?.message || "❌ Something went wrong. Please try again.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{mode === "login" ? "Login" : "Sign Up"}</h2>

        {error && <p style={{ color: "red", fontSize: "0.9rem" }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <>
              <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
              <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />

              <label htmlFor="dob">Date of Birth</label>
              <input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />

              <select value={sex} onChange={(e) => setSex(e.target.value)} required>
                <option value="">Select Sex</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>

              <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              <input type="text" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} required />
            </>
          )}

          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          {mode === "signup" && (
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          )}

          <button type="submit">{mode === "login" ? "Login" : "Create Account"}</button>
        </form>

        <button className="close-button" onClick={onClose}>×</button>
      </div>
    </div>
  );
}
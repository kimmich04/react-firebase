import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { auth, db } from "../Firebase";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import "../styles/AuthModal.scss";
import { sendEmailVerification } from "firebase/auth";

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

    if (mode === "signup") {
      // password match
      if (password !== confirmPassword) {
        setError("❌ Passwords do not match.");
        return;
      }
      // unique phone check
      const phoneQuery = query(
        collection(db, "users"),
        where("phone", "==", phone)
      );
      const phoneSnap = await getDocs(phoneQuery);
      if (!phoneSnap.empty) {
        setError("❌ Phone number already registered.");
        return;
      }
    }

    try {
      if (mode === "signup") {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        // Send verification email
        await sendEmailVerification(user);
        alert("A verification email has been sent. Please check your inbox!");
	
        await updateProfile(user, {
                displayName: username,
              });

        // Save initial profile (unverified)
        await setDoc(doc(db, "users", user.uid), {
          username,
          email,
          fullName,
          dob,
          sex,
          phone,
          address,
          createdAt: new Date(),
          verified: false,
        });

        await signOut(auth);
        onClose();
        // open login modal
        setTimeout(() => {
          window.dispatchEvent(
            new Event("open-login-after-signup")
          );
        }, 100);
      } else {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        await user.reload();
        if (!user.emailVerified) {
          setError(
            "❌ Please verify your email before logging in."
          );
          await signOut(auth);
          return;
        }

        onClose();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{mode === "login" ? "Login" : "Sign Up"}</h2>
        {error && (
          <p style={{ color: "red", fontSize: "0.9rem" }}>
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <label htmlFor="dob">Date of Birth</label>
              <input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
              />
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                required
              >
                <option value="">Select Sex</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <input
                type="tel"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </>
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {mode === "signup" && (
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          )}
          <button type="submit">
            {mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>
        <button className="close-button" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
}

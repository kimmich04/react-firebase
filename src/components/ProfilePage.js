import React, { useEffect, useState } from "react";
import { auth, db } from "../Firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import "../styles/ProfilePage.scss";

export default function ProfilePage() {
  const [userInfo, setUserInfo] = useState(null);
  const [editData, setEditData] = useState({});
  const [message, setMessage] = useState("");

  const user = auth.currentUser;

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (user) {
        const ref = doc(db, "users", user.uid);
        const snapshot = await getDoc(ref);
        if (snapshot.exists()) {
          const data = snapshot.data();
          setUserInfo(data);
          setEditData(data);
        }
      }
    };

    fetchUserInfo();
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setEditData((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, {
        ...editData,
        lastChanged: new Date(), // Save last changed tim
      });

      await updateProfile(auth.currentUser, {
        displayName: editData.username || "",
      });

      await auth.currentUser.reload();
      setMessage("✅ Changes saved!");
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage("❌ Failed to save changes.");
    }
  };

  if (!user) return <p>Please log in to view your profile.</p>;

  return (
    <div className="profile-container">
      <h2>👤 Your Profile</h2>
      {userInfo ? (
        <div className="profile-form">
          <input
            name="username"
            value={editData.username || ""}
            //onChange={handleChange}
            placeholder="Username"
          />
          <input
            name="fullName"
            value={editData.fullName || ""}
            onChange={handleChange}
            placeholder="Full Name"
          />
          <input
            name="email"
            value={editData.email || ""}
            readOnly
            disabled
            placeholder="Email"
          />
          <input
            name="dob"
            type="date"
            value={editData.dob || ""}
            onChange={handleChange}
            placeholder="Date of Birth"
          />

          <div className="sex-checkbox">
            <label>
              <input
                type="radio"
                name="sex"
                value="male"
                checked={editData.sex === "male"}
                onChange={handleChange}
              />
              Male
            </label>
            <label>
              <input
                type="radio"
                name="sex"
                value="female"
                checked={editData.sex === "female"}
                onChange={handleChange}
              />
              Female
            </label>
            <label>
              <input
                type="radio"
                name="sex"
                value="other"
                checked={editData.sex === "other"}
                onChange={handleChange}
              />
              Other
            </label>
          </div>

          <input
            name="phone"
            value={editData.phone || ""}
            onChange={handleChange}
            placeholder="Phone"
          />
          <input
            name="address"
            value={editData.address || ""}
            onChange={handleChange}
            placeholder="Address"
          />

          <button onClick={handleSave}>Save Changes</button>
          {message && <p className="success-message">{message}</p>}
        </div>
      ) : (
        <p>Loading your information...</p>
      )}
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { auth } from "../Firebase";
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import "../styles/ProfilePage.scss";
import { api } from "../services/api";

export default function ProfilePage() {
  const [userInfo, setUserInfo] = useState(null);
  const [editData, setEditData] = useState({});
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const user = auth.currentUser;

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) return;
      try {
        const data = await api.getMyProfile();
        const u = data.user;
        setUserInfo(u);
        setEditData(u);
      } catch {
        // ignore
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
    setError("");
    setMessage("");

    if (newPassword) {
      if (!currentPassword) {
        setError("❌ Please enter your current password.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("❌ New passwords do not match.");
        return;
      }
      try {
        const cred = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, cred);
        await updatePassword(user, newPassword);
      } catch (pwError) {
        console.error("Error updating password:", pwError);
        setError("❌ Failed to update password. Please check your current password.");
        return;
      }
    }

    try {
      await api.upsertMyProfile({
        username: editData.username || "",
        fullName: editData.fullName || "",
        dob: editData.dob || "",
        sex: editData.sex || "",
        phone: editData.phone || "",
        address: editData.address || "",
      });

      await updateProfile(user, { displayName: editData.username || "" });
      await user.reload();

      setMessage("✅ Changes saved!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err.message || "❌ Failed to save changes.");
    }
  };

  if (!user) return <p>Please log in to view your profile.</p>;

  return (
    <div className="profile-container">
      <h2>👤 Your Profile</h2>

      {userInfo ? (
        <div className="profile-form">
          <input name="username" value={editData.username || ""} onChange={handleChange} placeholder="Username" />
          <input name="fullName" value={editData.fullName || ""} onChange={handleChange} placeholder="Full Name" />

          <input name="email" value={editData.email || ""} readOnly disabled placeholder="Email" />

          <input name="dob" type="date" value={editData.dob || ""} onChange={handleChange} placeholder="Date of Birth" />

          <div className="sex-checkbox">
            <label>
              <input type="radio" name="sex" value="male" checked={editData.sex === "male"} onChange={handleChange} />
              Male
            </label>
            <label>
              <input type="radio" name="sex" value="female" checked={editData.sex === "female"} onChange={handleChange} />
              Female
            </label>
            <label>
              <input type="radio" name="sex" value="other" checked={editData.sex === "other"} onChange={handleChange} />
              Other
            </label>
          </div>

          <input name="phone" value={editData.phone || ""} onChange={handleChange} placeholder="Phone" />
          <input name="address" value={editData.address || ""} onChange={handleChange} placeholder="Address" />

          <input type="password" placeholder="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />

          <button onClick={handleSave}>Save Changes</button>
          {message && <p className="success-message">{message}</p>}
          {error && <p className="error-message">{error}</p>}
        </div>
      ) : (
        <p>Loading your information...</p>
      )}
    </div>
  );
}
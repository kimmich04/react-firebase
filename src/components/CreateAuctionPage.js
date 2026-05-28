import React, { useState, useEffect } from "react";
import { auth } from "../Firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import "../styles/CreateAuctionPage.scss";
import { api } from "../services/api";

export default function CreateAuctionPage() {
  const [formData, setFormData] = useState({
    name: "",
    maxPeople: "",
    product: "",
    category: "",
    description: "",
    startingPrice: "",
    stepPrice: "",
    startTime: "",
    endTime: "",
    paymentDeadline: "",
    paymentInfo: "",
  });

  const [imageFiles, setImageFiles] = useState([]);
  const [imageError, setImageError] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [banRemaining, setBanRemaining] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const checkBan = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const profile = await api.getMyProfile();
        const bannedUntil = profile?.user?.bannedUntil ? new Date(profile.user.bannedUntil) : null;

        if (bannedUntil && bannedUntil > new Date()) {
          setIsBanned(true);
          const now = new Date();
          const diffMs = bannedUntil - now;
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
          const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);
          let msg = "";
          if (diffDays > 0) msg += `${diffDays} day${diffDays > 1 ? "s" : ""} `;
          if (diffHours > 0) msg += `${diffHours} hour${diffHours > 1 ? "s" : ""} `;
          if (diffMinutes > 0) msg += `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
          setBanRemaining(msg.trim());
        }
      } catch {
        // ignore
      }
    };

    checkBan();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateTimeChange = (e) => {
    const { name, value } = e.target;
    // keep as string here; backend will parse ISO
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setImageFiles(files);
    setImageError(false);
  };

  const uploadImages = async () => {
    const storage = getStorage();
    const uploadPromises = imageFiles.map(async (file) => {
      const storageRef = ref(storage, `auction_images/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      return getDownloadURL(storageRef);
    });
    return Promise.all(uploadPromises);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isBanned) {
      alert("You are banned from creating auctions until your ban expires.");
      return;
    }

    if (imageFiles.length === 0) {
      setImageError(true);
      return;
    }

    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);
    const deadline = new Date(formData.paymentDeadline);

    if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
      alert("Invalid start time.");
      return;
    }
    if (!(end instanceof Date) || Number.isNaN(end.getTime())) {
      alert("Invalid end time.");
      return;
    }
    if (!(deadline instanceof Date) || Number.isNaN(deadline.getTime())) {
      alert("Invalid payment deadline.");
      return;
    }

    if (end <= start) {
      alert("End time must be after start time.");
      return;
    }
    if (deadline <= end) {
      alert("Payment deadline must be after end time.");
      return;
    }

    try {
      const uploadedImageUrls = await uploadImages();

      await api.createAuction({
        ...formData,
        imageUrls: uploadedImageUrls,
        startingPrice: Number(formData.startingPrice),
        stepPrice: formData.stepPrice ? Number(formData.stepPrice) : 1,
      });

      alert("✅ Auction created!");
      navigate("/my-auctions");
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  };

  const { name, maxPeople, product, category, description, startingPrice, stepPrice, paymentInfo } = formData;

  return (
    <div className="create-auction-page">
      <div className="create-auction-container">
        <h2>Create Auction</h2>

        <form onSubmit={handleSubmit} className="form">
          <label>Auction Name:</label>
          <input name="name" value={name} onChange={handleChange} required />

          <label>Max People:</label>
          <input name="maxPeople" value={maxPeople} onChange={handleChange} required />

          <label>Product:</label>
          <input name="product" value={product} onChange={handleChange} required />

          <label>Category:</label>
          <input name="category" value={category} onChange={handleChange} required />

          <label>Description:</label>
          <textarea name="description" value={description} onChange={handleChange} required />

          <label>Starting Price:</label>
          <input name="startingPrice" value={startingPrice} onChange={handleChange} required />

          <label>Step Price:</label>
          <input name="stepPrice" value={stepPrice} onChange={handleChange} required />

          <label>Payment Information:</label>
          <textarea name="paymentInfo" value={paymentInfo} onChange={handleChange} required />

          <label>Start Time:</label>
          <input type="datetime-local" name="startTime" onChange={handleDateTimeChange} required />

          <label>End Time:</label>
          <input type="datetime-local" name="endTime" onChange={handleDateTimeChange} required />

          <label>Payment Deadline:</label>
          <input type="datetime-local" name="paymentDeadline" onChange={handleDateTimeChange} required />

          <label>Upload Image:</label>
          <input type="file" accept="image/*" multiple onChange={handleImageChange} />
          {imageError && <p className="error">❌ Please upload an image</p>}

          <button type="submit">Publish</button>
        </form>

        {isBanned && (
          <p style={{ color: "red" }}>
            You are banned from creating auctions until your ban expires.
            {banRemaining && <> (Remaining: {banRemaining})</>}
          </p>
        )}
      </div>
    </div>
  );
}
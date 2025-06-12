import React, { useState, useEffect } from "react";
import { addDoc, collection, runTransaction, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../Firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import "../styles/CreateAuctionPage.scss";
import { createNotification } from "../utils/notifications";

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
    paymentDeadline: "", // <-- Add this line
  });

  const [imageUrls, setImageUrls] = useState([]);
  const [imageError, setImageError] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [banRemaining, setBanRemaining] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const checkBan = async () => {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const bannedUntil = userSnap.data().bannedUntil;
          if (bannedUntil && bannedUntil.toDate() > new Date()) {
            setIsBanned(true);
            // Calculate remaining time
            const now = new Date();
            const diffMs = bannedUntil.toDate() - now;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
            const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);
            let msg = "";
            if (diffDays > 0) msg += `${diffDays} day${diffDays > 1 ? "s" : ""} `;
            if (diffHours > 0) msg += `${diffHours} hour${diffHours > 1 ? "s" : ""} `;
            if (diffMinutes > 0) msg += `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
            setBanRemaining(msg.trim());
          }
        }
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
    setFormData((prev) => ({ ...prev, [name]: new Date(value) }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setImageUrls(files);
    setImageError(false);
  };

  const uploadImages = async () => {
    const storage = getStorage();
    const uploadPromises = imageUrls.map(async (file) => {
      const storageRef = ref(storage, `auction_images/${file.name}`);
      await uploadBytes(storageRef, file);
      return getDownloadURL(storageRef);
    });

    return Promise.all(uploadPromises);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isBanned) {
      alert("You are banned from creating auctions until your ban expires.");
      return;
    }

    if (imageUrls.length === 0) {
      setImageError(true);
      return;
    }

    // --- Add these checks ---
    if (formData.endTime <= formData.startTime) {
      alert("End time must be after start time.");
      return;
    }
    if (formData.paymentDeadline <= formData.endTime) {
      alert("Payment deadline must be after end time.");
      return;
    }
    // --- End checks ---

    try {
      const uploadedImageUrls = await uploadImages();
      const user = auth.currentUser;

      await runTransaction(db, async (transaction) => {
        // Add the auction
        const auctionRef = doc(collection(db, "auctions"));
        transaction.set(auctionRef, {
          ...formData,
          userId: user.uid,
          imageUrls: uploadedImageUrls,
          createdAt: new Date(),
          startingPrice: Number(formData.startingPrice),
          stepPrice: formData.stepPrice ? Number(formData.stepPrice) : 1,
          startTime: new Date(formData.startTime),
          endTime: new Date(formData.endTime),
          paymentDeadline: new Date(formData.paymentDeadline), // <-- Add this line
        });

        // Add the notification
        await createNotification({
          userId: user.uid,
          message: `You created auction: ${formData.name}`,
          auctionId: auctionRef.id,
          type: "create-auction",
        });
      });

      alert("✅ Auction created!");
      navigate("/my-auctions");
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
 
  };


  const { name, maxPeople, product, category, description, startingPrice, stepPrice, startTime, endTime, paymentDeadline } = formData;

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
          <input
            name="stepPrice"
            value={stepPrice}
            onChange={handleChange}
            required
          />

          <label>Start Time:</label>
          <input
            type="datetime-local"
            name="startTime"
            onChange={handleDateTimeChange}
            required
          />

          <label>End Time:</label>
          <input
            type="datetime-local"
            name="endTime"
            onChange={handleDateTimeChange}
            required
          />

          <label>Payment Deadline:</label>
          <input
            type="datetime-local"
            name="paymentDeadline"
            onChange={handleDateTimeChange}
            required
          />

          <label>Upload Image:</label>
          <input type="file" accept="image/*" multiple onChange={handleImageChange} />
          {imageError && (
            <p className="error">❌ Please upload an image</p>
          )}

          <button type="submit">Publish</button>
        </form>
        {isBanned && (
          <p style={{ color: "red" }}>
            You are banned from creating auctions until your ban expires.
            {banRemaining && (
              <> (Remaining: {banRemaining})</>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

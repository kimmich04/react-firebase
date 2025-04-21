import React, { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db, auth } from "../Firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import "../styles/CreateAuctionPage.scss";

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
  });

  const [imageUrl, setImageUrl] = useState(null);
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateTimeChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: new Date(value) }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const storage = getStorage();
      const storageRef = ref(storage, `auction_images/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setImageUrl(downloadURL);
      setImageError(false);
    } catch (err) {
      console.error("Image upload failed:", err);
      setImageError(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imageUrl) {
      setImageError(true);
      return;
    }

    try {
      const user = auth.currentUser;
      await addDoc(collection(db, "auctions"), {
        ...formData,
        imageUrl,
        userId: user.uid,
        createdAt: new Date(),
      });
      alert("✅ Auction created!");
      navigate("/my-auctions");
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  };

  return (
    <div className="create-auction-container">
      <h2>Create Auction</h2>
      <form onSubmit={handleSubmit} className="form">
        <label>Auction Name:</label>
        <input name="name" onChange={handleChange} required />

        <label>Max People:</label>
        <input name="maxPeople" onChange={handleChange} required />

        <label>Product:</label>
        <input name="product" onChange={handleChange} required />

        <label>Category:</label>
        <input name="category" onChange={handleChange} required />

        <label>Description:</label>
        <textarea name="description" onChange={handleChange} required />

        <label>Starting Price:</label>
        <input name="startingPrice" onChange={handleChange} required />

        <label>Step Price (Optional):</label>
        <input name="stepPrice" onChange={handleChange} />

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

        <label>Upload Image:</label>
        <input type="file" accept="image/*" onChange={handleImageChange} />
        {imageError && (
          <p className="error">❌ Please upload an image</p>
        )}

        <button type="submit">Publish</button>
      </form>
    </div>
  );
}

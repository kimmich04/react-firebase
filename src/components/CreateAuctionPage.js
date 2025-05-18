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

  const [imageUrls, setImageUrls] = useState([]);
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

    if (imageUrls.length === 0) {
      setImageError(true);
      return;
    }

    try {
      const uploadedImageUrls = await uploadImages();
      const user = auth.currentUser;
      await addDoc(collection(db, "auctions"), {
        ...formData,
        userId: user.uid,
        imageUrls: uploadedImageUrls,
        createdAt: new Date(),
        startingPrice: Number(formData.startingPrice), // <-- ensure number
        stepPrice: formData.stepPrice ? Number(formData.stepPrice) : 1, // <-- ensure number
      });
      alert("✅ Auction created!");
      navigate("/my-auctions");
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  };

  const { name, maxPeople, product, category, description, startingPrice, stepPrice, startTime, endTime } = formData;

  return (
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

        <label>Upload Image:</label>
        <input type="file" accept="image/*" multiple onChange={handleImageChange} />
        {imageError && (
          <p className="error">❌ Please upload an image</p>
        )}

        <button type="submit">Publish</button>
      </form>
    </div>
  );
}

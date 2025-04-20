import React, { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db,auth} from "../Firebase";
import Uploadimage from "./Uploadimage.js";

export default function CreateAuctionPage() {
  const [formData, setFormData] = useState({
    name: "",
    maxPeople: "",
    product: "",
    category: "",
    description: "",
    startingPrice: "",
    stepPrice: "",
    imageUrl: "",
    startTime: null,
    endTime: null,
  });
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle changes for start and end times
  const handleDateTimeChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: new Date(value) }));
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
        userId:user.uid,
        createdAt: new Date(),
      });
      alert("✅ Auction created!");
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  };
  const [imageUrl, setImageUrl] = useState(null);
  const [imageError, setImageError] = useState(false); // Show error if no image
  return (
    <div className="auction-form-container">
      <h2>Create Auction</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div>
            <input name="name" placeholder="Auction Name" onChange={handleChange} required/>
            <input name="maxPeople" placeholder="Max People" onChange={handleChange} required/>
            <input name="product" placeholder="Product" onChange={handleChange} required/>
            <input name="category" placeholder="Category" onChange={handleChange} required/>
          </div>
          <div>
            <textarea name="description" placeholder="Description" onChange={handleChange} required/>
            <input name="startingPrice" placeholder="Starting Price" onChange={handleChange} required/>
            <input name="stepPrice" placeholder="Step Price (Optional)" onChange={handleChange} />
          </div>
          <div>
            <Uploadimage
              onUploadComplete={(url) => {
                if (url) {
                  setImageUrl(url);
                  setImageError(false);
                }
              }}
            />
            {imageError && (
              <p style={{ color: "red", fontSize: "0.9rem" }}>
                ❌ Please upload an image
              </p>
            )}
          </div>
          <label htmlFor="startTime">Start Time:</label>
          <input type="datetime-local" name="startTime" onChange={handleDateTimeChange} required/>
          <label htmlFor="endTime">End Time:</label>
          <input type="datetime-local" id="endTime" name="endTime" onChange={handleDateTimeChange} required/>
        </div>

        <button type="submit">Publish</button>
      </form>
    </div>
  );
}
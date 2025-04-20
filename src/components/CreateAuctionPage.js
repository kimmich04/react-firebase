import React, { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../Firebase";
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
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUrlChange = (url) => {
    setFormData((prev) => ({ ...prev, imageUrl: url }));
  };

  // Handle changes for start and end times
  const handleDateTimeChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: new Date(value) }));
  };

  const handleSubmit = async () => {
    setFormError("");
    setIsSubmitting(true);

    // Basic validation
    if (
      !formData.name ||
      !formData.maxPeople ||
      !formData.product ||
      !formData.category ||
      !formData.description ||
      !formData.startingPrice ||
      !formData.imageUrl ||
      !formData.startTime ||
      !formData.endTime
    ) {
      setFormError(
        "Please fill in all required fields, upload an image, and select start and end times."
      );
      setIsSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, "auctions"), {
        ...formData,
        createdAt: new Date(),
      });
      alert("Auction created!");
      setFormData({
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
    } catch (err) {
      setFormError("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auction-form-container">
      <h2>Create Auction</h2>
      <div className="form-grid">
        <div>
          <input
            name="name"
            placeholder="Auction Name"
            onChange={handleChange}
            value={formData.name}
            required
          />
          <input
            name="maxPeople"
            placeholder="Max People"
            onChange={handleChange}
            value={formData.maxPeople}
            required
          />
          <input
            name="product"
            placeholder="Product"
            onChange={handleChange}
            value={formData.product}
            required
          />
          <input
            name="category"
            placeholder="Category"
            onChange={handleChange}
            value={formData.category}
            required
          />
        </div>
        <div>
          <textarea
            name="description"
            placeholder="Description"
            onChange={handleChange}
            value={formData.description}
            required
          />
          <input
            name="startingPrice"
            placeholder="Starting Price"
            onChange={handleChange}
            value={formData.startingPrice}
            required
          />
          <input
            name="stepPrice"
            placeholder="Step Price (Optional)"
            onChange={handleChange}
            value={formData.stepPrice}
          />
        </div>
        <div>
          <Uploadimage onImageUrlChange={handleImageUrlChange} />
          <label htmlFor="startTime">Start Time:</label>
          <input
            type="datetime-local"
            name="startTime"
            onChange={handleDateTimeChange}
            required
          />
          <label htmlFor="endTime">End Time:</label>
          <input
            type="datetime-local"
            id="endTime"
            name="endTime"
            onChange={handleDateTimeChange}
            required
          />
        </div>
      </div>
      {formError && <div style={{ color: "red" }}>{formError}</div>}
      <button onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? "Publishing..." : "Publish"}
      </button>
    </div>
  );
}

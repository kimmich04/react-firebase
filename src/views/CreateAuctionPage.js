import React, { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../Firebase";

function CreateAuctionPage() {
  const [formData, setFormData] = useState({
    name: "",
    maxPeople: "",
    product: "",
    category: "",
    description: "",
    startingPrice: "",
    stepPrice: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      await addDoc(collection(db, "auctions"), {
        ...formData,
        createdAt: new Date(),
      });
      alert("Auction created!");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="auction-form-container">
      <h2>Create Auction</h2>
      <div className="form-grid">
        <div>
          <input name="name" placeholder="Auction Name" onChange={handleChange} />
          <input name="maxPeople" placeholder="Max People" onChange={handleChange} />
          <input name="product" placeholder="Product" onChange={handleChange} />
          <input name="category" placeholder="Category" onChange={handleChange} />
        </div>
        <div>
          <textarea name="description" placeholder="Description" onChange={handleChange} />
          <input name="startingPrice" placeholder="Starting Price" onChange={handleChange} />
          <input name="stepPrice" placeholder="Step Price (Optional)" onChange={handleChange} />
        </div>
      </div>
      <button onClick={handleSubmit}>Publish</button>
    </div>
  );
}

export default CreateAuctionPage;

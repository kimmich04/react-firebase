import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../Firebase";
import "../styles/EditAuctionsPage.scss";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function EditAuctionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuction = async () => {
      try {
        const docRef = doc(db, "auctions", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            ...data,
            startTime: data.startTime?.toDate().toISOString().slice(0, 16),
            endTime: data.endTime?.toDate().toISOString().slice(0, 16),
          });
        }
      } catch (err) {
        alert("Failed to fetch auction: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAuction();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let updatedData = { ...formData };

      if (imageFile) {
        const storage = getStorage();
        const storageRef = ref(storage, `auction_images/${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        const downloadURL = await getDownloadURL(storageRef);
        updatedData.imageUrl = downloadURL;
      }

      await updateDoc(doc(db, "auctions", id), {
        ...updatedData,
        startingPrice: Number(updatedData.startingPrice), // <-- ensure number
        stepPrice: updatedData.stepPrice ? Number(updatedData.stepPrice) : 1, // <-- ensure number
        startTime: new Date(updatedData.startTime),
        endTime: new Date(updatedData.endTime),
      });
      alert("Auction updated successfully!");
      navigate("/my-auctions");
    } catch (err) {
      alert("Failed to update auction: " + err.message);
    }
  };

  const handleDelete = async () => {
    const confirm = window.confirm("Are you sure you want to delete this auction?");
    if (!confirm) return;
    try {
      await deleteDoc(doc(db, "auctions", id));
      alert("Auction deleted successfully!");
      navigate("/my-auctions");
    } catch (err) {
      alert("Failed to delete auction: " + err.message);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="edit-auction-container">
      <h2>Edit Auction</h2>
      <form className="edit-form" onSubmit={handleSubmit}>
        {[
          { label: "Auction Name", name: "name" },
          { label: "Max People", name: "maxPeople" },
          { label: "Product", name: "product" },
          { label: "Category", name: "category" },
          { label: "Starting Price", name: "startingPrice" },
          { label: "Step Price (Optional)", name: "stepPrice" },
        ].map(({ label, name }) => (
          <div key={name} className="form-group">
            <label>{label}:</label>
            <input
              type="text"
              name={name}
              value={formData[name] || ""}
              onChange={handleChange}
              required={name !== "stepPrice"}
            />
          </div>
        ))}

        <div className="form-group">
          <label>Start Time:</label>
          <input
            type="datetime-local"
            name="startTime"
            value={formData.startTime || ""}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>End Time:</label>
          <input
            type="datetime-local"
            name="endTime"
            value={formData.endTime || ""}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Change Image:</label>
          <input type="file" accept="image/*" onChange={handleImageChange} />
        </div>

        <div className="button-group">
          <button type="submit" className="save-button">Save Changes</button>
          <button type="button" onClick={handleDelete} className="delete-button">Delete Auction</button>
        </div>
      </form>
    </div>
  );
}
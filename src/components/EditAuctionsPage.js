import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/EditAuctionsPage.scss";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { api } from "../services/api";

function toLocalInputValue(date) {
  if (!date) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function EditAuctionPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(true);

  const [isBanned, setIsBanned] = useState(false);
  const [banExpiry, setBanExpiry] = useState(null);

  const isDeleting = useRef(false);
  const didShowWarning = useRef(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const profile = await api.getMyProfile();
        const bannedUntil = profile?.user?.bannedUntil ? new Date(profile.user.bannedUntil) : null;
        if (bannedUntil && bannedUntil > new Date()) {
          if (!alive) return;
          setIsBanned(true);
          setBanExpiry(bannedUntil);
          alert(`You are banned from editing auctions until ${bannedUntil.toLocaleDateString()}`);
          navigate("/my-auctions");
          return;
        }

        const data = await api.getAuction(id);
        if (!alive) return;

        const a = data.auction;
        const now = Date.now();
        const startTime = a?.startTime ? new Date(a.startTime).getTime() : null;
        const editable = startTime === null ? true : now < startTime;
        setCanEdit(editable);

        if (editable) {
          setFormData({
            ...a,
            startTime: startTime ? toLocalInputValue(new Date(startTime)) : "",
            endTime: a.endTime ? toLocalInputValue(new Date(a.endTime)) : "",
          });
        }

        if (!didShowWarning.current && editable && startTime && startTime - now < 60 * 1000) {
          alert("Warning: Auction will start in less than 1 minute. Editing may be disabled soon.");
          didShowWarning.current = true;
        }

        setLoading(false);
      } catch (e) {
        if (!alive) return;
        if (!isDeleting.current) {
          alert("Auction not found!");
          navigate("/my-auctions");
        }
        setLoading(false);
      }
    };

    load();
    const poll = setInterval(load, 4000);

    return () => {
      alive = false;
      clearInterval(poll);
    };
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) setImageFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isBanned) {
      alert("You are banned from editing auctions.");
      return;
    }

    try {
      let updatedData = { ...formData };

      if (imageFile) {
        const storage = getStorage();
        const storageRef = ref(storage, `auction_images/${Date.now()}_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        const downloadURL = await getDownloadURL(storageRef);
        updatedData.imageUrl = downloadURL;
      }

      await api.updateAuction(id, {
        ...updatedData,
        startingPrice: Number(updatedData.startingPrice),
        stepPrice: updatedData.stepPrice ? Number(updatedData.stepPrice) : 1,
        startTime: new Date(updatedData.startTime).toISOString(),
        endTime: new Date(updatedData.endTime).toISOString(),
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
      isDeleting.current = true;
      await api.deleteAuction(id);
      alert("Auction deleted successfully!");
      navigate("/my-auctions");
    } catch (err) {
      alert("Failed to delete auction: " + err.message);
    }
  };

  if (loading) return <p>Loading...</p>;

  if (isBanned) {
    return (
      <div className="edit-auction-page">
        <div style={{ color: "red", textAlign: "center", padding: "20px", fontSize: "18px" }}>
          <h2>Access Denied</h2>
          <p>You are banned from editing auctions until {banExpiry?.toLocaleDateString()}</p>
          <button onClick={() => navigate("/my-auctions")}>Back to My Auctions</button>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-auction-container">
      <h2>Edit Auction</h2>

      {canEdit ? (
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
            <input type="datetime-local" name="startTime" value={formData.startTime || ""} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>End Time:</label>
            <input type="datetime-local" name="endTime" value={formData.endTime || ""} onChange={handleChange} required />
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
      ) : (
        <p style={{ color: "red", textAlign: "center" }}>
          Editing is disabled because the auction has already started.
        </p>
      )}
    </div>
  );
}
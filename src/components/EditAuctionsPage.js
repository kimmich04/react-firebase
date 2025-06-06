import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, updateDoc, deleteDoc, Timestamp, getDoc } from "firebase/firestore";
import { auth, db } from "../Firebase";
import "../styles/EditAuctionsPage.scss";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Helper to format date for datetime-local input
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
    const checkUserBan = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const bannedUntil = userData.bannedUntil;
            if (bannedUntil && bannedUntil.toDate() > new Date()) {
              setIsBanned(true);
              setBanExpiry(bannedUntil.toDate());
              alert(`You are banned from editing auctions until ${bannedUntil.toDate().toLocaleDateString()}`);
              navigate("/my-auctions");
              return;
            }
          }
        } catch (error) {
          console.error("Error checking user ban status:", error);
        }
      }
    };

    checkUserBan();

    const docRef = doc(db, "auctions", id);

    // Real-time listener for the auction document
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const now = new Date().getTime();
        const startTime = data.startTime?.toDate ? data.startTime.toDate().getTime() : null;
        const canEdit = startTime === null ? true : now < startTime;
        setCanEdit(canEdit);

        // Only update form fields if editing is allowed
        if (canEdit) {
          setFormData({
            ...data,
            startTime: startTime ? toLocalInputValue(new Date(startTime)) : "",
            endTime: data.endTime?.toDate ? toLocalInputValue(data.endTime.toDate()) : "",
          });
        }

        // Show warning only on first mount (when opening the edit page)
        if (
          !didShowWarning.current &&
          canEdit &&
          startTime &&
          startTime - now < 60 * 1000
        ) {
          alert("Warning: Auction will start in less than 1 minute. Editing may be disabled soon.");
          didShowWarning.current = true;
        }
      } else {
        if (!isDeleting.current) {
          alert("Auction not found!");
          navigate("/my-auctions");
        }
      }
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [id, navigate]);

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
    
    if (isBanned) {
      alert("You are banned from editing auctions.");
      return;
    }

    try {
      let updatedData = { ...formData };

      if (imageFile) {
        const storage = getStorage();
        const storageRef = ref(storage, `auction_images/${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        const downloadURL = await getDownloadURL(storageRef);
        updatedData.imageUrl = downloadURL;
      }

      // Always convert startTime and endTime to Date, then to Timestamp
      updatedData.startTime = Timestamp.fromDate(new Date(formData.startTime));
      updatedData.endTime = Timestamp.fromDate(new Date(formData.endTime));

      await updateDoc(doc(db, "auctions", id), {
        ...updatedData,
        startingPrice: Number(updatedData.startingPrice),
        stepPrice: updatedData.stepPrice ? Number(updatedData.stepPrice) : 1,
      });

      alert("Auction updated successfully!");

      // Force re-fetch of auction data
      const docRef = doc(db, "auctions", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const now = new Date().getTime();
        const startTime = data.startTime?.toDate ? data.startTime.toDate().getTime() : null;

        setFormData({
          ...data,
          startTime: startTime ? toLocalInputValue(new Date(startTime)) : "",
          endTime: data.endTime?.toDate ? toLocalInputValue(data.endTime.toDate()) : "",
        });

        setCanEdit(startTime && now < startTime);
      }

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
      await deleteDoc(doc(db, "auctions", id));
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
        <div style={{ 
          color: "red", 
          textAlign: "center", 
          padding: "20px",
          fontSize: "18px" 
        }}>
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
      ) : (
        <p style={{ color: "red", textAlign: "center" }}>
          Editing is disabled because the auction has already started.
        </p>
      )}
    </div>
  );
}
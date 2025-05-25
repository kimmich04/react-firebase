import React, { useState } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';
import "../styles/Uploadimage.scss";
import { auth, db } from "../Firebase";

function Uploadimage({ onUploadComplete }) {
  const [image, setImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const storage = getStorage();

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!image) {
      setUploadError("Please select an image first!");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const imageName = `product_images/${uuidv4()}_${image.name}`;
    const imageRef = ref(storage, imageName);
    const uploadTask = uploadBytesResumable(imageRef, image);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
        console.log('Upload is ' + progress + '% done');
      },
      (error) => {
        setIsUploading(false);
        setUploadError("Error uploading image. Please try again.");
        console.error("Error uploading image: ", error);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref)
          .then((downloadURL) => {
            console.log('File available at', downloadURL);
            setImageUrl(downloadURL);
            setIsUploading(false);

            if (onUploadComplete) {
              onUploadComplete(downloadURL);
            }
          })
          .catch((error) => {
            setIsUploading(false);
            setUploadError("Error getting download URL. Please try again.");
            console.error("Error getting download URL: ", error);
          });
      }
    );
  };

  return (
    <div>
      <input type="file" onChange={handleImageChange} disabled={isUploading} />
      <button onClick={handleUpload} disabled={!image || isUploading}>
        {isUploading ? "Uploading..." : "Upload Image"}
      </button>

      {uploadProgress > 0 && uploadProgress < 100 && (
        <p>Uploading: {uploadProgress.toFixed(0)}%</p>
      )}

      {imageUrl && (
        <div className="image">
          <img src={imageUrl} alt="Uploaded Product" />
        </div>
      )}

      {uploadError && (
        <div className="image-err">{uploadError}</div>
      )}
    </div>
  );
}

export default Uploadimage;
  
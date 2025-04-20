import React, { useState } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';

function Uploadimage() {
  const [image, setImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null); // New state for upload errors

  const storage = getStorage(); // Get the storage service

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
      setUploadError(null); // Clear any previous errors when a new image is selected
    }
  };

  const handleUpload = async () => {
    if (!image) {
      setUploadError("Please select an image first!"); // Set an error message
      return;
    }

    setIsUploading(true);
    setUploadProgress(0); // Reset progress
    setUploadError(null); // Clear any previous errors

    // Generate a unique image name
    const imageName = `product_images/${uuidv4()}_${image.name}`;
    const imageRef = ref(storage, imageName);

    const uploadTask = uploadBytesResumable(imageRef, image);

    uploadTask.on('state_changed',
      (snapshot) => {
        // Observe state change events such as progress, pause, and resume:
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
        console.log('Upload is ' + progress + '% done');
      },
      (error) => {
        // Handle unsuccessful uploads
        setIsUploading(false);
        setUploadError("Error uploading image. Please try again."); // Set an error message
        console.error("Error uploading image: ", error);
      },
      () => {
        // Handle successful uploads on complete
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          console.log('File available at', downloadURL);
          setImageUrl(downloadURL); // Set the image URL
          setIsUploading(false);
        }).catch((error) => {  //Catch any errors during download URL retrieval
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
      {uploadProgress > 0 && (
        <div>
          Upload Progress: {uploadProgress.toFixed(2)}%
        </div>
      )}
      {imageUrl && (
        <div>
          <img src={imageUrl} alt="Uploaded Product" style={{ maxWidth: '200px' }} />
        </div>
      )}
       {uploadError && (  // Display upload error message
        <div style={{ color: 'red' }}>{uploadError}</div>
      )}
    </div>
  );
}

export default Uploadimage;

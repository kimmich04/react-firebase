import { setDoc, doc, Timestamp, getDoc } from "firebase/firestore";
import { db } from "../Firebase";

// Mutex to prevent race conditions
const notificationMutex = new Set();

// Helper to generate a unique notification ID
function notificationId({ userId, auctionId, type, participantId }) {
  return [userId, auctionId, type, participantId || "none"].join("_");
}

export const createNotification = async ({ userId, message, auctionId, type, participantId, fromUserId }) => {
  let id; // Declare id here so it is available in catch block
  try {
    id = notificationId({ userId, auctionId, type, participantId });

    // Check if the notification is already being processed
    if (notificationMutex.has(id)) {
      console.log(`Notification is already being processed: ${id}`);
      return;
    }

    notificationMutex.add(id);

    const notificationRef = doc(db, "notifications", id);
    const existing = await getDoc(notificationRef);

    // Only create the notification if it doesn't already exist
    if (existing.exists()) {
      console.log(`Notification already exists: ${id}`);
      notificationMutex.delete(id);
      return;
    }

    const notificationData = {
      userId,
      message,
      auctionId,
      type,
      participantId: participantId || null,
      fromUserId: fromUserId || null,
      read: false,
      time: Timestamp.now(),
    };

    await setDoc(notificationRef, notificationData);
    console.log(`Notification created successfully: ${id}`);
    notificationMutex.delete(id);
  } catch (error) {
    console.error("Error creating notification:", error);
    if (id) {
      notificationMutex.delete(id);
    }
  }
};


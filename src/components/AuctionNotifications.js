import { useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../Firebase";
import { createNotification } from "../utils/notifications";

// Move this outside the component so it persists
const participantListenerMap = new Map();

const AuctionNotifications = () => {
  useEffect(() => {
    const auctionsRef = collection(db, "auctions");
    const q = query(auctionsRef, orderBy("createdAt", "desc"));

    const unsubscribeAuctions = onSnapshot(q, (snapshot) => {
      // Remove listeners for auctions that no longer exist
      const currentAuctionIds = new Set(snapshot.docs.map(doc => doc.id));
      for (const [auctionId, unsub] of participantListenerMap.entries()) {
        if (!currentAuctionIds.has(auctionId)) {
          unsub(); // Unsubscribe from listener
          participantListenerMap.delete(auctionId); // Remove from map
        }
      }

      snapshot.docs.forEach((docSnapshot) => {
        const auction = docSnapshot.data();
        const auctionId = docSnapshot.id;

        // Skip if listener already exists
        if (participantListenerMap.has(auctionId)) return;

        const participantsRef = collection(db, "auctions", auctionId, "participants");
        const unsub = onSnapshot(participantsRef, async (participantsSnapshot) => {
          participantsSnapshot.docChanges().forEach(async (change) => {
            if (change.type === "added") {
              const participant = change.doc.data();
              const participantId = change.doc.id;

              // Bidder notification
              await createNotification({
                userId: participant.userId,
                message: `You have successfully joined the auction "${auction.name}".`,
                auctionId,
                type: "join-bidder",
                participantId,
              });

              // Owner notification
              if (participant.userId !== auction.userId) {
                await createNotification({
                  userId: auction.userId,
                  fromUserId: participant.userId,
                  message: `A user joined your auction "${auction.name}".`,
                  auctionId,
                  type: "join",
                  participantId,
                });
              }
            }
          });
        });

        // Add listener to map
        participantListenerMap.set(auctionId, unsub);
        console.log(`Listener added for auction: ${auctionId}`);
      });
    });

    return () => {
      unsubscribeAuctions();
      for (const unsub of participantListenerMap.values()) {
        unsub();
      }
      participantListenerMap.clear();
    };
  }, []);

  return null;
};

export default AuctionNotifications;
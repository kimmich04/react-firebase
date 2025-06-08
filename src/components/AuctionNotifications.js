import { useEffect } from "react";
import { collection, query, orderBy, onSnapshot, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../Firebase";
import { createNotification } from "../utils/notifications";

const participantListenerMap = new Map();
const endedAuctionsNotified = new Set();
const bannedWinnersNotified = new Set();

const AuctionNotifications = () => {
  useEffect(() => {
    const auctionsRef = collection(db, "auctions");
    const q = query(auctionsRef, orderBy("createdAt", "desc"));

    let unsubscribeAuctions;

    // Listen for auctions in real-time
    unsubscribeAuctions = onSnapshot(q, async (snapshot) => {
      const now = new Date();

      for (const docSnapshot of snapshot.docs) {
        const auction = docSnapshot.data();
        const auctionId = docSnapshot.id;

        // === Real-time auction end notification ===
        if (
          auction.status === "ended" &&
          !endedAuctionsNotified.has(auctionId)
        ) {
          endedAuctionsNotified.add(auctionId);

          // Get all bids, sorted by amount desc, timestamp asc
          const bidsSnapshot = await getDocs(
            query(collection(db, "auctions", auctionId, "bids"), orderBy("amount", "desc"), orderBy("timestamp", "asc"))
          );
          const bids = bidsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const winnerBid = bids[0];
          const winnerUserId = winnerBid ? winnerBid.userId : null;
          const winnerUsername = winnerBid ? winnerBid.username || "Unknown" : "No winner";
          const winningAmount = winnerBid ? winnerBid.amount : null;

          // Get all participants
          const participantsSnapshot = await getDocs(collection(db, "auctions", auctionId, "participants"));
          const participantUserIds = participantsSnapshot.docs.map(doc => doc.data().userId);

          // Notify auctioneer
          if (auction.userId) {
            await createNotification({
              userId: auction.userId,
              message: winnerBid
                ? `Your auction "${auction.name}" has ended. The winner is ${winnerUsername} with a bid of ${Number(winningAmount).toLocaleString('vi-VN')} VND.`
                : `Your auction "${auction.name}" has ended. No bids were placed.`,
              auctionId,
              type: "auction-ended",
            });
          }

          for (const userId of participantUserIds) {
            if (winnerBid && userId === winnerUserId) {
              // Winner
              await createNotification({
                userId,
                message: `Congratulations! You won the auction "${auction.name}" with a bid of ${Number(winningAmount).toLocaleString('vi-VN')} VND. Please proceed payment to avoid being banned.`,
                auctionId,
                type: "auction-ended-win",
              });
            } else {
              // Not winner
              await createNotification({
                userId,
                message: winnerBid
                  ? `Auction "${auction.name}" has ended. The winner is ${winnerUsername} with a bid of ${Number(winningAmount).toLocaleString('vi-VN')} VND.`
                  : `Auction "${auction.name}" has ended. No bids were placed.`,
                auctionId,
                type: "auction-ended-lose",
              });
            }
          }

          // Fallback: If winner is not in participants, notify them
          if (
            winnerBid &&
            winnerUserId &&
            !participantUserIds.includes(winnerUserId)
          ) {
            await createNotification({
              userId: winnerUserId,
              message: `Congratulations! You won the auction "${auction.name}" with a bid of ${Number(winningAmount).toLocaleString('vi-VN')} VND, Please proceed payment to avoid being banned`,
              auctionId,
              type: "auction-ended-win",
            });
          }
        }

        // === Real-time ban if payment missed ===
        if (
          auction.endTime &&
          typeof auction.endTime.toDate === "function" &&
          auction.endTime.toDate() < now &&
          auction.paymentDeadline &&
          typeof auction.paymentDeadline.toDate === "function" &&
          auction.paymentDeadline.toDate() < now &&
          auction.paymentStatus !== "approved" &&
          !bannedWinnersNotified.has(auctionId)
        ) {
          // Get winner
          const bidsSnapshot = await getDocs(
            query(collection(db, "auctions", auctionId, "bids"), orderBy("amount", "desc"), orderBy("timestamp", "asc"))
          );
          const bids = bidsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const winnerBid = bids[0];
          const winnerUserId = winnerBid ? winnerBid.userId : null;

          if (winnerUserId) {
            // Ban winner for 30 days from now
            const bannedUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            const userRef = doc(db, "users", winnerUserId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              // Only ban if not already banned or ban expired
              if (!userData.bannedUntil || userData.bannedUntil.toDate() < now) {
                await updateDoc(userRef, {
                  bannedUntil: bannedUntil
                });

                // Calculate remaining days
                const diffMs = bannedUntil - now;
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

                // Notify the user with remaining ban time
                await createNotification({
                  userId: winnerUserId,
                  message: `You have been banned for ${diffDays} days for not completing payment for auction "${auction.name}".`,
                  auctionId,
                  type: "ban",
                });
              }
            }
            // === Notify auctioneer about failed payment ===
            if (auction.userId) {
              await createNotification({
                userId: auction.userId,
                message: `Auction "${auction.name}" cannot complete payment, please create this auction again.`,
                auctionId,
                type: "payment-failed",
              });
            }
            bannedWinnersNotified.add(auctionId);
          }
        }

        // === Real-time participant join notifications ===
        if (!participantListenerMap.has(auctionId)) {
          const participantsRef = collection(db, "auctions", auctionId, "participants");
          const unsub = onSnapshot(participantsRef, async (participantsSnapshot) => {
            participantsSnapshot.docChanges().forEach(async (change) => {
              if (change.type === "added") {
                const participant = change.doc.data();
                const participantId = change.doc.id;

                // Fetch participant's username
                let participantUsername = "A user";
                if (participant.userId) {
                  const userRef = doc(db, "users", participant.userId);
                  const userSnap = await getDoc(userRef);
                  if (userSnap.exists()) {
                    participantUsername = userSnap.data().username || "A user";
                  }
                }

                // Bidder notification
                await createNotification({
                  userId: participant.userId,
                  message: `You have successfully joined the auction "${auction.name}".`,
                  auctionId,
                  type: "join-bidder",
                  participantId,
                });

                // Owner notification with username
                if (participant.userId !== auction.userId) {
                  await createNotification({
                    userId: auction.userId,
                    fromUserId: participant.userId,
                    message: `${participantUsername} joined your auction "${auction.name}".`,
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
        }
      }
    });

    // Add polling for time-based events
    const intervalId = setInterval(async () => {
      const snapshot = await getDocs(q);
      const now = new Date();
      for (const docSnapshot of snapshot.docs) {
        const auction = docSnapshot.data();
        const auctionId = docSnapshot.id;

        // === Real-time ban if payment missed ===
        if (
          auction.endTime &&
          typeof auction.endTime.toDate === "function" &&
          auction.endTime.toDate() < now &&
          auction.paymentDeadline &&
          typeof auction.paymentDeadline.toDate === "function" &&
          auction.paymentDeadline.toDate() < now &&
          auction.paymentStatus !== "approved" &&
          !bannedWinnersNotified.has(auctionId)
        ) {
          // Get winner
          const bidsSnapshot = await getDocs(
            query(collection(db, "auctions", auctionId, "bids"), orderBy("amount", "desc"), orderBy("timestamp", "asc"))
          );
          const bids = bidsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const winnerBid = bids[0];
          const winnerUserId = winnerBid ? winnerBid.userId : null;

          if (winnerUserId) {
            // Ban winner for 30 days from now
            const bannedUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            const userRef = doc(db, "users", winnerUserId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              // Only ban if not already banned or ban expired
              if (!userData.bannedUntil || userData.bannedUntil.toDate() < now) {
                await updateDoc(userRef, {
                  bannedUntil: bannedUntil
                });

                // Calculate remaining days
                const diffMs = bannedUntil - now;
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

                // Notify the user with remaining ban time
                await createNotification({
                  userId: winnerUserId,
                  message: `You have been banned for ${diffDays} days for not completing payment for auction "${auction.name}".`,
                  auctionId,
                  type: "ban",
                });
              }
            }
            // === Notify auctioneer about failed payment ===
            if (auction.userId) {
              await createNotification({
                userId: auction.userId,
                message: `Auction "${auction.name}" cannot complete payment, please create this auction again.`,
                auctionId,
                type: "payment-failed",
              });
            }
            bannedWinnersNotified.add(auctionId);
          }
        }
      }
    }, 1000); // every 1 second for near real-time

    return () => {
      if (unsubscribeAuctions) unsubscribeAuctions();
      for (const unsub of participantListenerMap.values()) {
        unsub();
      }
      participantListenerMap.clear();
      endedAuctionsNotified.clear();
      bannedWinnersNotified.clear();
      clearInterval(intervalId);
    };
  }, []);

  return null;
};

export default AuctionNotifications;
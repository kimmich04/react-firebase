// src/services/api.js
import { auth } from "../Firebase";

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:4000/api";

async function authHeaders() {
  const user = auth.currentUser;
  if (!user) return { "Content-Type": "application/json" };

  const token = await user.getIdToken(true);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function request(path, { method = "GET", body } = {}) {
  const headers = await authHeaders();

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const msg = data?.error || `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

export const api = {
  // Auctions (basic)
  listAuctions: () => request("/auctions"),
  getAuction: (id) => request(`/auctions/${id}`),
  createAuction: (payload) => request("/auctions", { method: "POST", body: payload }),
  updateAuction: (id, payload) => request(`/auctions/${id}`, { method: "PUT", body: payload }),
  deleteAuction: (id) => request(`/auctions/${id}`, { method: "DELETE" }),

  // Auction detail / join / bids / payment
  getAuctionDetail: (id) => request(`/auctions/${id}/detail`),
  joinAuction: (id) => request(`/auctions/${id}/join`, { method: "POST" }),
  placeBid: (id, payload) => request(`/auctions/${id}/bids`, { method: "POST", body: payload }),
  updatePaymentStatus: (id, payload) => request(`/auctions/${id}/payment`, { method: "POST", body: payload }),

  // Me
  getMyAuctions: () => request("/me/auctions"),
  getMyProfile: () => request("/me/profile"),
  upsertMyProfile: (payload) => request("/me/profile", { method: "PUT", body: payload }),

  // Notifications
  listNotifications: () => request("/notifications"),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: "POST" }),
  markAllNotificationsRead: () => request(`/notifications/mark-all-read`, { method: "POST" }),
};
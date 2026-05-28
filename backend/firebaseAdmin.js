// backend/firebaseAdmin.js
require("dotenv").config();
const admin = require("firebase-admin");

// Option 1 (recommended): GOOGLE_APPLICATION_CREDENTIALS points to service account json
// Option 2: use env var FIREBASE_SERVICE_ACCOUNT_JSON (stringified json)

if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(sa),
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
}

const db = admin.firestore();

module.exports = { admin, db };
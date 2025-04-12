const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const { Storage } = require("@google-cloud/storage");

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  storageBucket: "filoxenia-users-data", // ✅ Replace with your actual bucket name
});

// Initialize Google Cloud Storage
const storage = new Storage();
const bucket = storage.bucket("filoxenia-users-data");

// 🔐 Middleware to verify Firebase token
async function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).send("Missing token");

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    next();
  } catch (err) {
    return res.status(403).send("Invalid token");
  }
}

// 📩 API: Accept form data and store in user folder
app.post("/submit-onboarding", verifyToken, async (req, res) => {
  try {
    const uid = req.uid;

    const file = bucket.file(`${uid}/profile.json`);
    await file.save(JSON.stringify(req.body), {
      contentType: "application/json",
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Error saving profile:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Health check route (optional)
app.get("/", (req, res) => {
  res.send("Filoxenia API is running.");
});

// 🚀 Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Filoxenia API running on port ${PORT}`);
});

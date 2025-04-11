import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import { Storage } from "@google-cloud/storage";

const app = express();
app.use(cors());
app.use(express.json());

admin.initializeApp(); // Uses default service account from Cloud Run
const db = admin.firestore();
const storage = new Storage();

const bucketName = "filoxenia-users-data"; // your GCS bucket

// Middleware: Verify Firebase token
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

// Save user data + upload to Cloud Storage
app.post("/submit-onboarding", verifyToken, async (req, res) => {
  const uid = req.uid;
  const userData = req.body;

  try {
    // Save to Firestore (optional)
    await db.collection("admins").doc(uid).set(userData, { merge: true });

    // Save to GCS as JSON file
    const file = storage.bucket(bucketName).file(`${uid}/profile.json`);
    await file.save(JSON.stringify(userData), {
      contentType: "application/json",
      public: false,
    });

    res.send({ success: true, message: "Data stored successfully." });
  } catch (error) {
    console.error("🔥 Upload failed:", error);
    res.status(500).send({ success: false, error: error.message });
  }
});

app.listen(8080, () => console.log("✅ Cloud Run API is running"));

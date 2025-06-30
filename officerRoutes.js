const express = require("express");
const router = express.Router();
const admin = require("../config/firebaseConfig");
const db = admin.firestore();
const path = require("path");

// Other officer routes

router.post("/accept", (req, res) => {
  const { requestId } = req.body;
  const requestDoc = db.collection("requests").doc(requestId);
  requestDoc
    .update({ status: "accepted" })
    .then(() => {
      res.redirect("/officer/details");
    })
    .catch((error) => {
      console.log("Error accepting request:", error);
      res.send("Error accepting request");
    });
});

router.post("/reject", (req, res) => {
  const { requestId } = req.body;
  const requestDoc = db.collection("requests").doc(requestId);
  requestDoc
    .update({ status: "rejected" })
    .then(() => {
      res.redirect("/officer/details");
    })
    .catch((error) => {
      console.log("Error rejecting request:", error);
      res.send("Error rejecting request");
    });
});

router.get("/details", (req, res) => {
  const officerId = req.session.officerId; // Assuming you have session management in place
  const officerDoc = db.collection("officers").doc(officerId);
  officerDoc
    .get()
    .then((officerSnapshot) => {
      const officerData = officerSnapshot.data();
      db.collection("requests")
        .where("officerId", "==", officerId)
        .get()
        .then((requestsSnapshot) => {
          const requests = [];
          requestsSnapshot.forEach((doc) => {
            const requestData = doc.data();
            db.collection("users")
              .doc(requestData.userId)
              .get()
              .then((userSnapshot) => {
                const userData = userSnapshot.data();
                requests.push({
                  id: doc.id,
                  ...userData,
                  message: requestData.message,
                });
              });
          });
          res.render("officer_dashboard", {
            username: officerData.name,
            profession: officerData.profession,
            requests,
          });
        });
    })
    .catch((error) => {
      console.log("Error loading details:", error);
      res.send("Error loading details");
    });
});

module.exports = router;

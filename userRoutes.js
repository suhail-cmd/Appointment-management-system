const express = require("express");
const router = express.Router();
const admin = require("../config/firebaseConfig");
const db = admin.firestore();
const path = require("path");

// Other user routes

router.post("/request", (req, res) => {
  const { officerId } = req.body;
  const userId = req.session.userId; // Assuming you have session management in place
  db.collection("requests")
    .add({
      officerId,
      userId,
      status: "pending",
    })
    .then(() => {
      res.redirect("/user/dashboard");
    })
    .catch((error) => {
      console.log("Error creating request:", error);
      res.send("Error creating request");
    });
});

router.get("/dashboard", (req, res) => {
  const userId = req.session.userId; // Assuming you have session management in place
  const userDoc = db.collection("users").doc(userId);
  userDoc
    .get()
    .then((userSnapshot) => {
      const userData = userSnapshot.data();
      db.collection("officers")
        .get()
        .then((officersSnapshot) => {
          const officers = [];
          officersSnapshot.forEach((doc) => {
            officers.push({ id: doc.id, ...doc.data() });
          });
          res.render("person_dashboard", {
            username: userData.name,
            profession: userData.profession,
            officers,
          });
        });
    })
    .catch((error) => {
      console.log("Error loading dashboard:", error);
      res.send("Error loading dashboard");
    });
});

module.exports = router;

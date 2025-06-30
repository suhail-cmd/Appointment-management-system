const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const path = require("path");
const request = require("request");
const passwordHash = require("password-hash");
const session = require("express-session");

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = require("./key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = getFirestore();

app.use(
  session({
    secret: "yourSecretKey",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);

app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("home");
});

// Login route
app.post("/loginSubmit", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).send("Email and password are required.");
    }

    const usersData = await db
      .collection("users")
      .where("email", "==", email)
      .get();

    let verified = false;
    let user = null;

    usersData.forEach((doc) => {
      if (passwordHash.verify(password, doc.data().password)) {
        verified = true;
        user = doc.data();
      }
    });

    if (verified) {
      req.session.user = user;
      res.redirect("/dashboard");
    } else {
      res.send("Login failed...");
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.send("Something went wrong...");
  }
});

// Signup route
app.post("/signupSubmit", async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.send("Passwords do not match. Please try again.");
  }

  try {
    const usersData = await db
      .collection("users")
      .where("email", "==", email)
      .get();

    if (!usersData.empty) {
      return res.send("SORRY!!! This account already exists...");
    }

    await db.collection("users").add({
      userName: username,
      email: email,
      password: passwordHash.generate(password),
    });

    res.sendFile(path.join(__dirname, "public", "login.html"));
  } catch (error) {
    console.error("Error during signup:", error);
    res.send("Something went wrong...");
  }
});

// Dashboard route
app.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login.html");
  }

  const { userName: username } = req.session.user;
  const phoneNumber = req.session.phoneNumber || "";
  const validationStatus = req.session.validationStatus || "N/A";

  res.render("dashboard", {
    username: username,
    phoneNumber: phoneNumber,
    validationStatus: validationStatus,
  });
});

// Validate Phone Number Route
app.post("/validatePhoneNumber", (req, res) => {
  const phoneNumber = req.body.phoneNumber;

  request.get(
    {
      url: `https://api.api-ninjas.com/v1/validatephone?number=${phoneNumber}`,
      headers: {
        "X-Api-Key": "yomuSJMcVhGSpG/JFgwkLQ==yU405obLdESvSyRk",
      },
    },
    function (error, response, body) {
      if (error) return res.status(500).json({ error: "Request failed" });
      else if (response.statusCode != 200)
        return res
          .status(response.statusCode)
          .json({ error: "Error fetching data" });
      else {
        try {
          const validationData = JSON.parse(body);
          const isValid = validationData.is_valid;

          req.session.phoneNumber = phoneNumber;
          req.session.validationStatus = isValid ? "Valid" : "Invalid";

          res.json({
            phoneNumber: phoneNumber,
            is_valid: isValid,
            country: validationData.country,
            location: validationData.location,
            timezones: validationData.timezones,
            format_national: validationData.format_national,
            format_international: validationData.format_international,
            format_e164: validationData.format_e164,
            country_code: validationData.country_code,
          });
        } catch (error) {
          console.error("Error parsing validation data:", error);
          res.status(500).json({ error: "Error parsing data" });
        }
      }
    }
  );
});

app.listen(2000, () => {
  console.log("Server is running on port 2000");
});

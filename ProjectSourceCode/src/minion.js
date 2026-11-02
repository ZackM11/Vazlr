const express = require("express"); // To build an application server or API
const app = express();
const handlebars = require("express-handlebars"); //to enable express to work with handlebars
const Handlebars = require("handlebars"); // to include the templating engine responsible for compiling templates
const path = require("path");
const db = require("./db");
const bodyParser = require("body-parser");
const session = require("express-session"); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require("bcryptjs"); //  To hash passwords
const axios = require("axios");
const zod = require("zod"); // For post request body validation
const router = express.Router();

/* Bcrypt salt rounds */
const SALT_ROUNDS = 12;

const userSchema = zod.object({
  email: zod.string().email("Invalid user email"),
  password: zod.string(),
});

router.get("/dashboard", (req, res) => {
  console.log(req.session.user); /* Example of how to access user session cookie */
  res.render("pages/minion-dash");
});

router.get("/register", (req, res) => {
  res.render("pages/register");
});

router.get("/login", (req, res) => {
  res.render("pages/login");
});

/* Get events for event calendar */
router.get("/getEvents", async (req, res) => {
  const query = `SELECT * FROM events;`;

  try {
    let results = await db.any(query);
    res.status(200).json({
      data: results,
    });
  } catch (err) {
    res.status(400).json({
      error: err,
    });
  }
});

// Add listings

/* Needs email and password fields in req.body */
router.post("/register", async (req, res) => {
  const zod_result = userSchema.safeParse(req.body);

  /* Invalid req.body fields */
  if (!zod_result.success) {
    return res.status(400).json({
	  message: "Failed to register user",
      errors: zod_result.error.flatten().fieldErrors
    });
  }

  /* Validated body, use this instead of req.body from here on */
  const vbody = zod_result.data;
  const hashed_pw = await bcrypt.hash(vbody.password, SALT_ROUNDS);
  const query = `INSERT INTO users (email, password_hash, role)
                 VALUES ('${vbody.email}', '${hashed_pw}', 'volunteer');`;

  try {
    let results = await db.any(query);
    res.status(200).json({
      data: "User successfully registered",
    });
  } catch (err) {
    res.status(400).json({
      error: err,
    });
  }
});

/* Also expects email and password field in body */
router.post("/login", async (req, res) => {
  const zod_result = userSchema.safeParse(req.body);

  if (!zod_result.success) {
    return res.status(400).json({
	  message: "Failed to login user",
      errors: zod_result.error.flatten().fieldErrors
    });
  }

  const vbody = zod_result.data;
  const getUserQuery = `SELECT * FROM users WHERE email = '${vbody.email}';`;
  let user;

  try {
    user = await db.one(getUserQuery);
  } catch (err) {
    return res.status(400).json({
      error: "Incorrect email or password",
    });
  }

  const pwMatches = await bcrypt.compare(vbody.password, user.password_hash);

  if (pwMatches) { /* Log user in */
    delete user.password_hash; /* Don't need to store their pw hash */
    req.session.user = user;
    req.session.save();

    res.redirect('/volunteers/dashboard');
  } else {
    /* TODO: Render login page with incorrect pw error */
    res.status(200).json({
      error: "Incorrect email or password",
    });
  }
});

app.get("/minion-dash", (req, res) => {
  res.render('pages/minion-dash', {
    events : [
      {event_id: 1, title: 'Park Cleanup', date : 'Nov 8', location : 'Boulder'}
    ]
  });
});

module.exports = router;

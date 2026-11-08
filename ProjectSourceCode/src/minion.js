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

router.post("/register", async (req, res) => {
  const valid = userSchema.safeParse(req.body);

  if (!valid) {
    console.log(`Invalid register request: ${result.error.format()}`);
    return res.status(400).json({
      errors: result.error.format(),
    });
  }

  const hashed_pw = await bcrypt.hash(req.body.password, SALT_ROUNDS);
  const query = ""; // TODO: Insert query here to insert user email and hashed_pw into db
  res.status(200).json({
    data: "User successfully registered",
  });
  return;
  try {
    let results = await db.one(query);
    res.status(200).json({
      data: "User successfully registered",
    });
  } catch (err) {
    res.status(400).json({
      error: err,
    });
  }
});

router.post("/login", async (req, res) => {
  const valid = userSchema.safeParse(req.body);

  if (!valid) {
    return res.status(400).json({
      errors: result.error.format(),
    });
  }

  /* TODO: query to check if user exists from db by email */
  const getUserQuery = `SELECT * FROM users WHERE email = ${email}`;
  let user;

  try {
    user = await db.any(getUserQuery);
  } catch (err) {
    return res.status(400).json({
      error: err,
    });
  }

  const pwMatches = await bycrypt.compare(req.body.password, user.password);

  if (pwMatches) {
    /* Log user in */
    req.session.user = user;
    req.session.save();
    /* TODO: Redirect to dashboard */
  } else {
    /* TODO: Render login page with incorrect pw error */
  }
});

router.get("/minion-dash", (req, res) => {
  res.render("pages/minion-dash", {
    events: [
      {
        event_id: 1,
        title: "Park Cleanup",
        date: "Nov 8",
        location: "Boulder",
      },
    ],
  });
});

module.exports = router;

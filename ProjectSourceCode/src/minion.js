const express = require("express"); // To build an application server or API
const app = express();
const handlebars = require("express-handlebars"); //to enable express to work with handlebars
const Handlebars = require("handlebars"); // to include the templating engine responsible for compiling templates
const path = require("path");
const pgp = require("pg-promise")(); // To connect to the Postgres DB from the node server
const bodyParser = require("body-parser");
const session = require("express-session"); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require("bcryptjs"); //  To hash passwords
const axios = require("axios");
const router = express.Router();

/* Bcrypt salt rounds */
const SALT_ROUNDS = 12;

router.get("/testing", (req, res) => {
  res.send("You are a minion");
});

/* /register and /login are boilerplate
 * TODO: Add actual paths when frontend is created
 */
router.get("/register", (req, res) => {
  res.render("pages/minion-registration");
});

router.get("/login", (req, res) => {
  res.render("pages/minion-login");
});

router.post("/register", async (req, res) => {
  const hashed_pw = await bycrypt.hash(req.body.password, SALT_ROUNDS);
	
  /* TODO:
   * Insert username and password into SQL table
   * Return http status
   */
});

router.post("/login", async (req, res) => {
  /* TODO: Get password for username from db */
  const matches = await bycrypt.compare(req.body.password, user.password);
  if (matches) { /* Log user in */
    req.session.user = user;
    req.session.save();
	/* TODO: Redirect to dashboard */
  } else {
    /* TODO: Render login page with incorrect pw error */
  }
});

module.exports = router;

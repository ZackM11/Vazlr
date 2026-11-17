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

const requireAuth = (req, res, next) => {
	if (!req.session || !req.session.user) {
		return res.redirect("/login");
	}

	next();
};

router.get("/dashboard", requireAuth, (req, res) => {
	console.log(req.session.user); /* Example of how to access user session cookie */
	res.render("pages/minion-dash", {
		user: req.session.user
	});
});

/* Get events for event calendar */
router.get("/getEvents", async (req, res) => {
	const query = `SELECT organization_id, category_id, title, description, image_url,
                    address, city, zip, start_time, end_time, capacity, status FROM events;`; //don't need to display event id

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

module.exports = router;

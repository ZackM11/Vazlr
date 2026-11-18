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
const zod = require("zod"); // For post request body validation
const router = express.Router();
const db = require("./db.js");

// (AI-generated) The organization ID is the logged-in user's ID (organizations.user_id), NOT
// a value that the browser is allowed to choose.
function requireOrganization(req, res, next) {
	const user = req.session && req.session.user;
	if (!user) {
		if (req.path === "/dashboard") {
			return res.redirect("/orgs/login");
		}
		return res
			.status(401)
			.json({ message: "Log in as an organization to continue." });
	}
	if (user.role !== "organization") {
		return res
			.status(403)
			.json({ message: "Only organization accounts can manage events." });
	}
	next();
}
const createEventSchema = zod.object({
	eventName: zod.string().trim().min(1).max(150),
	eventDescription: zod.string().trim().min(1),
	eventAddress: zod.string().trim().min(1),
	eventCity: zod.string().trim().min(1),
	eventZip: zod.string().trim().min(1).max(10),
	eventStart: zod.string().datetime({ offset: true }),
	eventEnd: zod.string().datetime({ offset: true }),
	eventCapacity: zod.coerce.number().int().positive().max(2147483647),
	eventCategory: zod.coerce.number().int().positive(),
	eventImage: zod.union([zod.literal(""), zod.string().url()]).optional(),
	eventStatus: zod.enum(["open", "cancelled"]).default("open"),
}).refine(
	({ eventStart, eventEnd }) =>
		new Date(eventEnd).getTime() > new Date(eventStart).getTime(),
	{ path: ["eventEnd"], message: "End time must be after start time." },
);

router.get("/testing", (req, res) => {
	res.send("You are a generous philanthropist");
});

module.exports = router;

/* Bcrypt salt rounds */
const SALT_ROUNDS = 12;

const userSchema = zod.object({
	email: zod.string().email("Invalid user email"),
	password: zod.string(),
});

/* Get events for event calendar */
router.get("/getEvents", async (req, res) => {
	const zod_result = userSchema.safeParse(req.body);

	// TODO: Put a query here that gets the org id from the email

	// TODO: Make this query only return events from the logged-in organization
	const query = `SELECT organization_id, category_id, title, description, image_url,
                    address, city, zip, start_time, end_time, capacity, status FROM events`; //TODO: Put events query here

	try {
		let results = await db.one(query);
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
router.post("/events", requireOrganization, async (req, res) => {
	const zod_result = createEventSchema.safeParse(req.body);

	if (!zod_result.success) {
		return res.status(400).json({
			message: "Please correct the event fields and try again.",
			errors: zod_result.error.flatten().fieldErrors,
		});
	}

	const vbody = zod_result.data;
	const organizationId = req.session.user.id;

	try {
		// The user's role and an actual organizations row are both required.
		let organization = await db.oneOrNone(
			"SELECT user_id FROM organizations WHERE user_id = $1;",
			[organizationId],
		);
		if (!organization) {
			await db.none(
				`INSERT INTO organizations (user_id, name)
				 SELECT id, split_part(email, '@', 1)
				 FROM users
				 WHERE id = $1 AND role = 'organization'
				 ON CONFLICT (user_id) DO NOTHING;`,
				[organizationId],
			);
			organization = await db.oneOrNone(
				"SELECT user_id FROM organizations WHERE user_id = $1;",
				[organizationId],
			);
		}
		if (!organization) {
			return res
				.status(403)
				.json({ message: "Your account has no organization profile." });
		}
		const category = await db.oneOrNone(
			"SELECT id FROM categories WHERE id = $1",
			[vbody.eventCategory],
		);
		if (!category) {
			return res
				.status(400)
				.json({ message: "Select a valid event category." });
		}

		const query = `INSERT INTO events
			(organization_id, category_id, title, description, image_url,
			 address, city, zip, start_time, end_time, capacity, status)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			RETURNING id, organization_id, category_id, title, description, image_url,
					  address, city, zip, start_time, end_time, capacity, status`;

		const newEvent = await db.one(query, [
			organizationId,
			category.id,
			vbody.eventName,
			vbody.eventDescription,
			vbody.eventImage || null,
			vbody.eventAddress,
			vbody.eventCity,
			vbody.eventZip,
			vbody.eventStart,
			vbody.eventEnd,
			vbody.eventCapacity,
			vbody.eventStatus,
		]);

		return res
			.status(201)
			.json({ message: "Event created successfully.", data: newEvent });
	} catch (err) {
		console.error("Error creating event:", err);
		return res
			.status(500)
			.json({ message: "Unable to create the event. Please3000 try again." });
	}
});

router.get("/getVolunteers", async (req, res) => {
	const organizationId = req.session.user.id;

	const query = `SELECT users.id, users.first_name, users.last_name, users.email, events.title AS event_title
				   FROM users
				   JOIN event_volunteers ON users.id = event_volunteers.user_id
				   JOIN events ON event_volunteers.event_id = events.id
				   WHERE events.organization_id = $1`;

	let results;
	try {
		results = await db.any(query, [organizationId]);
	} catch (err) {
		console.log(`Error in getting volunteers: ${err}`);
		res.status(400).json({
			error: err,
		});
		return;
	}
	console.log(results);
	res.render("pages/org-dash", {
		results,
	});
});

router.get("/dashboard", async (req, res) => {
	const organizationId = req.session.user.id;
	const query = `SELECT organization_id, category_id, title, description, image_url,
                    address, city, zip, start_time, end_time, capacity, status FROM events`; //TODO: Put events query here

	let results;
	try {
		results = await db.any(query);
	} catch (err) {
		console.log(`Error in getting events: ${err}`);
		res.status(400).json({
			error: err,
		});
		return;
	}
	console.log(results);

	res.render("pages/org-dash", {
		results,
	});
});

module.exports = router;

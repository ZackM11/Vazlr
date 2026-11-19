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

const eventSchema = zod.object({
	event_id: zod.coerce.number().int("Invalid event ID"),
});

const bookEventSchema = zod.object({
	event_id: zod.coerce.number().int("Invalid event ID"),
	name: zod.string().max(100),
	email: zod.string().email("Invalid user email"),
	emergencyPhone: zod.string().max(15),
	emergencyName: zod.string().max(100),
	notes: zod.string().max(500)
});

const requireAuth = (req, res, next) => {
	if (!req.session || !req.session.user) {
		return res.redirect("/login");
	}

	next();
};

async function getEvents() {
	const query = `SELECT * FROM events;`;
	return await db.any(query);
}

async function getEventByID(id) {
	const query = `
		SELECT e.*, o.name AS org_name, o.is_verified
		FROM events e
		JOIN organizations o 
		ON e.organization_id = o.user_id
		WHERE e.id = ${id};`
	return await db.one(query);
}

router.get("/dashboard", requireAuth, async (req, res) => {
	console.log(req.session.user); /* Example of how to access user session cookie */
	let events;
	try {
		events = await getEvents();
	} catch (err) {
		res.status(400).json({
			error: err,
		});
	}
	res.render("pages/minion-dash", {
		user: req.session.user,
		events: events
	});
});

router.get("/book-event", requireAuth, async (req, res) => {
	const zod_result = eventSchema.safeParse(req.query);

	if (!zod_result.success) {
		return res.status(400).json({
			errors: zod_result.error.flatten().fieldErrors,
		});
	}
	let vquery = zod_result.data;

	let event;
	try {
		event = await getEventByID(vquery.event_id);
	} catch (err) {
		res.status(400).json({
			error: err,
		});
	}

	/* So that HBS can display event status */
	if (event.status === "open") {
		event.open = true;
	} else {
		event.open = false;
	}

	console.log(event); res.render("pages/bookin-form", {
		event: event,
		user: req.session.user
	});
});

router.post("/book-event", requireAuth, async (req, res) => {
	const zod_result = bookEventSchema.safeParse(req.body);

	if (!zod_result.success) {
		return res.status(400).json({
			errors: zod_result.error.flatten().fieldErrors,
		});
	}

	let vbody = zod_result.data;

	console.log(req.body);
	const query = `
		INSERT INTO bookings
		(event_id, volunteer_id, status, emergency_contact_name,
			emergency_contact_phone, notes, waiver_accepted, booked_at)
		VALUES ('${vbody.event_id}', '${req.session.user.id}',
			'confirmed', '${vbody.emergencyName}', '${vbody.emergencyContactPhone}',
			'${vbody.notes}', TRUE, NOW());
	`;
	
	try {
		let result = await db.any(query);
		res.redirect("volunteers/dashboard");
	} catch (err) {
		console.log(err);
		res.render("pages/bookin-form", {
			error: "Unable to book event",
		});
		return;
	}
});

module.exports = router;

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
			return res.redirect("/login");
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
const updateEventSchema = createEventSchema.safeExtend({
	eventStatus: zod.enum(["open", "cancelled", "completed"]),
});
const eventIdSchema = zod.coerce.number().int().positive();

function getUpcomingEvents(events) {
	const now = Date.now();
	return events.filter((event) => new Date(event.end_time).getTime() >= now);
}

router.get("/testing", (req, res) => {
	res.send("You are a generous philanthropist");
});

module.exports = router;

/* Bcrypt salt rounds */
const SALT_ROUNDS = 12;

/* Get events for event calendar */
router.get("/getEvents", requireOrganization, async (req, res) => {
	const organizationId = req.session.user.id;
	const query = `SELECT id, organization_id, category_id, title, description, image_url,
                    address, city, zip, start_time, end_time, capacity, status
				   FROM events
				   WHERE organization_id = $1
				   ORDER BY start_time`;

	try {
		const events = await db.any(query, [organizationId]);
		const upcomingEvents = getUpcomingEvents(events);
		res.render("pages/org-dash", {
			events,
			upcomingEvents,
			showAllEvents: upcomingEvents.length > 5,
			volunteers: [],
			showAllVolunteers: false,
			canEditEvents: true,
		});
	} catch (err) {
		console.error(`Error in getting organization events: ${err}`);
		res.status(500).json({
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

router.put("/events/:eventId", requireOrganization, async (req, res) => {
	const eventIdResult = eventIdSchema.safeParse(req.params.eventId);
	if (!eventIdResult.success) {
		return res.status(400).json({ message: "Invalid event ID." });
	}

	const eventResult = updateEventSchema.safeParse(req.body);
	if (!eventResult.success) {
		return res.status(400).json({
			message: "Please correct the event fields and try again.",
			errors: eventResult.error.flatten().fieldErrors,
		});
	}

	const eventId = eventIdResult.data;
	const organizationId = req.session.user.id;
	const event = eventResult.data;

	try {
		const category = await db.oneOrNone(
			"SELECT id FROM categories WHERE id = $1",
			[event.eventCategory],
		);
		if (!category) {
			return res.status(400).json({ message: "Select a valid event category." });
		}

		const updatedEvent = await db.oneOrNone(
			`UPDATE events
			 SET category_id = $1, title = $2, description = $3, image_url = $4,
				 address = $5, city = $6, zip = $7, start_time = $8, end_time = $9,
				 capacity = $10, status = $11
			 WHERE id = $12 AND organization_id = $13
			 RETURNING id, title, start_time, end_time, status`,
			[
				category.id,
				event.eventName,
				event.eventDescription,
				event.eventImage || null,
				event.eventAddress,
				event.eventCity,
				event.eventZip,
				event.eventStart,
				event.eventEnd,
				event.eventCapacity,
				event.eventStatus,
				eventId,
				organizationId,
			],
		);
		if (!updatedEvent) {
			return res.status(404).json({ message: "Event not found." });
		}

		return res.json({ message: "Event updated successfully.", data: updatedEvent });
	} catch (err) {
		console.error("Error updating event:", err);
		return res.status(500).json({ message: "Unable to update the event. Please try again." });
	}
});

router.get("/getVolunteers", async (req, res) => {
	const organizationId = req.session.user.id;

	const query = `SELECT volunteers.first_name, volunteers.last_name,
						  events.title AS event_title, bookings.status
				   FROM bookings
				   JOIN volunteers ON volunteers.user_id = bookings.volunteer_id
				   JOIN events ON events.id = bookings.event_id
				   WHERE events.organization_id = $1
					 AND bookings.status != 'cancelled'
				   ORDER BY events.start_time, volunteers.last_name, volunteers.first_name`;

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
	res.render("pages/org-dash", {
		volunteers: results,
		showAllVolunteers: results.length > 5,
	});
});

router.get("/dashboard", requireOrganization, async (req, res) => {
	const organizationId = req.session.user.id;
	const query = `SELECT id, organization_id, category_id, title, description, image_url,
                    address, city, zip, start_time, end_time, capacity, status
				   FROM events
				   WHERE organization_id = $1
				   ORDER BY start_time`;
	const volunteerQuery = `SELECT volunteers.first_name, volunteers.last_name,
								   events.title AS event_title, bookings.status
							FROM bookings
							JOIN volunteers ON volunteers.user_id = bookings.volunteer_id
							JOIN events ON events.id = bookings.event_id
							WHERE events.organization_id = $1
							  AND bookings.status != 'cancelled'
							ORDER BY events.start_time, volunteers.last_name, volunteers.first_name`;

	let events, volunteers;
	try {
		events = await db.any(query, [organizationId]);
		volunteers = await db.any(volunteerQuery, [organizationId]);
	} catch (err) {
		console.log(`Error in getting events: ${err}`);
		res.status(400).json({
			error: err,
		});
		return;
	}
	const upcomingEvents = getUpcomingEvents(events);
	res.render("pages/org-dash", {
		events,
		upcomingEvents,
		showAllEvents: upcomingEvents.length > 5,
		volunteers,
		showAllVolunteers: volunteers.length > 5,
		canEditEvents: true,
	});
});

module.exports = router;

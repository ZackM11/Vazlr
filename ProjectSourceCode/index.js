// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require("express"); // To build an application server or API
const app = express();
const handlebars = require("express-handlebars"); //to enable express to work with handlebars
const Handlebars = require("handlebars"); // to include the templating engine responsible for compiling templates
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session"); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require("bcryptjs"); //  To hash passwords
const axios = require("axios"); // To make HTTP requests from our server. We'll learn more about it in Part C.
const db = require("./src/db.js");
const zod = require("zod"); // For post request body validation
const minion_routes = require("./src/minion.js");
const org_routes = require("./src/organizations.js");

/* Global variables */
const SALT_ROUNDS = 12;

const userLoginSchema = zod.object({
	email: zod.string().email("Invalid user email"),
	password: zod.string(),
});

const userRegisterSchema = zod.object({
	email: zod.string().email("Invalid user email"),
	password: zod.string(),
	confirm_password: zod.string(),
	role: zod.string().regex(/^volunteer$|^organization$/) /* Will error if role is not volunteer or org */
});

/* Configure HBS */
const hbs = handlebars.create({
	extname: "hbs",
	layoutsDir: __dirname + "/views/layouts",
	partialsDir: __dirname + "/views/partials",
});

/* Test database connection */
db.connect()
	.then((obj) => {
		console.log("Database connection successful"); // you can view this message in the docker compose logs
		obj.done(); // success, release the connection;
	})
	.catch((error) => {
		console.log("ERROR:", error.message || error);
	});

/* App settings */

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "src/resources")));
app.use("/img", express.static(path.join(__dirname, "img")));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
	session({
		secret: process.env.SESSION_SECRET,
		saveUninitialized: false,
		resave: false,
	}),
);

app.use(
	bodyParser.urlencoded({
		extended: true,
	}),
);

/* Routes */

app.use("/volunteers", minion_routes);
app.use("/orgs", org_routes);

app.get("/", (req, res) => {
	res.render("pages/home");
});

app.get("/login", (req, res) => {
	res.render("pages/login");
});

app.get("/register", (req, res) => {
	res.render("pages/register");
});

// Riley - Just for me to test my frontend dash - delete when necessary
app.get("/orgs-test", (req,res) => {
	res.render("pages/org-dash");
});

app.post("/register", async (req, res) => {
	const zod_result = userRegisterSchema.safeParse(req.body);

	/* Invalid req.body fields */
	if (!zod_result.success) {
		res.render('pages/register', {
			error: 'Unable to register user'
		});
		return;
	}

	/* Validated body, use this instead of req.body from here on */
	const vbody = zod_result.data;

	if(vbody.password !== vbody.confirm_password) {
		res.render('pages/register', {
			error: 'Passwords don\'t match'
		});
		return;
	}

	const hashed_pw = await bcrypt.hash(vbody.password, SALT_ROUNDS);
	const query = `INSERT INTO users (email, password_hash, role)
	               VALUES ('${vbody.email}', '${hashed_pw}', '${vbody.role}')
	               RETURNING id, email, role, created_at;`;
	let user;

	try {
		user = await db.one(query);
	} catch (err) {
		res.status(400).json({
			error: err,
		});
	}

	/* Log user in */
	req.session.user = user;
	req.session.save();

	if (user.role === "volunteer") {
		res.redirect('/volunteers/dashboard');
	} else {
		res.redirect('/orgs/dashboard');
	}
});

app.post("/login", async (req, res) => {
	const zod_result = userLoginSchema.safeParse(req.body);

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
		res.render('pages/login', {
			message: 'Unable to log user in'
		});
		return;
	}

	const pwMatches = await bcrypt.compare(vbody.password, user.password_hash);

	if (pwMatches) { /* Log user in */
		delete user.password_hash; /* Don't need to store their pw hash */
		req.session.user = user;
		req.session.save();

		if (user.role === "volunteer") {
			res.redirect('/volunteers/dashboard');
		} else {
			res.redirect('/orgs/dashboard');
		}
		return;
	}

	res.render('pages/login', {
		message: 'Incorrect username/password'
	});
});

app.post("/logout", (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			return res.status(500).json({
				message: 'Unable to log user out'
			});
		}

		res.clearCookie('connect.sid');
		res.redirect('/');
	});
});

// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log("Server is listening on port 3000");

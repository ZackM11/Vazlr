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

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
	extname: "hbs",
	layoutsDir: __dirname + "/views/layouts",
	partialsDir: __dirname + "/views/partials",
});

//Todo: When its time to add login, uncomment this
/*const auth = (req, res, next) => {
  if (!req.session.user) {
	  // Default to login page.
	return res.redirect("/login");
  }
  next();
};*/

	  const userSchema = zod.object({
		  email: zod.string().email("Invalid user email"),
		  password: zod.string(),
	  });

// test your database
db.connect()
	.then((obj) => {
		console.log("Database connection successful"); // you can view this message in the docker compose logs
		obj.done(); // success, release the connection;
	})
	.catch((error) => {
		console.log("ERROR:", error.message || error);
	});

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

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

app.post("/login", async (req, res) => {
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

// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log("Server is listening on port 3000");

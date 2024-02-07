// require('dotenv').config();

console.log(process.env.SECRET);

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const flash = require('connect-flash');
const ExpressError = require('./utils/ExpressError');
const methodOverride = require('method-override');
const helmet = require('helmet');

const mongoSanitize = require('express-mongo-sanitize');

const MongoStore = require('connect-mongo');

const app = express();

// const dbUrl = 'mongodb://localhost:27017/portfolio';

// mongoose.connect(dbUrl);
// const db = mongoose.connection;
// db.on("error", console.error.bind(console, "Connection error:"));
// db.once("open", () => {
//     console.log("Database connected.");
// });

const { MongoClient } = require('mongodb');
const { ConnectionString } = require('mongodb-connection-string-url');

const dbUrl = process.env.DB_URL;

console.log('DB_URL:', dbUrl);

try {
    const connectionString = new ConnectionString(dbUrl);
    console.log('Parsed Connection String:', connectionString);
} catch (error) {
    console.error('Error Parsing Connection String:', error);
}

const client = new MongoClient(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        await client.close();
    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.render('home');
});

app.get('/projects', (req, res) => {
    res.render('projects');
});

app.get('/contact', (req, res) => {
    res.render('contact');
});

app.get('/projects/colors', async (req, res) => {
    res.render('colors/index');
});

app.get('/projects/weather', async (req, res) => {
    res.render('weather/index');
});

app.get('/projects/tarot', async (req, res) => {
    res.render('tarot/index');
});


if(process.env.NODE_ENV !== "production") {
    require('dotenv').config();
};

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

const store = MongoStore.create({
    mongoUrl: dbUrl,
    touchAfter: 24 * 60 * 60,
    crypto: {
    secret: 'thisshouldbeabettersecret!'
    }
    });

store.on("error", function(e) {
   console.log("Session store error!", e)
});


const sessionConfig = {
    name: 'session',
    secret: 'thisshouldbeabettersecret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // secure: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionConfig));
app.use(flash());
app.use(helmet());

const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com/",
    "https://api.tiles.mapbox.com/",
    "https://api.mapbox.com/",
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://cdn.jsdelivr.net",
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com/",
    "https://stackpath.bootstrapcdn.com/",
    "https://api.mapbox.com/",
    "https://api.tiles.mapbox.com/",
    "https://fonts.googleapis.com/",
    "https://use.fontawesome.com/",
];
const connectSrcUrls = [
    "https://api.mapbox.com/",
    "https://a.tiles.mapbox.com/",
    "https://b.tiles.mapbox.com/",
    "https://events.mapbox.com/",
];
const fontSrcUrls = [];
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                "https://res.cloudinary.com/dtli3ahwf/", 
                "https://images.unsplash.com/",
            ],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);

app.use(express.static(path.join(__dirname, 'public')));
app.use(mongoSanitize({
    replaceWith: '_'
}));

app.all('*', (req, res, next) => {
    next(new ExpressError('Page not found', 404));
});

app.use((err, req, res, next) => {
    const { statusCode = 500, message = 'Internal Server Error' } = err;
    console.error(err.stack);
    res.status(statusCode).render('error', { err: { message } });
});


app.listen(3000, () => {
    console.log('Serving on port 3000');
});

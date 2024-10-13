const express = require('express');
const session = require('express-session');
const authRoutes = require('./routes/authRoutes');
const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true in production when using HTTPS
}));

app.get('/', (req, res) => {
    res.redirect('/login');
});

// Routes
app.use('/', authRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

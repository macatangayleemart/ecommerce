const User = require('../model/user');
const Product = require('../model/product');
const bcrypt = require('bcryptjs'); // Add this line
const db = require('../config/database'); // Adjust the path based on your project structure

exports.register = (req, res) => {
    res.render('partials/register');
};

exports.registerUser = (req, res) => {
    const { username, password } = req.body; // Remove role as it's defaulted to 'client'
    const userRole = 'client'; // Default role

    // Hash the password
    const hashedPassword = bcrypt.hashSync(password, 10); // 10 is the salt rounds

    const query = "INSERT INTO users (username, password, role) VALUES (?, ?, ?)";

    db.query(query, [username, hashedPassword, userRole], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Server error");
        }
        res.redirect('/login'); // Redirect after successful registration
    });
};


exports.login = (req, res) => {
    res.render('partials/login');
};

exports.loginUser = (req, res) => {
    const { username, password } = req.body;

    User.findByUsername(username, (err, user) => {
        if (err || !user) {
            return res.status(401).send('Invalid username or password');
        }

        // Check if the password matches the hashed password
        if (bcrypt.compareSync(password, user.password)) {
            req.session.userId = user.id;
            req.session.username = user.username; // Store username in session
            req.session.role = user.role; // Store user role in session

            if (user.role === 'admin') {
                res.redirect('/products/display'); // Admin dashboard
            } else {
                // Fetch all products for the client dashboard
                Product.getAllProducts((err, products) => {
                    if (err) {
                        return res.status(500).send('Error retrieving products: ' + err.message);
                    }
                    res.render('partials/clientdashboard', { products, username: req.session.username });
                });
            }
        } else {
            res.status(401).send('Invalid username or password'); // Invalid password
        }
    });
};


exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/'); 
        }
        res.clearCookie('connect.sid'); // Clear the cookie
        res.redirect('/login');
    });
};

exports.displayDashboard = (req, res) => {
    const username = req.session.username || 'Guest';
    const searchQuery = req.query.search || ''; // Get the search query from the request
    const page = parseInt(req.query.page) || 1; // Get the current page, default to 1 if not provided
    const itemsPerPage = 5; // Define how many products per page

    // Get the total count of products for pagination
    Product.countProducts(searchQuery, (err, totalProducts) => {
        if (err) {
            return res.status(500).send('Error counting products: ' + err.message);
        }

        const totalPages = Math.ceil(totalProducts / itemsPerPage); // Calculate total pages

        // Fetch products for the current page
        Product.getProductsByPage(searchQuery, page, itemsPerPage, (err, products) => {
            if (err) {
                return res.status(500).send('Error retrieving products: ' + err.message);
            }

            products.forEach(product => {
                product.price = parseFloat(product.price); // Convert price to a float
            });

            res.render('partials/display', { products, username, searchQuery, totalPages, currentPage: page });
        });
    });
};

// In authController.js
exports.addAdmin = (req, res) => {
    console.log("Request Body:", req.body); // Log the request body for debugging

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send("Username and password are required");
    }

    User.registerUser(username, password, (err, results) => {
        if (err) {
            console.error("Error registering admin:", err); // Log the error for debugging
            return res.status(500).send("Error registering admin");
        }
        res.redirect('/admin/display'); // Redirect upon successful registration
    });
};

exports.completeCheckout = (req, res) => {
    const cart = req.session.cart || [];
    const userId = req.session.userId; // Assuming you store the user's ID in the session

    if (!userId || cart.length === 0) {
        return res.redirect('/cart'); // Redirect if no user or empty cart
    }

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Start the process of inserting the order into the database
    db.beginTransaction((err) => {
        if (err) {
            console.error('Error starting transaction:', err);
            return res.status(500).send('Error starting transaction');
        }

        const orderQuery = 'INSERT INTO orders (user_id, total) VALUES (?, ?)';
        db.query(orderQuery, [userId, total], (error, orderResult) => {
            if (error) {
                return db.rollback(() => {
                    res.status(500).send('Error inserting order');
                });
            }

            const orderId = orderResult.insertId; // Get the new order ID

            // Insert each cart item into order_items
            const orderItemsQuery = 'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?';
            const orderItemsData = cart.map(item => [
                orderId, item.id, item.quantity, item.price
            ]);

            db.query(orderItemsQuery, [orderItemsData], (error) => {
                if (error) {
                    return db.rollback(() => {
                        res.status(500).send('Error inserting order items');
                    });
                }

                // Commit the transaction
                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).send('Error committing transaction');
                        });
                    }

                    // Clear the cart
                    req.session.cart = [];

                    // Redirect to the receipt page
                    res.redirect(`/receipt/${orderId}`); // Redirect to the receipt page with the order ID
                });
            });
        });
    });
};







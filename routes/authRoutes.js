const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const productController = require('../controller/productController');
const db = require('../config/database');

// Route to display the add product form
router.get('/products/add', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login'); // Redirect to login if not authenticated
    }
    res.render('partials/addProduct'); // Render the add product view
});

// Admin Routes
router.get('/admin/add', (req, res) => {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.redirect('/login'); // Ensure only admins can access this
    }
    res.render('partials/addadmin', { username: req.session.username });
});

router.post('/admin/add', authController.addAdmin);
// Route to display admin dashboard with pagination
router.get('/admin/display', (req, res) => {
   
    const itemsPerPage = 5; // Set the number of products to display per page
    const currentPage = parseInt(req.query.page) || 1; // Get the current page from the query parameters

    // Query to get the total number of products
    const countQuery = "SELECT COUNT(*) AS total FROM products"; // Adjust the query as needed
    db.query(countQuery, (err, countResult) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error fetching product count');
        }

        const totalItems = countResult[0].total; // Get the total number of products
        const totalPages = Math.ceil(totalItems / itemsPerPage); // Calculate total pages

        // Query to get the list of products for the current page
        const offset = (currentPage - 1) * itemsPerPage; // Calculate the offset for pagination
        const query = "SELECT * FROM products LIMIT ? OFFSET ?"; // Adjust the query as needed
        db.query(query, [itemsPerPage, offset], (err, productResults) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error fetching products');
            }

            // Ensure prices are numbers
            const products = productResults.map(product => ({
                ...product,
                price: parseFloat(product.price) // Convert price to a float
            }));

            // Pass the products, currentPage, totalPages, and searchQuery to the view
            const searchQuery = req.query.search || ''; // Get search query if applicable
            res.render('partials/display', { products: products, searchQuery, currentPage, totalPages }); // Pass all necessary data
        });
    });
});

router.get('/clientdashboard', (req, res) => {
    const username = req.session.username || 'Guest';

    const query = "SELECT * FROM products";
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error fetching products');
        }

        // Ensure that price is a number
        const products = results.map(product => {
            return {
                ...product,
                price: parseFloat(product.price) // Convert price to a number
            };
        });

        res.render('partials/clientdashboard', { username: username, products: products });
    });
});

// POST /cart/remove
router.post('/cart/remove', (req, res) => {
    const productId = req.body.productId;
    console.log('Removing product with ID:', productId); // Log the product ID

    if (req.session.cart) {
        // Log the cart before removal
        console.log('Cart before removal:', req.session.cart);
        
        req.session.cart = req.session.cart.filter(item => item.id !== parseInt(productId));
        
        // Log the cart after removal
        console.log('Cart after removal:', req.session.cart);
    }

    res.redirect('/cart');
});


router.get('/checkout', (req, res) => {
    const cart = req.session.cart || [];
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    res.render('partials/checkout', { total });
});

router.post('/checkout/complete', (req, res) => {
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
});


// Route to display the receipt
router.get('/receipt/:orderId', (req, res) => {
    const orderId = req.params.orderId;
    const userId = req.session.userId;

    // Query to get the order details
    const orderQuery = `
        SELECT o.id AS orderId, o.total AS totalAmount, oi.quantity, p.name, oi.price
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE o.id = ? AND o.user_id = ?
    `;

    db.query(orderQuery, [orderId, userId], (err, results) => {
        if (err) {
            return res.status(500).send('Error retrieving order details');
        }

        if (results.length === 0) {
            return res.status(404).send('Order not found');
        }

        // Ensure totalAmount is a number
        const totalAmount = parseFloat(results[0].totalAmount); // Convert to float

        // Convert prices to numbers in the cart items
        const cart = results.map(item => ({
            quantity: item.quantity,
            name: item.name,
            price: parseFloat(item.price), // Convert price to float
        }));

        res.render('partials/receipt', { username: req.session.username, orderId, totalAmount, cart });
    });
});

// In authRoutes.js or your routes file
router.post('/logout', (req, res) => {
    // Destroy the session to log the user out
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Failed to log out');
        }
        // Redirect to the login page after successful logout
        res.redirect('/login');
    });
});

// Route to add admin
router.post('/add', authController.addAdmin);

// Route to show the update form
router.get('/products/update/:id', productController.showUpdateForm); 
router.get('/products/display', productController.displayDashboard);

// Route to view product details
router.get('/products/details/:id', productController.showProductDetails);

// Route to add product to cart
router.post('/cart/add', productController.addToCart);
// Route to view cart
router.get('/cart', productController.getCart);


// Route to handle product update
router.post('/products/update/:id', productController.updateProduct); 

// Route to delete a product
router.post('/products/delete/:id', productController.deleteProduct); 

// Route to handle adding the product
router.post('/products/add', productController.addProduct);

router.get('/dashboard', authController.displayDashboard); // Use the new method

router.get('/register', authController.register);
router.post('/register', authController.registerUser);
router.get('/login', authController.login);
router.post('/login', authController.loginUser);
router.get('/logout', authController.logout);



module.exports = router;

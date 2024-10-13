const Product = require('../model/product'); // Import the Product model
const db = require('../config/database');

exports.addProduct = (req, res) => {
    const { name, price, description } = req.body;

    // Insert the new product into the database
    const newProduct = { name, price: parseFloat(price), description }; // Ensure price is a number

    Product.addProduct(newProduct, (err) => {
        if (err) {
            return res.status(500).send('Error adding product');
        }
        res.redirect('/dashboard'); // Redirect to dashboard after adding
    });
};

// productController.js

exports.showUpdateForm = (req, res) => {
    const productId = req.params.id;
    
    Product.findById(productId, (err, product) => {
        if (err || !product) {
            return res.status(404).send('Product not found');
        }
        res.render('partials/updateProduct', { product }); // Render the update form with the product details
    });
};


// Function to update the product
exports.updateProduct = (req, res) => {
    const productId = req.params.id;
    const { name, price, description } = req.body;

    const updatedProduct = { name, price: parseFloat(price), description };

    Product.updateProduct(productId, updatedProduct, (err) => {
        if (err) {
            return res.status(500).send('Error updating product');
        }
        res.redirect('/products/display'); // Redirect to the product display page after updating
    });
};

// Function to delete the product
exports.deleteProduct = (req, res) => {
    const productId = req.params.id;

    Product.deleteProduct(productId, (err) => {
        if (err) {
            return res.status(500).send('Error deleting product');
        }
        res.redirect('/products/display'); // Redirect to the product display page after deletion
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



// In your productController.js
exports.showProductDetails = (req, res) => {
    const productId = req.params.id; // Assuming you get the product ID from the URL
    Product.findById(productId, (err, product) => {
        if (err || !product) {
            return res.status(404).send('Product not found');
        }

        // Log the product object
        console.log('Product:', product); // Log the entire product object

        // Check the price type
        console.log('Price before conversion:', product.price, typeof product.price);

        // Convert price to a number if it's a string
        product.price = parseFloat(product.price); // Convert to number
        console.log('Price after conversion:', product.price, typeof product.price); // Log the converted price

        res.render('partials/productDetails', { product });
    });
};


// Add product to cart
exports.addToCart = (req, res) => {
    const productId = req.body.productId;

    // Ensure the cart exists in session
    if (!req.session.cart) {
        req.session.cart = [];
    }

    const query = "SELECT * FROM products WHERE id = ?";
    db.query(query, [productId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).send('Product not found');
        }

        const product = results[0];
        const cartItem = req.session.cart.find(item => item.id === product.id);

        if (cartItem) {
            // If the product is already in the cart, increase quantity
            cartItem.quantity++;
        } else {
            // Otherwise, add the product to the cart
            req.session.cart.push({ 
                id: product.id, 
                name: product.name, 
                price: parseFloat(product.price) || 0, // Ensure price is a number and default to 0 if NaN
                quantity: 1 
            });
        }

        res.redirect('/cart'); // Redirect to the cart page
    });
};


// View cart
exports.getCart = (req, res) => {
    const cartItems = req.session.cart || []; // Get cart items or an empty array if none
    res.render('partials/cart', { cart: cartItems });
};

// Remove product from cart
exports.removeFromCart = (req, res) => {
    const productId = req.body.productId;

    if (req.session.cart) {
        req.session.cart = req.session.cart.filter(item => item.id !== productId);
    }

    res.redirect('/cart'); // Redirect back to the cart page
};



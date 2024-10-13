const db = require('../config/database'); // Ensure you are importing your database connection

const Product = {
    // Method to find a product by ID
    findById: (id, callback) => {
        db.query('SELECT * FROM products WHERE id = ?', [id], (err, results) => {
            if (err) {
                return callback(err);
            }
            callback(null, results[0]); // Return the first result
        });
    },

    // Method to add a new product
    addProduct: (product, callback) => {
        const { name, price, description } = product; // Destructure the product object
        const query = 'INSERT INTO products (name, price, description) VALUES (?, ?, ?)';
        db.query(query, [name, price, description], (err, results) => {
            if (err) {
                return callback(err);
            }
            callback(null, results.insertId); // Return the ID of the newly inserted product
        });
    },

    // Method to get all products
    getAllProducts: (callback) => {
        const query = 'SELECT * FROM products';
        db.query(query, (err, results) => {
            if (err) {
                return callback(err);
            }

            // Map through the results and ensure price is converted to a float
            const products = results.map(product => ({
                ...product,
                price: parseFloat(product.price)
            }));

            callback(null, products); // Return the products with the price as float
        });
    },

     // Method to search for products based on search query
     searchProducts: (searchQuery, callback) => {
        let query = 'SELECT * FROM products';
        const queryParams = [];

        if (searchQuery) {
            query += ' WHERE name LIKE ?';
            queryParams.push(`%${searchQuery}%`);
        }

        db.query(query, queryParams, (err, results) => {
            if (err) {
                return callback(err);
            }

            const products = results.map(product => ({
                ...product,
                price: parseFloat(product.price)
            }));

            callback(null, products); // Return the products
        });
    },

     // Count the total number of products (with search filter)
     countProducts: (searchQuery, callback) => {
        let query = 'SELECT COUNT(*) AS count FROM products';
        const queryParams = [];

        if (searchQuery) {
            query += ' WHERE name LIKE ?';
            queryParams.push(`%${searchQuery}%`);
        }

        db.query(query, queryParams, (err, results) => {
            if (err) {
                return callback(err);
            }

            const count = results[0].count;
            callback(null, count);
        });
    },

    // Get products for the current page
    getProductsByPage: (searchQuery, page, itemsPerPage, callback) => {
        let query = 'SELECT * FROM products';
        const queryParams = [];

        if (searchQuery) {
            query += ' WHERE name LIKE ?';
            queryParams.push(`%${searchQuery}%`);
        }

        query += ' LIMIT ?, ?';
        queryParams.push((page - 1) * itemsPerPage, itemsPerPage);

        db.query(query, queryParams, (err, results) => {
            if (err) {
                return callback(err);
            }

            const products = results.map(product => ({
                ...product,
                price: parseFloat(product.price)
            }));

            callback(null, products);
        });
    },

    // Method to update an existing product
    updateProduct: (id, updatedProduct, callback) => {
        const { name, price, description } = updatedProduct; // Destructure the updated product object
        const query = 'UPDATE products SET name = ?, price = ?, description = ? WHERE id = ?';
        db.query(query, [name, price, description, id], (err, results) => {
            if (err) {
                return callback(err);
            }
            callback(null, results.affectedRows); // Return the number of affected rows
        });
    },

    // Method to delete a product
    deleteProduct: (id, callback) => {
        const query = 'DELETE FROM products WHERE id = ?';
        db.query(query, [id], (err, results) => {
            if (err) {
                return callback(err);
            }
            callback(null, results.affectedRows); // Return the number of affected rows
        });
    },
};

module.exports = Product;

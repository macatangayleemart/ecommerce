const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    static register(username, password, callback) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err, results) => {
            callback(err, results);
        });
    }

    static findByUsername(username, callback) {
        db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
            callback(err, results[0]);
        });
    }
    static registerUser(username, password, callback) {
        // Hash the password before saving
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                return callback(err); // Return the error to the callback
            }

            // Insert into the database
            const query = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
            db.query(query, [username, hashedPassword, 'admin'], (err, results) => {
                if (err) {
                    return callback(err); // Return the error to the callback
                }
                callback(null, results); // No error, return results
            });
        });
    }
    
}

module.exports = User;

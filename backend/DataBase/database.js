// Import Sequelize library
const { Sequelize } = require('sequelize');

// Database connection configuration
const sequelize = new Sequelize(
    'momisdb',  // Database name
    'root',     // Database username
    '13831383', // Database password
    {
        host: 'localhost',    // Database host
        dialect: 'mysql',     // Specify MySQL as the dialect
        logging: false,       // Disable logging of SQL queries (or set to console.log to see them)
    }
);

// Test the database connection
sequelize.authenticate()
    .then(() => {
        console.log('Connection to the database has been established successfully.');
    })
    .catch((error) => {
        console.error('Unable to connect to the database:', error);
    });

// Export the sequelize instance for use in other parts of the application
module.exports = sequelize;
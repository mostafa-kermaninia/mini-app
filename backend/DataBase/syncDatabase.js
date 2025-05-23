// Import the db object from models/index.js which includes sequelize and all models
const { sequelize, User, Score, Reward } = require('./models'); // Path to models/index.js

// Synchronize all defined models to the database.
// { force: false } will not drop tables if they already exist.
// { alter: true } will attempt to alter existing tables to match the model (use with caution in production).
sequelize.sync({ force: false, alter: true })
  .then(() => {
    console.log('Database & tables checked/altered successfully!');
  })
  .catch((error) => {
    console.error('Error syncing database:', error);
  });
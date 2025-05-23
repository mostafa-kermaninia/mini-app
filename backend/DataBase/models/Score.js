// Import DataTypes from Sequelize and the sequelize instance
const { DataTypes } = require("sequelize");
const sequelize = require("../database"); // Path to the sequelize instance

// Define the Score model
const Score = sequelize.define(
    "Score", // Model name
    {
        // 'id' (PK) will be automatically added by Sequelize
        score: {
            type: DataTypes.INTEGER,
            allowNull: false,          // A score value must be present
        },
        // The foreign key 'userTelegramId' will be added via the association
        // defined in models/index.js
    },
    {
        tableName: "scores",        // Explicitly define the table name
        timestamps: true,           // Adds createdAt and updatedAt fields
    }
);

// Export the Score model
module.exports = Score;
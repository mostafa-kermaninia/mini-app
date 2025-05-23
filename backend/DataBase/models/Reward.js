// Import DataTypes from Sequelize and the sequelize instance
const { DataTypes } = require("sequelize");
const sequelize = require("../database"); // Path to the sequelize instance

// Define the Reward model
const Reward = sequelize.define(
    "Reward", // Model name
    {
        // 'id' (PK) will be automatically added by Sequelize
        reward_type: {
            type: DataTypes.STRING,
            allowNull: true,           // Type of reward (e.g., "Coin", "Badge")
        },
        reward_value: {
            type: DataTypes.STRING,    // Value of the reward (e.g., "100", "Speedster")
                                       // Consider DataTypes.INTEGER if it's always a number
            allowNull: true,
        },
        // The foreign key 'userTelegramId' will be added via the association
        // defined in models/index.js
    },
    {
        tableName: "rewards",       // Explicitly define the table name
        timestamps: true,           // Adds createdAt and updatedAt fields
    }
);

// Export the Reward model
module.exports = Reward;
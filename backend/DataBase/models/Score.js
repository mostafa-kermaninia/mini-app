// models/Score.js
const { DataTypes } = require("sequelize");
const sequelize = require("../database");
const User = require("./User"); // وارد کردن مدل User

const Score = sequelize.define(
    "Score",
    {
        score: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        tableName: "scores",
        timestamps: true, // ذخیره‌سازی تاریخ و زمان ایجاد امتیاز
    }
);

// ایجاد رابطه میان کاربر و امتیاز
Score.belongsTo(User, { foreignKey: "user_id" });

module.exports = Score;

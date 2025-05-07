// models/Reward.js
const { DataTypes } = require("sequelize");
const sequelize = require("../database");
const User = require("./User"); // وارد کردن مدل User

const Reward = sequelize.define(
    "Reward",
    {
        reward_type: {
            type: DataTypes.STRING,
            allowNull: true, // نوع جایزه (مثلاً "تخفیف" یا "هدیه")
        },
        // reward_value: {
        //     type: DataTypes.STRING,
        //     allowNull: false, // مقدار جایزه (مثلاً 50% تخفیف)
        // },
        // awarded_at: {
        //     type: DataTypes.DATE,
        //     allowNull: false, // تاریخ دریافت جایزه
        // },
    },
    {
        tableName: "rewards",
        timestamps: true,
    }
);

// ایجاد رابطه میان کاربر و جایزه
Reward.belongsTo(User, { foreignKey: "user_id" });

module.exports = Reward;

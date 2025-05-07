// models/User.js
const { DataTypes } = require("sequelize");
const sequelize = require("../database"); // اتصال به دیتابیس

const User = sequelize.define(
    "User",
    {
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true, // هر کاربر باید یک نام کاربری یکتا داشته باشد
        },
        // email: {
        //     type: DataTypes.STRING,
        //     allowNull: true,
        //     unique: true, // اگر ایمیل وارد شود، باید یکتا باشد
        // },
    },
    {
        tableName: "users",
        timestamps: true, // ذخیره‌سازی تاریخ و زمان ایجاد و بروزرسانی
    }
);

module.exports = User;

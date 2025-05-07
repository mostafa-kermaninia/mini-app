// database.js
const { Sequelize } = require('sequelize');

// اتصال به دیتابیس MySQL
const sequelize = new Sequelize('momisdb', 'root', '13831383', {
  host: 'localhost',  // یا 127.0.0.1
  dialect: 'mysql',   // مشخص کردن نوع دیتابیس (در اینجا MySQL)
  logging: false,     // خاموش کردن لاگ‌ها (اختیاری)
});

// بررسی اتصال به دیتابیس
sequelize.authenticate()
  .then(() => {
    console.log('Connection to the database has been established successfully.');
  })
  .catch((error) => {
    console.error('Unable to connect to the database:', error);
  });

module.exports = sequelize;

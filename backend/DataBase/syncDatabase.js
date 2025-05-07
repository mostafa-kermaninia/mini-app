// syncDatabase.js
const sequelize = require('./database');
const User = require('./models/User');
const Score = require('./models/Score');
const Reward = require('./models/Reward');

// همگام‌سازی مدل‌ها با دیتابیس
sequelize.sync({ force: false })  // force: true برای پاک کردن جداول و بازسازی آن‌ها
  .then(() => {
    console.log('Database & tables created!');
  })
  .catch((error) => {
    console.error('Error syncing database:', error);
  });

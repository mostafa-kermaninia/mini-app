const crypto = require('crypto');

export default function validateTelegramData(initData, botToken) {
  const parsedData = new URLSearchParams(initData);
  const hash = parsedData.get('hash');
  const authDate = parsedData.get('auth_date');
  const userJson = parsedData.get('user');

  if (!hash || !authDate || !userJson) {
    throw new Error('Invalid Telegram data');
  }

  // 1. ساخت secretKey از توکن ربات
  const secretKey = crypto.createHash('sha256')
    .update(botToken)
    .digest();

  // 2. ساخت data_check_string
  const dataToCheck = [];
  parsedData.forEach((val, key) => {
    if (key !== 'hash') {
      dataToCheck.push(`${key}=${val}`);
    }
  });

  // 3. مرتب‌سازی پارامترها به ترتیب الفبایی
  dataToCheck.sort();

  // 4. ایجاد رشته برای بررسی
  const dataCheckString = dataToCheck.join('\n');

  // 5. محاسبه hash
  const computedHash = crypto.createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // 6. بررسی انقضا (حداکثر 1 روز)
  const isFresh = (Date.now() / 1000) - parseInt(authDate) < 86400;

  if (computedHash !== hash || !isFresh) {
    throw new Error('Invalid Telegram hash or expired');
  }

  return JSON.parse(userJson);
}
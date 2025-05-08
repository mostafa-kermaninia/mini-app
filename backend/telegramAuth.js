export default function validateTelegramData(initData, botToken) {
  const parsedData = new URLSearchParams(initData);
  const hash = parsedData.get('hash');
  const authDate = parsedData.get('auth_date');
  const userJson = parsedData.get('user');

  if (!hash || !authDate || !userJson) {
    throw new Error('Invalid Telegram data: Missing hash/auth_date/user');
  }

  // لاگ تمام پارامترهای دریافتی
  console.log('All Params:', Object.fromEntries(parsedData.entries()));

  const secretKey = crypto.createHash('sha256')
    .update(botToken)
    .digest();

  const dataToCheck = [];
  parsedData.forEach((val, key) => {
    if (key !== 'hash') {
      dataToCheck.push(`${key}=${val}`);
    }
  });

  dataToCheck.sort(); // مرتب‌سازی الفبایی
  const dataCheckString = dataToCheck.join('\n');

  // لاگ data_check_string برای بررسی
  console.log('dataCheckString:', dataCheckString);

  const computedHash = crypto.createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  console.log('Received hash:', hash);
  console.log('Computed hash:', computedHash);

  if (computedHash !== hash) {
    throw new Error(`Hash mismatch! Received: ${hash}, Computed: ${computedHash}`);
  }

  return JSON.parse(userJson);
}
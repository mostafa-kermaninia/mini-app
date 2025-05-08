import crypto from 'crypto';

export default function validateTelegramData(initData, botToken) {
  const parsedData = new URLSearchParams(initData);
  const hash = parsedData.get('hash');
  const authDate = parsedData.get('auth_date');
  const userJson = parsedData.get('user');

  if (!hash || !authDate || !userJson) {
    throw new Error('Invalid Telegram data');
  }

  const secretKey = crypto.createHash('sha256') 
    .update(botToken)
    .digest();

  const dataToCheck = [];
  parsedData.forEach((val, key) => {
    if (key !== 'hash') {
      dataToCheck.push(`${key}=${val}`);
    }
  });

  dataToCheck.sort();

  const dataCheckString = dataToCheck.join('\n');

  const computedHash = crypto.createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // const isFresh = (Date.now() / 1000) - parseInt(authDate) < 86400;

  if (computedHash !== hash) {
    throw new Error('Invalid Telegram hash or expired');
  }
  console.log('Received hash:', hash);
  console.log('Computed hash:', computedHash);

  return JSON.parse(userJson);
}
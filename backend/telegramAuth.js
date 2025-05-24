// import { validate } from "@tma.js/init-data-node";

// export default function validateTelegramData(rawInitData, bot_token) {
//   const initData = new URLSearchParams(rawInitData);
//   // const hash = parsedData.get('hash');
//   // const authDate = parsedData.get('auth_date');
//   const userJson = initData.get('user');

//   try {
//     validate(initData, bot_token);
//     console.log(userJson);
//     return userJson;
//   } catch (error) {
//     console.error(error);

//     return {
//       valid: false,
//       userJson,
//     };
//   }
// };

import { validate } from "@tma.js/init-data-node";

export default function validateTelegramData(rawInitData, botToken) {
  try {
    // 1. اعتبارسنجی داده‌ها با استفاده از کتابخانه
    validate(rawInitData, botToken); // پارامتر اول باید رشته خام باشد

    // 2. استخراج اطلاعات کاربر
    const initData = new URLSearchParams(rawInitData);
    const userJson = initData.get('user');

    // 3. تبدیل رشته JSON به شیء JavaScript
    const user = JSON.parse(userJson);

    // 4. بازگرداندن شیء کاربر
    return user;
  } catch (error) {
    console.error('Telegram data validation failed:', error);
    throw new Error('Authentication failed: Invalid Telegram data');
  }
}
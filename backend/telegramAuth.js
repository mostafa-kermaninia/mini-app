
import { validate } from "@tma.js/init-data-node";

export default function validateTelegramData(rawInitData, botToken) {
  try {
    console.log("polllllll");
    // 1. اعتبارسنجی داده‌ها با استفاده از کتابخانه
    validate(rawInitData, botToken); // پارامتر اول باید رشته خام باشد

    // 2. استخراج اطلاعات کاربر
    const initData = new URLSearchParams(rawInitData);
    const userJson = initData.get('user');

    // 3. تبدیل رشته JSON به شیء JavaScript
    const userData = JSON.parse(userJson);

    console.log(userData);


    // 4. بازگرداندن شیء کاربر
    return  userData;
  } catch (error) {
    console.error('Telegram data validation failed:', error);
    throw new Error('Authentication failed: Invalid Telegram data');
  }
}
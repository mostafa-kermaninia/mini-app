import { validate } from "@tma.js/init-data-node";

export const validateTelegramData = (rawInitData, bot_token) => {
  const initData = new URLSearchParams(rawInitData);
  // const hash = parsedData.get('hash');
  // const authDate = parsedData.get('auth_date');
  const userJson = initData.get('user');

  try {
    validate(initData, bot_token);
    return {
      valid: true,
      userJson,
    };
  } catch (error) {
    console.error(error);

    return {
      valid: false,
      userJson,
    };
  }
};


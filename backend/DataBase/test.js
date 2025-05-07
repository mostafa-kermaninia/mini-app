const User = require('./models/User');
const Reward = require('./models/Reward');
const Score = require('./models/Score');

async function createUser(userName) {
  try {
    const newUser = await User.create({
      username: userName,
    //   email: 'alireza@example.com',
    });
    console.log('User created:', newUser);
  } catch (error) {
    console.error('Error creating user:', error);
  }
}

async function addScoreToUser(userName, scoreValue) {
    try {
      // پیدا کردن کاربر با نام کاربری مشخص
      const user = await User.findOne({ where: { username: userName } });
  
      if (!user) {
        console.log(`cant find user with username : ${userName}`);
        return;
      }
  
      // ایجاد رکورد جدید امتیاز برای کاربر
      const score = await Score.create({
        score: scoreValue,
        user_id: user.id,
      });
  
      console.log(`score :${scoreValue} for  ${userName} added.`);
    } catch (error) {
      console.error('error in add score', error);
    }
  }

async function addRewardToUser(userName, rewardType, rewardValue) {
    try {
      // پیدا کردن کاربر با نام کاربری مشخص
      const user = await User.findOne({ where: { username: userName } });
  
      if (!user) {
        console.log(`cant find user with username : ${userName}`);
        return;
      }
  
      // ایجاد رکورد جدید جایزه برای کاربر
      const reward = await Reward.create({
        reward_type: rewardType,
        reward_value: rewardValue,
        user_id: user.id,
      });
  
      console.log(`this reward:  ${rewardType} with this value:  ${rewardValue}  for use:  ${userName}  added.`);
    } catch (error) {
      console.error('error in adding reward', error);
    }
  }
  
async function getUserScores(userName) {
    const user = await User.findOne({ where: { username: userName } });
    if (user) {
      const scores = await Score.findAll({
        where: { user_id: user.id },
      });
      console.log('Scores for user:', scores);
    }
  }
  
  
async function getUserRewards(userName) {
    const user = await User.findOne({ where: { username: userName } });
    if (user) {
      const rewards = await Reward.findAll({
        where: { user_id: user.id },
      });
      console.log('Rewards for user:', rewards);
    }
  }
  
  
// createUser("Mammad");
addScoreToUser("Mammad", 125);
addScoreToUser("Mammad", 1258);
addScoreToUser("Mammad", 12500);
// createUser("ali");

addScoreToUser("ali", 864);
//  createUser("aaaaa");

addScoreToUser("aaaaa", 68);
addScoreToUser("ali", 58);
getUserScores("Mammad");
// getUserScores();
// getUserRewards();

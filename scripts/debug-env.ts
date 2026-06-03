import * as dotenv from 'dotenv';
dotenv.config();

console.log('TEST_USER_EMAIL:', process.env.TEST_USER_EMAIL);
console.log('TEST_USER_PASSWORD:', process.env.TEST_USER_PASSWORD ? '✅ SET (' + process.env.TEST_USER_PASSWORD.length + ' chars)' : '❌ NOT SET');
console.log('BASE_URL:', process.env.BASE_URL);

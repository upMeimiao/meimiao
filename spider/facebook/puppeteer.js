/**
 * Created by dell on 2017/5/15.
 */
const puppeteer = require('puppeteer');

exports.Login = async (info, callback) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  let result;
  page.on('error', async (error) => {
    // console.log('error');
    result = { error: 'error' };
    callback(null, result);
    await browser.close();
  });
  await page.goto(info.loginAddr, { waitUntil: 'networkidle' });
  const $email = await page.$('#email');
  const $pwd = await page.$('#pass');
  await page.evaluate((el, name) => {
    el.value = name;
  }, $email, info.auth.email);
  await page.evaluate((el, pass) => {
    el.value = pass;
  }, $pwd, info.auth.pass);
  await page.waitFor('button[type="submit"]');
  const $loginbutton = await page.$('button[type="submit"]');
  await $loginbutton.click();
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  const $errorBox = await page.$('#error_box');
  if ($errorBox) {
    // console.log('emailError');
    // console.log(cookie);
    result = { error: 'emailError' };
    callback(null, result);
    await browser.close();
    return;
  }
  const cookies = await page.cookies();
  let cookie = '';
  for (const [index, elem] of cookies.entries()) {
    cookie += `${elem.name}=${elem.value};`
  }
  // console.log(cookie);
  result = { cookie };
  callback(null, result);
  // await page.screenshot({ path: 'facebook.png' });
  await browser.close();
};

// exports.Puppeteer = (info, callback) => {
//   Login(info, (err, result) => callback(err, result));
// };
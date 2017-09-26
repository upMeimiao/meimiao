/**
 * Created by dell on 2017/5/15.
 */
const puppeteer = require('puppeteer');

const email = process.argv[2];
const pass = process.argv[3];
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('error', async (error) => {
    console.log('error');
    await browser.close();
  });
  await page.goto('https://www.facebook.com/login.php?', { waitUntil: 'networkidle' });
  const $email = await page.$('#email');
  const $pwd = await page.$('#pass');
  await page.evaluate((el, name) => {
    el.value = name;
  }, $email, email);
  await page.evaluate((el, pass) => {
    el.value = pass;
  }, $pwd, pass);
  await page.waitFor('button[type="submit"]');
  const $loginbutton = await page.$('button[type="submit"]');
  await $loginbutton.click();
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  const $errorBox = await page.$('#error_box');
  if ($errorBox) {
    console.log('emailError');
    // console.log(cookie);
    await browser.close();
    return;
  }
  const cookies = await page.cookies();
  let cookie = '';
  for (const [index, elem] of cookies.entries()) {
    cookie += `${elem.name}=${elem.value};`
  }
  console.log(cookie);
  await page.screenshot({ path: 'facebook.png' });
  await browser.close();
})();

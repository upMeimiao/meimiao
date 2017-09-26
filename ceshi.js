/**
 * Created by dell on 2017/9/26.
 */
const puppeteer = require('puppeteer');
console.log(process.platform);
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('error', (error) => {
    console.log('---', error);
  });
  // page.on('response', async (data) => {
  //   console.log('///', data);
  // });
  await page.goto('https://www.facebook.com/login.php?', { waitUntil: 'networkidle' });
  const $email = await page.$('#email');
  const $pwd = await page.$('#pass');
  await page.evaluate((el, name) => {
    el.value = name;
  }, $email, '15910630070');
  await page.evaluate((el, pass) => {
    el.value = pass;
  }, $pwd, '15910630070');
  await page.waitFor('button[type="submit"]');
  const $loginbutton = await page.$('button[type="submit"]');
  await $loginbutton.click();
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  const $errorBox = await page.$('#error_box');
  if ($errorBox) {

  }
  console.log($errorBox);
  await page.screenshot({ path: 'facebook.png' });
  await browser.close();
})();

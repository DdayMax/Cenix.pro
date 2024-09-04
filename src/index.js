import puppeteer from "puppeteer";
import fs from "fs";

(async () => {
  const url = process.argv[2];
  const region = process.argv[3]
    ? process.argv[3].toLowerCase()
    : "Москва и область";

  if (!url || !region) {
    console.error("Пожалуйста, укажите URL и регион.");
    process.exit(1);
  }

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const ua =
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
  await page.setUserAgent(ua);
  await page.setViewport({
    width: 1200,
    height: 800,
  });

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page
    .locator('[class^="Region_region__"]', {
      visible: true,
    })
    .click();
  page.locator('[class^="UiRegionListBase_list__"]', {
    visible: true,
  });

  const links = await page.$$("[class^='UiRegionListBase_list__'] li");

  for (const link of links) {
    const text = await link.evaluate((el) => el.textContent.trim());
    if (text.toLowerCase().includes(region)) {
      await link.click();
      break;
    }
  }
  await page.waitForNavigation({ waitUntil: "load" });
  const productData = await page.evaluate(() => {
    const priceElement = document.querySelector(
      'div[class*="ProductPage_informationBlock"] div[class*="PriceInfo_root"] > span'
    );
    const oldPriceElement = document.querySelector(
      'div[class*="ProductPage_informationBlock"] div[class*="PriceInfo_root"] div[class*="PriceInfo_oldPrice__"] > span'
    );

    const ratingElement = document.querySelector(
      'a[class^="ActionsRow_stars"]'
    );
    const reviewsElement = document.querySelector(
      'a[class^="ActionsRow_reviews"]'
    );

    const price = priceElement ? priceElement.innerText : null;
    const oldPrice = oldPriceElement ? oldPriceElement.innerText : null;
    const rating = ratingElement ? ratingElement.innerText : null;
    const reviewsCount = reviewsElement
      ? reviewsElement.innerText.replace(/[^\d]/g, "")
      : null;

    return {
      price,
      oldPrice,
      rating,
      reviewsCount,
    };
  });

  let productInfo = `Цена: ${productData.price || "не указана"}\n`;
  if (productData.oldPrice) {
    productInfo += `Старая цена: ${productData.oldPrice}\n`;
  }
  productInfo += `Рейтинг: ${productData.rating || "нет рейтинга"}\n`;
  productInfo += `Количество отзывов: ${
    productData.reviewsCount || "нет отзывов"
  }\n`;

  fs.writeFileSync("product.txt", productInfo);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.evaluate(
    () =>
      (document.querySelector("#headerFirstRow").style.cssText =
        "position: static")
  );
  await page.screenshot({
    path: "screenshot.jpg",
    fullPage: true,
  });

  await browser.close();
})();

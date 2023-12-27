const {By, Builder, until} = require('selenium-webdriver');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
  
//const PROFILE_LINK = 'https://www.ebay.com/sch/i.html?item=285464377160&rt=nc&_trksid=p4429486.m3561.l161211&_ssn=roc_seller';

async function downloadImage(url, index, dirPath) {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });
        const filePath = path.resolve(dirPath, `image_${index}.jpg`);

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error("Error downloading the image:", error);
    }
}

function getProfileUrlInput(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

(async function run() {
  driver = await new Builder().forBrowser('chrome').build();
  let PROFILE_LINK = await getProfileUrlInput('Enter eBay profile url: ');
  try { 
    await driver.manage().window().setRect({width: 1920, height: 1080});
    await driver.get(PROFILE_LINK);

    let index = 0;
    let itemContainers = await driver.findElements(By.css('li.s-item.s-item__pl-on-bottom'));

    while (index < itemContainers.length) {
      //await driver.get(PROFILE_LINK);
      itemContainers = await driver.findElements(By.css('li.s-item.s-item__pl-on-bottom'));

      let item = itemContainers[index];
      let conditionElm = await item.findElement(By.className('SECONDARY_INFO'));
      let conditionText = await conditionElm.getText();
      let title = await item.findElement(By.css('span[role=heading]')).getText();
      console.log('title', title);
      let dirName = title.replace(/[\/:*?"<>|]/g, '_');
    

      if (conditionText.includes('Brand New')) {
          let dirPath = path.join(__dirname, 'downloads', dirName);
          fs.mkdirSync(dirPath, { recursive: true });  
          let textFilePath = path.join(dirPath, 'info.txt');
          fs.appendFileSync(textFilePath, title);

          const linkElm = await item.findElement(By.css('a[class=s-item__link]'));
          const url = await linkElm.getAttribute('href');

          await driver.get(url);
          const currentUrl = await driver.getCurrentUrl();
          fs.appendFileSync(textFilePath, currentUrl);
          let thumbnails = await driver.findElements(By.css('.ux-image-grid-item'));
          for (let thumbnail of thumbnails) {
            await driver.executeScript("arguments[0].scrollIntoView(true);", thumbnail);
            await driver.sleep(500);
            try {
              await thumbnail.click();
            } catch (err) {
              break;
            }
           
          }
          let imageCarouselDiv = await driver.findElement(By.css('.ux-image-carousel-container'));
          let images = await imageCarouselDiv.findElements(By.css('img'));

          for (let imgIndex = 0; imgIndex < images.length; imgIndex++) {
            let img = images[imgIndex];
            let src = await img.getAttribute('src');
            if (src) {
                await downloadImage(src, `${index}_${imgIndex}`, dirPath); // Unique filename for each image
                console.log(src);
            }
          }

          // After processing the images, go back to the profile link to process the next item
          await driver.get(PROFILE_LINK);
        }

        index++;
    }
  } catch (err) {
    console.log(err);
  } finally {
    await driver.quit();
  } 
}());

const express = require('express');
const multer  = require('multer');
const yauzl = require("yauzl");
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PORT = process.env.PORT || 8080;

const app = express()
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"))
});

let storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'tmp/uploads')
    },
    filename: (req, file, cb) => {
        console.log(file)
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const maxSize = 2 * 1024 * 1024 * 1024; /* 2 GB */

let uploadFile = multer({
    storage: storage,
    limits: { fileSize: maxSize }
  }).single("zipFile");

app.post('/upload', uploadFile, function (req, res, next) {
    res.send("Zip Uploaded");
    yauzl.open(req.file.path, {lazyEntries: true}, function(err, zipfile) {
        if (err) throw err;
        zipfile.readEntry();
        zipfile.on("entry", function(entry) {
          if (/index\.html/.test(entry.fileName)) {
            zipfile.openReadStream(entry, function(err, readStream) {
                if (err) throw err;
                let filePath = path.join('tmp/uploads/', 'index.html');
                readStream.pipe(fs.createWriteStream(filePath));

                readStream.on("end", function() {
                    zipfile.close();
                });
                readStream.pipe(process.stdout);

                (async () => {
                    const browser = await puppeteer.launch();
                    const page = await browser.newPage();
                    await page.setContent(fs.readFileSync(filePath, "utf8"), {waitUntil: 'domcontentloaded'});
                    await page.emulateMediaType('screen');
                    await page.pdf({path: 'output.pdf', format: 'A4'});
                    await browser.close();
                })();
            });
          } else {
            zipfile.readEntry();
          }
        });
    });
  })

  app.listen(PORT)
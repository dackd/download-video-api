const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
const port = process.env.PORT || 3000;

// Add middleware to parse JSON bodies
app.use(express.json());
app.use(cors());

app.post("/download-tiktok", async (req, res) => {
  console.log(req.body);
  const url = req.body.url;

  if (!url) {
    res.status(400).json({
      message: "URL is required",
    });
    return;
  }

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(url);

  // log the page title
  const title = await page.title();
  console.log(title);

  // get all video elements
  const videoElements = await page.$$("video source");

  // get src attribute of each source element
  const videoSrcs = await Promise.all(
    videoElements.map(async (videoElement) => {
      const src = await page.evaluate(
        (el) => el.getAttribute("src"),
        videoElement
      );
      return src;
    })
  );
  if (videoSrcs.length === 0) {
    res.status(404).json({
      message: "No video sources found",
    });
    return;
  }

  res.status(200).json({
    message: "Video sources retrieved successfully",
    videoSrcs: videoSrcs[0],
  });

  await browser.close();
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

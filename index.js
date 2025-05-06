const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const { execSync } = require("child_process");

// Try to install Chrome browser if it's not already installed
try {
  console.log("Checking if Chrome is installed for Puppeteer...");
  execSync("npx puppeteer browsers install chrome");
  console.log("Chrome installation checked/completed");
} catch (error) {
  console.warn("Could not install Chrome:", error.message);
}

const app = express();
const port = process.env.PORT || 3000;

// Add middleware to parse JSON bodies
app.use(express.json());
app.use(cors());

// Add a simple health check endpoint
app.get("/", (req, res) => {
  res.status(200).send("TikTok Downloader API is running!");
});

app.post("/download-tiktok", async (req, res) => {
  try {
    console.log("Request body:", req.body);
    const url = req.body.url;

    if (!url) {
      return res.status(400).json({
        message: "URL is required",
      });
    }

    // Configure Puppeteer with explicit executable path
    const browser = await puppeteer.launch({
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
      headless: "new",
      // Try to use Chrome from system path if available
      ignoreDefaultArgs: ["--disable-extensions"],
    });

    const page = await browser.newPage();

    // Set a reasonable timeout
    await page.setDefaultNavigationTimeout(60000);

    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: "networkidle2" });

    // log the page title
    const title = await page.title();
    console.log("Page title:", title);

    // get all video elements
    console.log("Looking for video elements...");
    const videoElements = await page.$$("video source");
    console.log(`Found ${videoElements.length} video elements`);

    if (videoElements.length === 0) {
      await browser.close();
      return res.status(404).json({
        message: "No video sources found",
      });
    }

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

    console.log("Video sources:", videoSrcs);

    await browser.close();

    return res.status(200).json({
      message: "Video sources retrieved successfully",
      videoSrcs: videoSrcs[0],
    });
  } catch (error) {
    console.error("Error occurred:", error);
    return res.status(500).json({
      message: "An error occurred while processing your request",
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

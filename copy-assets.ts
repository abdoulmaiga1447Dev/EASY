import fs from "fs";
import path from "path";

// Ensure destination directories exist
const destBase = path.join(process.cwd(), "src", "assets", "images");
const categories = ["all", "berline-premium", "suv-executive", "suv-prestige"];

categories.forEach(cat => {
  const catDir = path.join(destBase, cat);
  if (!fs.existsSync(catDir)) {
    fs.mkdirSync(catDir, { recursive: true });
    console.log(`Created directory: ${catDir}`);
  }
});

// Source images
const srcDir = path.join(process.cwd(), "img");
if (fs.existsSync(srcDir)) {
  const images = fs.readdirSync(srcDir).filter(file => file.endsWith(".jpg") || file.endsWith(".png") || file.endsWith(".jpeg"));
  console.log("Found source images in /img:", images);
  
  if (images.length > 0) {
    const distribution: { [key: string]: string[] } = {
      "all": [
        "pexels-cruz-in-portugal-36855175.jpg",
        "pexels-eddievaldes155-16288341.jpg",
        "pexels-giantasparagus-37576187.jpg",
        "pexels-holyson-h-2154634702-35336611.jpg"
      ],
      "berline-premium": [
        "pexels-maxavans-5058352.jpg",
        "pexels-talha-uguz-2156923509-34520604.jpg",
        "pexels-tviysempai-341982671-17534550.jpg"
      ],
      "suv-executive": [
        "pexels-vadutskevich-17000848.jpg",
        "pexels-zion-10029774.jpg",
        "pexels-cruz-in-portugal-36855175.jpg"
      ],
      "suv-prestige": [
        "pexels-eddievaldes155-16288341.jpg",
        "pexels-giantasparagus-37576187.jpg",
        "pexels-holyson-h-2154634702-35336611.jpg"
      ]
    };

    Object.keys(distribution).forEach(cat => {
      distribution[cat].forEach(imgName => {
        const srcPath = path.join(srcDir, imgName);
        const destPath = path.join(destBase, cat, imgName);
        if (fs.existsSync(srcPath)) {
          // Read from source and write to destination to ensure real binary content copy
          const data = fs.readFileSync(srcPath);
          fs.writeFileSync(destPath, data);
          console.log(`Successfully copied binary ${imgName} to category folder ${cat}`);
        } else {
          console.warn(`Source image ${imgName} does not exist in /img`);
        }
      });
    });
  } else {
    console.log("No images found in /img folder!");
  }
} else {
  console.log("/img folder not found!");
}

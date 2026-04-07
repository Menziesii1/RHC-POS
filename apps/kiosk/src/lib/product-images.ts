import caffeLatte from "../../assets/Latte.webp";
import icedCoffee from "../../assets/Iced Coffee Drink.png";
import mocha from "../../assets/mocha.png";
import redBull from "../../assets/Red Bull.png";
import frappuccino from "../../assets/frapuchino.webp";
import americano from "../../assets/Americano.png";
import hotChocolate from "../../assets/Hot Chocolate.png";
import italianSoda from "../../assets/Italian soda.webp";
import chai from "../../assets/Chai.webp";

// Maps keyword patterns to imported image assets.
// Add new entries here as you add more photos to apps/kiosk/assets/.
const IMAGE_MAP: Array<{ keywords: string[]; src: string }> = [
  { keywords: ["iced coffee", "cold brew", "dirty chai", "iced"], src: icedCoffee },
  { keywords: ["caffe latte", "caffe  latte", "latte"], src: caffeLatte },
  { keywords: ["mocha"], src: mocha },
  { keywords: ["red bull"], src: redBull },
  { keywords: ["frappuccino", "frappe", "frap"], src: frappuccino },
  { keywords: ["americano"], src: americano },
  { keywords: ["hot chocolate", "hot choc"], src: hotChocolate },
  { keywords: ["italian soda", "italian"], src: italianSoda },
  { keywords: ["chai"], src: chai },
];

export function getProductImage(productName: string): string | null {
  const lower = productName.toLowerCase();
  for (const entry of IMAGE_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.src;
    }
  }
  return null;
}

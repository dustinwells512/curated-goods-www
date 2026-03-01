export interface Item {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  price: string;
  category: string;
  description: string;
  details: string[];
  images: string[];
  imageAlt: string;
  hasDedicatedPage: boolean;
  externalUrl?: string;
  featured: boolean;
  status: "available" | "pending" | "sold";
}

export const items: Item[] = [
  {
    id: "sprinter-van",
    slug: "sprinter-van",
    title: "2020 Mercedes Sprinter Camper Van",
    subtitle: "Professional conversion — adventure-ready",
    price: "Contact for Price",
    category: "Vehicles",
    description:
      "A 2020 Mercedes Sprinter with a professional camper conversion by Tommy Camper Vans. Features a custom interior build with sleeping area, kitchenette, solar power, and ample storage. Perfect for weekend getaways or full-time van life.",
    details: [
      "2020 Mercedes Sprinter high-roof",
      "Professional Tommy Camper Vans conversion",
      "Sleeping area, kitchenette, solar system",
      "Well-maintained with full service records",
    ],
    images: [
      "/images/sprinter-hero.jpg",
      "/images/sprinter-interior.jpg",
      "/images/sprinter-exterior.jpg",
    ],
    imageAlt: "2020 Mercedes Sprinter camper van conversion",
    hasDedicatedPage: false,
    externalUrl: "https://sprinter.dustinwells.com",
    featured: true,
    status: "available",
  },
  {
    id: "piano",
    slug: "piano",
    title: "Custom Art Steinway Grand Piano",
    subtitle: "1955 Model L — One-of-a-kind hand-painted masterpiece",
    price: "$27,500",
    category: "Instruments",
    description:
      "A one-of-a-kind 1955 Steinway Model L grand piano featuring custom hand-painted artwork by Austin muralist Elenor Niz. Where music meets art — vibrant blues, turquoise, hand-painted lions, landscapes, and pop culture elements make this a true statement piece.",
    details: [
      "1955 Steinway Model L, Serial #348346",
      "5'10\" L x 57\" W x 36\" H",
      "88 fully functional keys",
      "Custom mixed media artwork by Elenor Niz",
      "Located in South Austin — viewing by appointment",
    ],
    images: [
      "/images/piano-hero.png",
      "/images/piano-lion.png",
      "/images/piano-studio.png",
    ],
    imageAlt: "Custom Art Steinway Grand Piano with hand-painted artwork",
    hasDedicatedPage: false,
    externalUrl: "https://piano.dustinwells.com",
    featured: true,
    status: "available",
  },
  {
    id: "dining-table",
    slug: "dining-table",
    title: "Solid Wood Dining Table",
    subtitle: "Seats 6, farmhouse style",
    price: "$450",
    category: "Furniture",
    description:
      "Solid wood farmhouse-style dining table that comfortably seats six. Beautiful natural grain with a warm finish. Minor surface wear consistent with use.",
    details: [
      "Solid wood construction",
      "Seats 6 comfortably",
      "Farmhouse style",
      "Dimensions: 72\" x 36\" x 30\"",
    ],
    images: [],
    imageAlt: "Solid wood farmhouse dining table",
    hasDedicatedPage: false,
    featured: false,
    status: "available",
  },
  {
    id: "bookshelf",
    slug: "bookshelf",
    title: "Mid-Century Bookshelf",
    subtitle: "Walnut finish, 5 shelves",
    price: "$200",
    category: "Furniture",
    description:
      "Stylish mid-century modern bookshelf with walnut finish. Five adjustable shelves provide ample storage for books, decor, and more.",
    details: [
      "Mid-century modern design",
      "Walnut finish",
      "5 adjustable shelves",
      "Dimensions: 36\" x 12\" x 72\"",
    ],
    images: [],
    imageAlt: "Mid-century modern bookshelf with walnut finish",
    hasDedicatedPage: false,
    featured: false,
    status: "available",
  },
  {
    id: "accent-chair",
    slug: "accent-chair",
    title: "Leather Accent Chair",
    subtitle: "Cognac leather, great condition",
    price: "$325",
    category: "Furniture",
    description:
      "Comfortable leather accent chair in cognac. Solid wood frame with genuine leather upholstery. A statement piece for any living space.",
    details: [
      "Genuine leather upholstery",
      "Cognac color",
      "Solid wood frame",
      "Excellent condition",
    ],
    images: [],
    imageAlt: "Cognac leather accent chair",
    hasDedicatedPage: false,
    featured: false,
    status: "available",
  },
  {
    id: "desk-lamp",
    slug: "desk-lamp",
    title: "Brass Desk Lamp",
    subtitle: "Vintage-style, adjustable arm",
    price: "$75",
    category: "Decor",
    description:
      "Beautiful brass desk lamp with adjustable arm and vintage styling. Works perfectly with a warm, ambient light.",
    details: [
      "Solid brass construction",
      "Adjustable arm",
      "Vintage styling",
      "Standard bulb socket",
    ],
    images: [],
    imageAlt: "Vintage brass desk lamp",
    hasDedicatedPage: false,
    featured: false,
    status: "available",
  },
];

export function getItemBySlug(slug: string): Item | undefined {
  return items.find((item) => item.slug === slug);
}

export function getFeaturedItems(): Item[] {
  return items.filter((item) => item.featured);
}

export function getItemsByCategory(category: string): Item[] {
  return items.filter((item) => item.category === category);
}

export function getCategories(): string[] {
  return [...new Set(items.map((item) => item.category))];
}

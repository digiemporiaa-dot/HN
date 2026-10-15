/**
 * The HN Medical System homepage and company details.
 *
 * Every statement is drawn from the catalogue or describes how ordering works;
 * there are no figures beyond the live product count, and no clients,
 * certifications or claims the catalogue does not make. Products and
 * categories are named by their catalogue name and resolved to ids by the
 * seeder.
 */

export type HomeSection = { type: string; content: Record<string, unknown>; design: Record<string, unknown> };

/** Products in the hero's floating cards, the bento grid and the endoscopy row. */
export const HOME_PRODUCTS = {
  cards: ["Laparoscopic Clip Applicator", "Laparoscopic Needle Holder", "Magnetic Trocar"],
  bento: [
    "Polymer Clip Applicator",
    "Maryland & Dissecting Forceps, 5 mm",
    "Laparoscopic Needle Holder",
    "Magnetic Trocar",
    "Laparoscopic Bipolar Forceps",
    "Veress Needle",
  ],
  endoscopy: [
    "HD Portable Endoscopy Unit ZMS-PS046A",
    "Portable FHD Endoscopy Unit SY-GW621",
    "Irrigation Pump SY-GWG200",
  ],
};

/** Catalogue pictures (public/images/hn/catalogue) the homepage uses. */
export const HOME_IMAGES = {
  hero: "polymer-clip-applicator",
  sets: "laparoscopy-set",
};

export function hnHomeSections(input: {
  heroImage: string;
  setsImage: string;
  cards: Array<{ title: string; detail: string; image: string; href: string }>;
  categories: string[];
  bento: string[];
  endoscopy: string[];
  productCount: number;
  setsHref: string;
}): HomeSection[] {
  const sections: Array<HomeSection | null> = [
    {
      type: "HERO",
      content: {
        overline: "HN Medical System · A surgical house",
        heading: "**Laparoscopy** instruments, / made for **precision**",
        subheading:
          "Clip applicators, graspers, needle holders, trocars and complete laparoscopy sets, with portable endoscopy systems and sterilization trays — from HN Medical System, Rohtak.",
        primaryLabel: "Explore the catalogue",
        primaryHref: "/products",
        secondaryLabel: "Request a quote",
        secondaryHref: "/rfq",
        image: input.heroImage,
        note: "",
        points: input.cards,
        statValue: input.productCount > 0 ? String(input.productCount) : "",
        statLabel: input.productCount > 0 ? "Products in the catalogue" : "",
        statDetail:
          input.productCount > 0
            ? "Every code from our catalogue, quoted to your requirement — singly or as a complete set."
            : "",
      },
      design: { layout: "editorial", background: "default", spacing: "compact", container: "wide" },
    },
    input.categories.length
      ? {
          type: "CATEGORY_GRID",
          content: {
            overline: "Our range",
            heading: "Open and laparoscopy instruments, / and the **systems around them**.",
            intro: "",
            items: input.categories,
            ctaLabel: "All categories",
            ctaHref: "/categories",
          },
          design: { layout: "standard", background: "pearl", spacing: "large", container: "wide" },
        }
      : null,
    input.bento.length
      ? {
          type: "PRODUCT_GRID",
          content: {
            overline: "Laparoscopy instruments",
            heading: "Engineered for **precision**.",
            items: input.bento,
            ctaLabel: "View all products",
            ctaHref: "/products",
          },
          design: { layout: "bento", background: "grey", spacing: "large", container: "wide" },
        }
      : null,
    {
      type: "IMAGE_TEXT",
      content: {
        image: input.setsImage,
        overline: "Instrument sets",
        heading: "From one instrument to a **complete set**.",
        body:
          "Every instrument carries the code printed in our catalogue, so a list of codes is all we need. Order a single instrument, replacement handles and inserts, or a complete set packed in a perforated sterilization tray marked HN Medical System.",
        points: [
          { title: "5 and 10 mm laparoscopy set with a 30° laparoscope" },
          { title: "3 mm instrument set" },
          { title: "Short instrument set, 200–250 mm" },
          { title: "Single-port laparoscopy system" },
        ],
        ctaLabel: "See the sets",
        ctaHref: input.setsHref,
      },
      design: { layout: "editorial", imagePosition: "left", background: "default", spacing: "large", container: "wide" },
    },
    {
      type: "ICON_CARDS",
      content: {
        overline: "Why HN Medical System",
        heading: "Instruments you can **order by code**.",
        intro: "",
        image: "",
        ctaLabel: "",
        ctaHref: "",
        items: [
          {
            title: "Φ3, Φ5 and Φ10 mm",
            body: "Instruments in each common shaft size, most with a 330 mm working length.",
            icon: "configuration",
            linkLabel: "",
            linkHref: "",
          },
          {
            title: "Takes apart for cleaning",
            body: "Detachable forceps separate into handle, outer tube and insert, with handles listed separately.",
            icon: "quality",
            linkLabel: "",
            linkHref: "",
          },
          {
            title: "One code per item",
            body: "Each item carries the code printed in our catalogue — quote it and we know exactly what you need.",
            icon: "documents",
            linkLabel: "",
            linkHref: "",
          },
          {
            title: "Sterilization trays",
            body: "Perforated trays with silicone holders keep a set together through cleaning, sterilization and storage.",
            icon: "assurance",
            linkLabel: "",
            linkHref: "",
          },
        ],
      },
      design: { columns: "4", cardStyle: "standard", background: "pearl", spacing: "large", container: "wide" },
    },
    input.endoscopy.length
      ? {
          type: "PRODUCT_GRID",
          content: {
            overline: "Endoscopy systems",
            heading: "Camera, light, monitor and recorder, / **in one unit**.",
            items: input.endoscopy,
            ctaLabel: "All endoscopy systems",
            ctaHref: "/products",
          },
          design: { layout: "editorial", background: "default", spacing: "xl", container: "wide" },
        }
      : null,
    {
      type: "PROCESS_STEPS",
      content: {
        overline: "How to order",
        heading: "From code list to **delivery**.",
        intro: "",
        items: [
          { title: "Choose", body: "Pick the instruments and their codes from our catalogue." },
          { title: "Send", body: "Send the codes and quantities through the quotation form, by phone or by email." },
          { title: "Quote", body: "We confirm the configuration and send you a quotation." },
          { title: "Deliver", body: "Your instruments are packed and dispatched." },
        ],
      },
      design: { background: "default", spacing: "large", container: "wide" },
    },
    {
      type: "CTA",
      content: {
        overline: "Start an enquiry",
        heading: "Send us your **code list**.",
        body: "A single instrument, replacement inserts or a complete set — tell us the codes and quantities and we will prepare your quotation.",
        primaryLabel: "Request a quote",
        primaryHref: "/rfq",
        secondaryLabel: "Contact us",
        secondaryHref: "/contact",
      },
      design: { background: "dark", align: "left", spacing: "xl", container: "wide" },
    },
  ];
  return sections.filter((section): section is HomeSection => section !== null);
}

/**
 * Company details as printed on the catalogue. Applied only where a setting is
 * blank or still holds the demo seeder's placeholder, so nothing an
 * administrator typed is overwritten.
 */
export const COMPANY_SETTINGS: Record<string, string | null> = {
  "company.name": "HN Medical System",
  "company.tagline": "A surgical house — open and laparoscopy instruments",
  "company.description":
    "HN Medical System is a surgical house in Rohtak, Haryana, supplying open and laparoscopy instruments, gynaecology instruments, portable endoscopy systems and sterilization trays.",
  "contact.email": "info@hnmedicalsystem.com",
  "contact.phone": "+91 98180 39441",
  "contact.address": "Office no. 6, Ground floor, Mansarover Colony\nRohtak, Haryana 124001",
  // The demo's hours were a placeholder; the catalogue gives none.
  "contact.hours": null,
  "seo.defaultTitle": "HN Medical System — Open & Laparoscopy Instruments",
  "seo.titleTemplate": "%s | HN Medical System",
};

/** What the demo seeder wrote into those settings. */
export const DEMO_SETTING_VALUES: Record<string, string> = {
  "company.name": "HN Medical",
  "company.description":
    "HN Medical provides advanced medical equipment and healthcare infrastructure solutions for hospitals, clinics, diagnostic centres and healthcare institutions across India.",
  "contact.email": "enquiries@hnmedical.example",
  "contact.address": "Corporate Office\nNew Delhi, India",
  "contact.hours": "Monday to Saturday, 9:30 am – 6:30 pm IST",
  "seo.defaultTitle": "HN Medical — Medical Equipment & Healthcare Infrastructure",
  "seo.titleTemplate": "%s | HN Medical",
};

/** The header menu, in place of the demo seeder's. */
export const HEADER_ITEMS: Array<[string, string]> = [
  ["Home", "/"],
  ["Products", "/products"],
  ["About", "/about"],
  ["Contact", "/contact"],
];

/** The demo seeder's header menu, recognised so only that one is replaced. */
export const DEMO_HEADER_ITEMS: Array<[string, string]> = [
  ["Home", "/"],
  ["Products", "/products"],
  ["Solutions", "/solutions"],
  ["About", "/about"],
  ["Support", "/support"],
  ["Contact", "/contact"],
];

/** Catalogue pictures the About page uses. */
export const ABOUT_IMAGES = {
  hero: "sterilization-tray",
  range: "laparoscopy-set",
};

/** The About page: who HN Medical System is and what it supplies, from the catalogue. */
export function hnAboutSections(input: { heroImage: string; rangeImage: string; productCount: number }): HomeSection[] {
  return [
    {
      type: "HERO",
      content: {
        overline: "About HN Medical System",
        heading: "A **surgical house** / in Rohtak",
        subheading:
          "HN Medical System supplies open and laparoscopy instruments, gynaecology instruments, portable endoscopy systems and sterilization trays to hospitals and surgeons.",
        primaryLabel: "Explore the catalogue",
        primaryHref: "/products",
        secondaryLabel: "Contact us",
        secondaryHref: "/contact",
        image: input.heroImage,
        note: "",
        points: [],
      },
      design: { layout: "standard", background: "default", spacing: "large", container: "wide" },
    },
    {
      type: "IMAGE_TEXT",
      content: {
        image: input.rangeImage,
        overline: "What we supply",
        heading: "Instruments for open and **laparoscopic** surgery.",
        body:
          `Our catalogue lists ${input.productCount > 0 ? `${input.productCount} products` : "our products"} by code: clip applicators and ligation, grasping and dissecting forceps, scissors, needle holders, trocars and access, suction and irrigation, electrosurgery, retractors and complete instrument sets in Φ3, Φ5 and Φ10 mm.\n\nAlongside the instruments we supply uterine manipulators and gynaecology forceps, portable HD and Full HD endoscopy units, a camera system, an irrigation pump, and perforated sterilization trays to keep each set together.`,
        points: [
          { title: "Laparoscopy instruments" },
          { title: "Gynaecology instruments" },
          { title: "Endoscopy systems" },
          { title: "Sterilization trays" },
        ],
        ctaLabel: "View all products",
        ctaHref: "/products",
      },
      design: { layout: "editorial", imagePosition: "right", background: "default", spacing: "large", container: "wide" },
    },
    {
      type: "ICON_CARDS",
      content: {
        overline: "Working with us",
        heading: "Built around the **catalogue code**.",
        intro: "",
        image: "",
        ctaLabel: "",
        ctaHref: "",
        items: [
          {
            title: "Order by code",
            body: "Each item carries the code printed in our catalogue, so a list of codes and quantities is all we need to quote.",
            icon: "documents",
            linkLabel: "",
            linkHref: "",
          },
          {
            title: "Spares and replacement parts",
            body: "Sealing caps and rings, reducers, handles and inserts are listed separately, so a set can be kept in service.",
            icon: "configuration",
            linkLabel: "",
            linkHref: "",
          },
          {
            title: "Complete sets",
            body: "5 and 10 mm, 3 mm and short 200–250 mm laparoscopy sets, and a single-port system.",
            icon: "portfolio",
            linkLabel: "",
            linkHref: "",
          },
          {
            title: "Endoscopy systems",
            body: "Portable units that combine an HD camera, LED light source, monitor and recorder.",
            icon: "clinical",
            linkLabel: "",
            linkHref: "",
          },
        ],
      },
      design: { columns: "4", cardStyle: "standard", background: "pearl", spacing: "large", container: "wide" },
    },
    {
      type: "CTA",
      content: {
        overline: "Get in touch",
        heading: "Talk to **HN Medical System**.",
        body: "Call +91 98180 39441, write to info@hnmedicalsystem.com, or send your code list for a quotation. Office no. 6, Ground floor, Mansarover Colony, Rohtak, Haryana 124001.",
        primaryLabel: "Request a quote",
        primaryHref: "/rfq",
        secondaryLabel: "Contact us",
        secondaryHref: "/contact",
      },
      design: { background: "dark", align: "left", spacing: "xl", container: "wide" },
    },
  ];
}

/**
 * Specialties and solutions for HN Medical System.
 *
 * Specialties are the ones the catalogue itself names: the endoscopy units are
 * listed for laparoscopy, gynaecology, urology, ENT and orthopaedics, and the
 * irrigation pump for orthopaedics, gynaecology and urology. Products and
 * categories are named by their catalogue name; the seeder resolves them.
 * Pictures are photographs in public/images/hn/catalogue, since these pages
 * show their picture as a wide banner.
 */

export type TaxonomyEntry = {
  name: string;
  short: string;
  description: string;
  image: string;
  imageAlt: string;
  featured?: boolean;
  categories: string[];
  products: string[];
};

const ENDOSCOPY_UNITS = [
  "HD Portable Endoscopy Unit ZMS-PS046A",
  "Portable FHD Endoscopy Unit SY-GW621",
  "Portable HD Endoscopy Unit SY-GW605",
];
const PUMP = "Irrigation Pump SY-GWG200";

export const HN_SPECIALTIES: TaxonomyEntry[] = [
  {
    name: "Laparoscopic Surgery",
    featured: true,
    image: "laparoscopy-set",
    imageAlt: "Laparoscopy instruments: trocars, graspers and a needle holder",
    short: "Clip applicators, graspers, needle holders, trocars and complete sets for laparoscopic surgery.",
    description:
      "Everything in our laparoscopy range: clip applicators and ligation, grasping and dissecting forceps, scissors, needle holders, trocars and access, suction and irrigation, electrosurgery, retractors and complete sets in Φ3, Φ5 and Φ10 mm.\n\nWith them, the portable endoscopy units and camera system for the operating view, and perforated sterilization trays to keep each set together.",
    categories: ["Laparoscopy Instruments", "Endoscopy Systems", "Sterilization & Storage"],
    products: ["*Laparoscopy Instruments", ...ENDOSCOPY_UNITS, "Full HD Endoscopy Camera System NCM-S200", "Laparoscopy Instrument Sterilization Tray"],
  },
  {
    name: "Gynaecology",
    featured: true,
    image: "veress-needles",
    imageAlt: "Veress needles",
    short: "Uterine manipulators, gynaecology operating forceps, micro forceps, endoscopy units and an irrigation pump.",
    description:
      "Instruments for gynaecological laparoscopy: uterine manipulators with interchangeable tips and cups, operating forceps for gynaecology and fine Φ1.6 and Φ2.0 mm micro forceps, with oviduct graspers and Veress needles from the laparoscopy range.\n\nThe portable endoscopy units and the irrigation pump are listed in our catalogue for gynaecology.",
    categories: ["Gynaecology Instruments", "Endoscopy Systems"],
    products: [
      "*Gynaecology Instruments",
      "Atraumatic Grasping Forceps, 5 mm",
      "Veress Needle",
      ...ENDOSCOPY_UNITS,
      PUMP,
    ],
  },
  {
    name: "Urology",
    image: "suction-irrigation-set",
    imageAlt: "Suction and irrigation tubes",
    short: "Portable endoscopy units and an irrigation pump listed for urology.",
    description:
      "Our portable HD and Full HD endoscopy units — camera, LED light source, monitor and recorder in one — and the two-channel irrigation pump are listed in our catalogue for urology.",
    categories: ["Endoscopy Systems"],
    products: [...ENDOSCOPY_UNITS, PUMP],
  },
  {
    name: "ENT",
    image: "ncm-s200",
    imageAlt: "Full HD endoscopy camera system",
    short: "Portable endoscopy units listed for ENT.",
    description:
      "Our portable HD and Full HD endoscopy units are listed in our catalogue for ENT. Each combines an endoscope camera, LED light source, monitor and recorder, and the SY-GW621 has an ENT mode.",
    categories: ["Endoscopy Systems"],
    products: ENDOSCOPY_UNITS,
  },
  {
    name: "Orthopaedics",
    image: "sterilization-tray-lid",
    imageAlt: "Sterilization tray lid marked HN Medical System, Rohtak",
    short: "Portable endoscopy units and an irrigation pump listed for orthopaedics.",
    description:
      "Our portable HD and Full HD endoscopy units and the two-channel irrigation pump, with a pressure range of 15–400 mmHg, are listed in our catalogue for orthopaedics.",
    categories: ["Endoscopy Systems"],
    products: [...ENDOSCOPY_UNITS, PUMP],
  },
];

export const HN_SOLUTIONS: TaxonomyEntry[] = [
  {
    name: "Complete Laparoscopy Sets",
    featured: true,
    image: "sterilization-tray",
    imageAlt: "Perforated sterilization tray with lid and silicone instrument holders",
    short: "5 and 10 mm, 3 mm and short instrument sets, a single-port system and trays to keep them together.",
    description:
      "Complete laparoscopy sets built from our catalogue codes: a 5 and 10 mm set with a 30° laparoscope, a 3 mm set, a short 200–250 mm set and a single-port system, with a training box for practice.\n\nEach set can be quoted as listed or adjusted to the procedures you perform, and packed in a perforated sterilization tray with silicone instrument holders.",
    categories: ["Laparoscopy Instruments", "Sterilization & Storage"],
    products: [
      "Laparoscopy Instrument Set",
      "3 mm Laparoscopy Instrument Set",
      "Short Laparoscopy Instrument Set, 200–250 mm",
      "Single-Port Laparoscopy System",
      "Laparoscopic Simulation System",
      "Laparoscopy Instrument Sterilization Tray",
    ],
  },
  {
    name: "Portable Endoscopy Systems",
    featured: true,
    image: "ncm-s200",
    imageAlt: "Full HD endoscopy camera system",
    short: "Portable units with camera, LED light source, monitor and recorder, a Full HD camera system and an irrigation pump.",
    description:
      "Portable endoscopy units that combine an endoscope camera, LED light source, monitor and recorder in one case — HD and Full HD, with 17- and 21-inch screens — together with the NCM-S200 Full HD camera system and the SY-GWG200 irrigation pump.\n\nQuotations list the unit, camera head, light cable and accessories.",
    categories: ["Endoscopy Systems"],
    products: [...ENDOSCOPY_UNITS, "Full HD Endoscopy Camera System NCM-S200", PUMP],
  },
  {
    name: "Spares & Replacement Parts",
    image: "suction-irrigation-set",
    imageAlt: "Suction and irrigation tubes",
    short: "Sealing caps and rings, reducers, handles, clips, electrodes and cables, ordered by code.",
    description:
      "The parts that keep a laparoscopy set in service, each with its own catalogue code: trocar sealing caps and rings from Φ3 to Φ10.5 mm, reducers, detachable forceps handles, polymer ligating clips and bulldog clips, monopolar electrodes, and monopolar cables and connectors.",
    categories: ["Laparoscopy Instruments"],
    products: [
      "Trocar Sealing Caps & Rings",
      "Trocar Reducer",
      "Detachable Operating Forceps & Handles",
      "Polymer Ligating Clips",
      "Laparoscopic Bulldog Clamp Applier & Clips",
      "Monopolar Electrodes",
      "Monopolar Cable & Connectors",
    ],
  },
];

/**
 * Demo articles, pages and city content. Practical procurement guidance only:
 * nothing here diagnoses, recommends a treatment or claims an outcome.
 */

export type DemoPost = {
  title: string;
  excerpt: string;
  image: string;
  author: string;
  featured?: boolean;
  daysAgo: number;
  /** Rich-text blocks; each becomes a section. `## ` starts a headed block. */
  body: string[];
  faqs?: Array<[string, string]>;
};

export const POSTS: DemoPost[] = [
  {
    title: "How to Plan Medical Equipment Procurement for a New Hospital",
    excerpt:
      "A practical framework for turning clinical plans into an equipment list, budget and phased procurement schedule.",
    image: "corridor",
    author: "HN Medical Projects Team",
    featured: true,
    daysAgo: 3,
    body: [
      "Equipping a new hospital is one of the largest single purchasing exercises a healthcare institution undertakes. The decisions made during planning shape clinical workflows, maintenance costs and the patient experience for a decade or more. A structured approach keeps the project on schedule and avoids costly late changes.",
      "## Start with the clinical brief\nBegin with the services the hospital will offer: bed numbers by department, theatre count and specialities, critical care capacity and diagnostic services. Each department's clinical lead should confirm the procedures and patient volumes the equipment must support. This brief becomes the reference for every equipment decision that follows.",
      "## Build a room-by-room equipment list\nTranslate the brief into a room data sheet for each space — ICU bay, operating theatre, recovery, emergency resuscitation, wards and diagnostics. For each room, list the equipment, quantity and any mounting requirements such as ceiling pendants or wall rails. Grouping items by room makes coordination with architects and MEP consultants far simpler.",
      "## Coordinate with infrastructure early\nCeiling-mounted lights and pendants need structural support; ICU and theatre equipment depends on medical gas outlets, electrical capacity and network points. Sharing preliminary equipment data with your architects early prevents rework once construction is underway.",
      "## Phase procurement sensibly\nNot every item needs to arrive at the same time. Large fixed equipment is usually procured first because it affects construction, followed by mobile equipment closer to commissioning. A phased schedule eases cash flow and storage, and reduces the risk of equipment sitting idle before the building is ready.",
      "## Plan for installation, training and service\nInclude installation, commissioning and user orientation in your quotations, and agree service arrangements before handover. Biomedical engineering teams should have documentation for every device, and clinical teams should be trained before the first patient arrives.",
    ],
    faqs: [
      ["When should equipment planning start?", "Ideally during design development, so mounting, gas and electrical requirements can be built into the drawings."],
      ["Can procurement be split across several suppliers?", "Yes. Many projects combine suppliers; a consolidated equipment list helps keep specifications consistent across them."],
    ],
  },
  {
    title: "Essential ICU Equipment Checklist",
    excerpt:
      "The core equipment groups to plan for when setting up or upgrading an intensive care unit, bay by bay.",
    image: "icu",
    author: "HN Medical Clinical Applications",
    daysAgo: 9,
    body: [
      "An intensive care unit brings together some of the most demanding equipment in a hospital. Planning by bed space, and then by the shared resources of the unit, gives a clear and complete list.",
      "## At every bed\nMost ICU bed spaces are planned around a motorised ICU bed, a multi-parameter patient monitor, an ICU ventilator, infusion and syringe pumps, suction, and medical gas outlets — often delivered through a ceiling pendant or bed-head unit.",
      "## Shared across the unit\nA central monitoring station, a crash cart with defibrillator, a transport ventilator and monitor for transfers, and point-of-care diagnostic equipment are typically shared between beds. Storage, cleaning and charging areas should be planned for them too.",
      "## Questions to settle before quoting\nHow many beds need ventilators? Will pendants or wall rails carry equipment? Which parameters are required on every monitor, and which only on some beds? Clear answers make quotations comparable and prevent under- or over-specification.",
      "## Plan the support\nConfirm installation scope, user orientation and service arrangements for each equipment group, and keep documentation together for the biomedical engineering team.",
    ],
  },
  {
    title: "Key Factors When Selecting a Patient Monitor",
    excerpt:
      "Parameters, display, connectivity and mounting — the questions that make patient monitor quotations easy to compare.",
    image: "station",
    author: "HN Medical Clinical Applications",
    daysAgo: 16,
    body: [
      "Patient monitors range from compact transport units to fully configurable critical care systems. Comparing them is easier when the requirement is defined first.",
      "## Define the parameters per department\nGeneral wards may only need ECG, SpO₂ and NIBP, while ICUs and theatres often require invasive pressure, EtCO₂ and additional channels. Listing parameters by department avoids paying for modules that will never be used.",
      "## Consider display and usability\nScreen size, the number of waveforms and how quickly staff can review trends all matter in a busy unit. Ask for a demonstration with your clinical team where possible.",
      "## Plan connectivity and central monitoring\nIf beds will be viewed from a nurses' station, confirm network requirements, central station capacity and how alarms are reviewed.",
      "## Think about mounting and transfers\nBedside shelves, wall brackets, pendants or rolling stands each suit different layouts. Transport monitors or modules help when patients move between departments.",
    ],
  },
  {
    title: "Planning an Operation Theatre: Lights, Tables and Pendants",
    excerpt:
      "How surgical lights, operating tables and ceiling pendants are planned together for a modern theatre.",
    image: "ot",
    author: "HN Medical Projects Team",
    daysAgo: 24,
    body: [
      "The fixed equipment in an operating theatre — surgical lights, ceiling pendants and the operating table — is planned together because each affects the others and the room itself.",
      "## Ceiling coordination\nLights and pendants are mounted to the structure above the ceiling. Their positions, arm lengths and loads should be agreed with the architect and structural engineer before the ceiling is closed.",
      "## Matching the table to the case mix\nGeneral, orthopaedic and gynaecological surgery each need different positioning accessories. Radiolucent tabletops help where intra-operative imaging is planned.",
      "## Gas, power and data\nPendant outlet configurations should reflect the anaesthesia and surgical equipment that will be used, including spare capacity for future additions.",
    ],
  },
  {
    title: "Setting Up a Newborn Care Unit: Equipment Considerations",
    excerpt:
      "Warmers, incubators, phototherapy and infusion — planning equipment for special newborn care units and NICUs.",
    image: "nicu",
    author: "HN Medical Clinical Applications",
    daysAgo: 33,
    body: [
      "Newborn care units need equipment that supports thermal care, monitoring and precise infusion in a calm environment.",
      "## Thermal care\nRadiant warmers support resuscitation and procedures, while incubators provide a controlled environment for longer stays. The mix depends on the unit's level of care and expected admissions.",
      "## Phototherapy and infusion\nLED phototherapy units and syringe pumps suited to low-volume infusions are standard items in most units.",
      "## Space and power\nAllow for power outlets, oxygen and suction at each cot space, and for quiet, uncluttered access around every infant.",
    ],
  },
  {
    title: "Preparing a Clear Quotation Request for Medical Equipment",
    excerpt:
      "What to include in a request for quotation so suppliers can respond accurately — and quotes can be compared fairly.",
    image: "ward",
    author: "HN Medical Sales Team",
    daysAgo: 41,
    body: [
      "A well-prepared request for quotation saves time on both sides and makes it far easier to compare offers.",
      "## Be specific about quantities and departments\nList each item with its quantity and the department or room it is for. Where the same device is needed in several places, say so — configurations often differ between departments.",
      "## State configuration and accessories\nInclude required parameters, modules, mounting and accessories. If you are open to alternatives, say which features are essential and which are preferred.",
      "## Include installation and timelines\nState whether installation, training and service plans should be included, and when the equipment is needed on site.",
      "## Use a single list\nOn this website you can add products to a quotation list and send them together in one request — ideal for department or project requirements.",
    ],
  },
];

export const ABOUT = {
  hero: {
    overline: "About HN Medical",
    heading: "Medical technology **partners** / for healthcare institutions",
    subheading:
      "HN Medical provides advanced medical equipment and healthcare infrastructure solutions for hospitals, clinics, diagnostic centres and healthcare institutions across India.",
  },
  story: {
    overline: "Who we are",
    heading: "Equipment expertise. Procurement discipline. Long-term support.",
    body:
      "We work with hospital owners, administrators, clinicians and biomedical engineers to plan, source and support the equipment their departments depend on.\n\nOur portfolio spans patient monitoring, critical care, operation theatres, anaesthesia, diagnostics, respiratory and neonatal care, emergency care and hospital furniture — so a single team can coordinate a complete department or a whole facility.",
    points: [
      "Multi-category equipment portfolio",
      "Specification and tender support",
      "Installation and user orientation",
      "Service coordination after handover",
    ],
  },
};

export const CITIES = [
  { name: "New Delhi", state: "Delhi", slug: "new-delhi", image: "corridor" },
  { name: "Mumbai", state: "Maharashtra", slug: "mumbai", image: "icu" },
  { name: "Pune", state: "Maharashtra", slug: "pune", image: "diagnostics" },
  { name: "Bengaluru", state: "Karnataka", slug: "bengaluru", image: "ot" },
  { name: "Chennai", state: "Tamil Nadu", slug: "chennai", image: "ward" },
  { name: "Hyderabad", state: "Telangana", slug: "hyderabad", image: "station" },
  { name: "Kolkata", state: "West Bengal", slug: "kolkata", image: "emergency" },
  { name: "Ahmedabad", state: "Gujarat", slug: "ahmedabad", image: "icu-b" },
  { name: "Lucknow", state: "Uttar Pradesh", slug: "lucknow", image: "nicu" },
  { name: "Jaipur", state: "Rajasthan", slug: "jaipur", image: "ot-b" },
];

export const CITY_FAQS = [
  ["Do you supply equipment to hospitals in {city}?", "Yes. We supply hospitals, clinics and diagnostic centres in {city} and the surrounding region, from single items to complete department packages."],
  ["Can installation be arranged in {city}?", "Installation, commissioning and user orientation can be included in your quotation and are scheduled with your team."],
  ["How do I request a quotation?", "Use the enquiry button on this page or build a quotation list from the catalogue and send it as one request."],
];

export const POLICY = (title: string) =>
  `This ${title.toLowerCase()} explains how HN Medical handles information in connection with this website and our services.\n\n**Information we collect.** When you send an enquiry or request a quotation, we collect the details you provide — such as your name, organisation, email address, phone number and the products you are interested in — so that we can respond.\n\n**How we use it.** We use enquiry information to respond to your request, prepare quotations and follow up on your requirement. We do not sell personal information.\n\n**Your choices.** You can ask us to update or delete the information you have shared by [contacting us](/contact).\n\n*This page is a template for demonstration and should be replaced with a policy reviewed by your legal adviser before launch.*`;

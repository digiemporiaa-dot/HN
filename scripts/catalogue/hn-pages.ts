/**
 * Support, privacy and terms pages for HN Medical System.
 *
 * The privacy policy describes what this website actually collects: the
 * enquiry, quotation and download forms (src/server/leads), the IP address
 * and browser recorded with a submission, the quotation list and closed
 * popups kept in the visitor's browser, and Google Analytics or Tag Manager
 * only where an administrator has configured them. Nothing here promises a
 * warranty, response time or repair service the company has not stated.
 */

import type { HomeSection } from "./hn-homepage";

export const COMPANY = {
  name: "HN Medical System",
  address: "Office no. 6, Ground floor, Mansarover Colony, Rohtak, Haryana 124001",
  phone: "+91 98180 39441",
  phoneHref: "tel:+919818039441",
  email: "info@hnmedicalsystem.com",
};

export const SUPPORT_IMAGE = "sterilization-tray-lid";

const narrow = (spacing = "compact") => ({ container: "narrow", spacing });

/** One heading and its paragraphs, as the rich-text section stores them. */
const text = (heading: string, paragraphs: string[], first = false): HomeSection => ({
  type: "RICH_TEXT",
  content: { heading, body: paragraphs.join("\n\n") },
  design: narrow(first ? "large" : "compact"),
});

const contactLine = `**${COMPANY.name}**, ${COMPANY.address}. Email [${COMPANY.email}](mailto:${COMPANY.email}), phone [${COMPANY.phone}](${COMPANY.phoneHref}).`;

export function hnSupportSections(input: { heroImage: string }): HomeSection[] {
  return [
    {
      type: "HERO",
      content: {
        overline: "Support",
        heading: "Support for your **instruments**",
        subheading:
          "Spare parts, replacement inserts and help finding the right code. Contact HN Medical System with the code of the instrument you have and what you need.",
        primaryLabel: "Contact us",
        primaryHref: "/contact",
        secondaryLabel: "Request a quote",
        secondaryHref: "/rfq",
        image: input.heroImage,
        note: "",
        points: [],
      },
      design: { layout: "standard", background: "default", spacing: "large", container: "wide" },
    },
    {
      type: "ICON_CARDS",
      content: {
        overline: "What we can help with",
        heading: "Keeping your instruments **in service**.",
        intro: "",
        image: "",
        ctaLabel: "",
        ctaHref: "",
        items: [
          {
            title: "Spare and replacement parts",
            body: "Sealing caps and rings, reducers, handles, inserts and electrode tips are listed by code in our catalogue and can be ordered on their own.",
            icon: "configuration",
            linkLabel: "Sealing caps & rings",
            linkHref: "/products/trocar-sealing-caps-rings",
          },
          {
            title: "Finding the right code",
            body: "Tell us the instrument you use now or the procedure it is for, and we will point you to the matching codes.",
            icon: "consultation",
            linkLabel: "",
            linkHref: "",
          },
          {
            title: "Completing a set",
            body: "Add instruments to a set you already have, or have a new set packed in a perforated sterilization tray.",
            icon: "portfolio",
            linkLabel: "Instrument sets",
            linkHref: "/categories/laparoscopy-instruments/laparoscopy-sets-systems",
          },
          {
            title: "Endoscopy systems",
            body: "For the portable endoscopy units, camera system and irrigation pump, include the model and serial number with your request.",
            icon: "clinical",
            linkLabel: "Endoscopy systems",
            linkHref: "/categories/endoscopy-systems",
          },
        ],
      },
      design: { columns: "4", cardStyle: "standard", background: "pearl", spacing: "large", container: "wide" },
    },
    {
      type: "PROCESS_STEPS",
      content: {
        overline: "Raising a request",
        heading: "How a support request **works**.",
        intro: "",
        items: [
          { title: "Identify", body: "Find the code of the instrument or part on this website, in our catalogue or on your invoice." },
          { title: "Contact", body: `Call ${COMPANY.phone} or email ${COMPANY.email} with the code, the quantity and what you need.` },
          { title: "Confirm", body: "We confirm the part or the next step, with a quotation where one is needed." },
          { title: "Dispatch", body: "The part or instrument is packed and dispatched to you." },
        ],
      },
      design: { background: "default", spacing: "large", container: "wide" },
    },
    {
      type: "FAQ",
      content: {
        overline: "Questions",
        heading: "Support questions.",
        intro: "",
        items: [
          {
            question: "Where do I find an instrument's code?",
            answer:
              "Every product on this website lists its codes — for example 101-001 for the Φ10 × 330 mm clip applicator — and they are the same codes as in our printed catalogue. If you cannot find it, send us a photograph of the instrument with your request.",
          },
          {
            question: "Can I order a single replacement part?",
            answer:
              "Yes. Sealing caps and rings, reducers, handles, inserts and electrode tips can be quoted individually by code.",
          },
          {
            question: "How should the instruments be cleaned and sterilized?",
            answer:
              "Follow the instructions supplied with the instrument and your hospital's reprocessing procedure. Detachable instruments are taken apart before cleaning. If you need the instructions for a particular code, ask us.",
          },
          {
            question: "What if an instrument is faulty?",
            answer:
              "Contact us with the code, your invoice details and a short description or photograph of the fault, and we will tell you the next step. Warranty terms are those set out in your quotation and invoice.",
          },
        ],
      },
      design: { layout: "split", spacing: "large", container: "wide" },
    },
    {
      type: "CTA",
      content: {
        overline: "Need a part?",
        heading: "Talk to **HN Medical System**.",
        body: `Call ${COMPANY.phone} or write to ${COMPANY.email} with the code you need.`,
        primaryLabel: "Contact us",
        primaryHref: "/contact",
        secondaryLabel: "Browse products",
        secondaryHref: "/products",
      },
      design: { background: "dark", align: "left", spacing: "xl", container: "wide" },
    },
  ];
}

export function hnPrivacySections(input: { updated: string }): HomeSection[] {
  return [
    text(
      "Privacy policy",
      [
        `*Last updated ${input.updated}.*`,
        `This policy explains how ${COMPANY.name} ("we", "us") collects and uses personal data through this website, and the choices you have. ${contactLine}`,
      ],
      true,
    ),
    text("Information you give us", [
      "When you send an enquiry, request a quotation, ask for a document or contact us, we collect the details you enter: your name, email address, phone number, organisation, city and message, and the products and quantities you list.",
      "Forms that ask for your agreement record when you agreed and the wording you agreed to.",
    ]),
    text("Information collected automatically", [
      "With each submission we record your IP address and browser type, the page you sent it from, and any campaign tags in the link that brought you here. We use these to answer your request, to see which pages people use, and to stop spam and abuse.",
      "Where we have switched on Google Analytics or Google Tag Manager, they set cookies to measure visits to the website. Google processes that data under its own privacy policy.",
    ]),
    text("Information kept in your browser", [
      "Your quotation list, and the popups you have closed, are stored in your own browser. They are not sent to us until you submit a request, and you can clear them at any time by clearing your browser's site data.",
    ]),
    text("How we use your information", [
      "We use it to reply to you, prepare quotations, follow up on your enquiry, supply and invoice what you order, keep our records, improve the website and protect it from misuse, and meet our legal obligations.",
      "We do not sell your personal data, and we do not use it for purposes unrelated to your enquiry without your consent.",
    ]),
    text("Who we share it with", [
      "Your information is seen by the staff who handle enquiries and orders. It is also processed on our behalf by the providers that host this website and its database and deliver our email, and by Google where analytics are switched on. We disclose information to authorities when the law requires it.",
    ]),
    text("How long we keep it", [
      "We keep enquiry and quotation records for as long as we need them to deal with your request and any order that follows, and to meet our legal, tax and accounting obligations. After that they are deleted. Backups of the website are overwritten on a rolling schedule.",
    ]),
    text("Security", [
      "Access to enquiry records is limited to authorised staff with individual accounts, and the website is served over an encrypted connection. No system is completely secure, but we take reasonable steps to protect your information.",
    ]),
    text("Your rights", [
      "Under the Digital Personal Data Protection Act, 2023 and other applicable law, you can ask to see the personal data we hold about you, have it corrected or erased, withdraw consent you have given, and raise a grievance about how we have handled it.",
      `To do so, email [${COMPANY.email}](mailto:${COMPANY.email}) or write to us at ${COMPANY.address}. We will respond within a reasonable time.`,
    ]),
    text("Children", ["This website is meant for healthcare professionals and institutions. It is not directed at children, and we do not knowingly collect their data."]),
    text("Changes to this policy", ["We may update this policy. The date at the top shows when it last changed."]),
  ];
}

export function hnTermsSections(input: { updated: string }): HomeSection[] {
  return [
    text(
      "Terms of use",
      [
        `*Last updated ${input.updated}.*`,
        `These terms apply to your use of this website, operated by ${COMPANY.name}. By using the website you accept them. ${contactLine}`,
      ],
      true,
    ),
    text("Product information", [
      "Product descriptions, codes, specifications and pictures are taken from our catalogue and are given for general information. Pictures may be illustrative, and specifications may change; the quotation confirms the exact item you will receive.",
      "Our products are intended for use by qualified healthcare professionals. Nothing on this website is medical advice.",
    ]),
    text("Quotations and orders", [
      "The website does not show prices. Sending an enquiry or a quotation request does not place an order. Prices, availability, delivery and payment terms are set out in the quotation we send you, and a contract is formed only when we accept your order in writing on those terms.",
    ]),
    text("Using the website", [
      "You agree to use the website lawfully, to give accurate information in the forms, and not to interfere with the website, attempt to gain access to parts of it you are not authorised to use, or collect its content by automated means.",
    ]),
    text("Intellectual property", [
      `The content of this website, including text, pictures and our catalogue, belongs to ${COMPANY.name} or its licensors and may not be copied for commercial use without our written permission. Other product names and trade marks mentioned belong to their respective owners.`,
    ]),
    text("Links to other websites", ["Links to other websites are provided for convenience. We are not responsible for their content or their privacy practices."]),
    text("Liability", [
      "We take care to keep the website accurate and available, but it is provided as it is, without guarantees. To the extent permitted by law, we are not liable for any loss arising from your use of the website or reliance on its content. Nothing in these terms limits any liability that cannot be limited by law.",
    ]),
    text("Privacy", ["How we handle personal data is explained in our [privacy policy](/privacy)."]),
    text("Governing law", [
      "These terms are governed by the laws of India, and the courts at Rohtak, Haryana have jurisdiction over any dispute arising from them.",
    ]),
    text("Changes to these terms", ["We may update these terms. The date at the top shows when they last changed."]),
  ];
}

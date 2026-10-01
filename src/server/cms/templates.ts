import { defaultsFor } from "@/cms/sections/definitions";
import type { PageTemplateKey } from "@/lib/cms/page-templates";

type TemplateSection = {
  type: string;
  content: Record<string, unknown>;
  design: Record<string, unknown>;
};

function section(
  type: string,
  content: Record<string, unknown>,
  design: Record<string, unknown> = {},
): TemplateSection {
  const defaults = defaultsFor(type);
  if (!defaults) throw new Error(`Unknown section type ${type}`);
  return {
    type,
    content: { ...defaults.content, ...content },
    design: { ...defaults.design, ...design },
  };
}

/** A plain heading-and-body block, the unit legal pages are written in. */
const prose = (heading: string, body: string) =>
  section("RICH_TEXT", { heading, body });

/** The opening of a document-like page: a modest h1 rather than a banner. */
const documentHero = (heading: string, subheading: string) =>
  section(
    "HERO",
    { heading, subheading },
    { spacing: "normal", background: "default" },
  );

/**
 * The sections a template starts with.
 *
 * Wording outside the brackets is limited to what is true of every site built
 * on this system — what the enquiry forms record, that the quotation list stays
 * in the visitor's browser — or is plainly generic. Everything particular to a
 * company is a bracketed instruction, and those cannot be published.
 */
export function templateSections(key: PageTemplateKey): TemplateSection[] {
  switch (key) {
    case "blank":
      return [];

    case "about":
      return [
        section("HERO", {
          overline: "About us",
          heading: "[[One sentence on who you are and who you supply]]",
          subheading:
            "[[Two or three sentences: where you are based, the institutions you work with, and what you supply]]",
          primaryLabel: "Browse the catalogue",
          primaryHref: "/products",
          secondaryLabel: "Contact us",
          secondaryHref: "/contact",
        }),
        prose(
          "Our story",
          "[[The company's story in your own words. Include only facts you can stand behind — when you started, where you operate, the kinds of hospitals and clinics you supply.]]",
        ),
        section("PROCESS_STEPS", {
          heading: "How we work",
          items: [
            {
              title: "[[First step, e.g. understanding the requirement]]",
              body: "[[What happens at this step]]",
            },
            {
              title: "[[Next step, e.g. quotation and supply]]",
              body: "[[What happens at this step]]",
            },
            {
              title: "[[Next step, e.g. installation and training]]",
              body: "[[What happens at this step — delete steps you do not offer]]",
            },
          ],
        }),
        section("CTA", {
          heading: "Talk to our team",
          body: "Tell us what you are planning and we will prepare a quotation.",
          primaryLabel: "Contact us",
          primaryHref: "/contact",
          secondaryLabel: "Browse the catalogue",
          secondaryHref: "/products",
        }),
      ];

    case "quality":
      return [
        section(
          "HERO",
          {
            overline: "Quality",
            heading: "Quality and certifications",
            subheading:
              "[[One or two sentences on how you make sure what you supply is genuine, compliant and supported]]",
          },
          { spacing: "large" },
        ),
        section("TRUST_CERTIFICATIONS", {
          heading: "Certifications and approvals",
          items: [
            {
              name: "[[Exact name of a certification or approval the company holds]]",
              detail: "[[Certificate number, scope or issuing body]]",
              image: "",
            },
          ],
        }),
        prose(
          "How we check what we supply",
          "[[Your sourcing, inspection, installation and documentation practices — only what you actually do.]]",
        ),
        section("CTA", {
          heading: "Need documents for a tender?",
          body: "Ask for certificates, datasheets and compliance documents along with your quotation.",
          primaryLabel: "Contact us",
          primaryHref: "/contact",
        }),
      ];

    case "privacy":
      return [
        documentHero(
          "Privacy policy",
          "Last updated: [[date this policy takes effect]]",
        ),
        prose(
          "Who we are",
          "This website is operated by [[legal name of the company]], [[registered address]] (“we”, “us”).\n\nQuestions about this policy or about your details can be sent to [[email address for privacy requests]].\n\n[[Have this policy reviewed by your legal adviser before publishing, then delete this note.]]",
        ),
        prose(
          "What we collect",
          "When you send an enquiry, request a quotation or ask for a document, we record what you enter: your name and email address and, if you give them, your phone number, organisation, city and message. Forms on this site may ask for other details; each form shows what it asks for.\n\nAlongside that we record the page you sent it from, any campaign details in that page's address, your IP address, your browser's user agent and the time you gave consent.\n\nThe quotation list you build while browsing is kept in your own browser. It reaches us only when you send it.\n\n[[If the site uses analytics, name the service and what it records; otherwise delete this paragraph.]]",
        ),
        prose(
          "Why we use it",
          "To reply to your enquiry, prepare quotations and follow them up.\n\n[[Any other purpose — for example sending product updates — and how a visitor agrees to it. Delete if there is none.]]",
        ),
        prose(
          "Who sees it",
          "Our sales team.\n\n[[Any service providers that handle these details for you, such as your email or hosting provider.]]",
        ),
        prose(
          "How long we keep it",
          "[[How long you keep enquiries and quotations, and why.]]",
        ),
        prose(
          "Your rights",
          "You can ask for a copy of the details we hold about you, ask us to correct them, or ask us to delete them, by writing to [[email address for privacy requests]].\n\n[[Grievance redressal details and any other rights required under India's Digital Personal Data Protection Act, 2023, as advised by your legal adviser.]]",
        ),
      ];

    case "terms":
      return [
        documentHero(
          "Terms of use",
          "Last updated: [[date these terms take effect]]",
        ),
        prose(
          "About these terms",
          "These terms apply to your use of this website, operated by [[legal name of the company]].\n\n[[This is an outline only. Have the terms written or reviewed by your legal adviser, then delete this note.]]",
        ),
        prose(
          "Product information",
          "Descriptions, specifications and images on this site are provided for information and may change. Prices, availability and specifications are confirmed only in a written quotation.",
        ),
        prose(
          "Quotations and orders",
          "[[How quotations are issued, how long they remain valid, and which terms govern an order.]]",
        ),
        prose(
          "Content on this site",
          "[[Who owns the text, images and documents on this site, and what use of them you permit.]]",
        ),
        prose(
          "Governing law",
          "[[The law and the courts that govern these terms.]]",
        ),
        prose(
          "Contact",
          "Questions about these terms can be sent through our [contact page](/contact).",
        ),
      ];
  }
}

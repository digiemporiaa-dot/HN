/**
 * The HN Medical System catalogue: open and laparoscopy instruments,
 * gynaecology instruments, portable endoscopy systems and sterilization trays.
 *
 * Transcribed from "HN Medical System — Open and Laparoscopy Instruments"
 * (the 28-page catalogue) and the product photographs supplied with it. Codes,
 * sizes and technical values are as printed there; obvious typing slips in the
 * printed captions are corrected ("Gasping" → "Grasping", "Froceps" →
 * "Forceps"). Nothing here is invented: where the catalogue gives no figure
 * (material, finish, price) none is stated.
 *
 * Image keys name files in public/images/hn/catalogue, cut out of the
 * catalogue pages or cropped from the photographs.
 */

export type CatalogueSpecGroup = { label: string; items: Array<[string, string, string?]> };

export type CatalogueProduct = {
  name: string;
  /** The code a buyer quotes, as printed. */
  model?: string;
  short: string;
  body: string;
  image: string;
  gallery?: string[];
  featured?: boolean;
  highlights: string[];
  specs: CatalogueSpecGroup[];
};

export type CatalogueSub = { name: string; short: string; products: CatalogueProduct[] };

export type CatalogueCategory = {
  name: string;
  image: string;
  short: string;
  description: string;
  procurement: string;
  featured?: boolean;
  subs: CatalogueSub[];
};

export const HN_CATALOGUE: CatalogueCategory[] = [
  {
    name: "Laparoscopy Instruments",
    image: "needle-holder",
    featured: true,
    short: "Clip applicators, graspers, scissors, needle holders, trocars and accessories for laparoscopic surgery.",
    description:
      "Reusable instruments for laparoscopic surgery in Φ3, Φ5 and Φ10 mm, most in a 330 mm working length: clip applicators and ligation, grasping and dissecting forceps, scissors, needle holders, trocars and access, suction and irrigation, electrosurgery, retractors and complete sets.\n\nEvery instrument carries the code printed in the HN Medical System catalogue, so a list of codes is all we need to prepare a quotation.",
    procurement:
      "Quotations are prepared per code and quantity. Instruments can be supplied individually, as replacement inserts and handles, or as a complete set in a sterilization tray.",
    subs: [
      {
        name: "Clip Applicators & Ligation",
        short: "Metal and polymer clip applicators, ligating clips, bulldog clamps and clip removers.",
        products: [
          {
            name: "Laparoscopic Clip Applicator",
            model: "101-001",
            featured: true,
            image: "clip-applicator",
            short: "Clip applicator with a ratchet handle and rotating shaft, Φ10 and Φ5 × 330 mm, in single-action, double-action, curving and right-angle versions.",
            body: "A laparoscopic clip applicator with a pistol-grip ratchet handle and a rotation knob, for applying ligating clips through a trocar.\n\nThe range covers single-action jaws in Φ10 mm (101-001) and Φ5 mm (102-001), a curving single-action applicator (106-001), a right-angle version (101-003) and a double-action applicator (101-002), all with a 330 mm working length.",
            highlights: ["Φ10 and Φ5 mm shafts", "330 mm working length", "Single and double action", "Curving and right-angle versions"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["101-001", "Clip applicator, single action, Φ10 × 330 mm"],
                  ["102-001", "Clip applicator, single action, Φ5 × 330 mm"],
                  ["106-001", "Curving clip applicator, single action, Φ10 × 330 mm"],
                  ["101-003", "Clip applicator, right angle, Φ10 × 330 mm"],
                  ["101-002", "Double action clip applicator (double angle), Φ10 × 330 mm"],
                ],
              },
            ],
          },
          {
            name: "Clip Applicator for Tyco Clips",
            model: "101-004",
            image: "tyco-clip-applicator",
            short: "Φ10 × 330 mm clip applicator with a scissor-grip handle, made for Tyco clips.",
            body: "A Φ10 mm laparoscopic clip applicator with a 330 mm shaft and a scissor-grip handle, made to take Tyco clips.",
            highlights: ["Φ10 × 330 mm", "Takes Tyco clips", "Scissor-grip handle"],
            specs: [{ label: "Versions", items: [["101-004", "Clip applicator, with Tyco clips, Φ10 × 330 mm"]] }],
          },
          {
            name: "Polymer Clip Applicator",
            model: "101-005",
            featured: true,
            image: "polymer-clip-applicator",
            gallery: ["polymer-ligating-clips"],
            short: "Laparoscopic applicators for polymer ligating clips, colour-coded gold, purple and green, Φ10 and Φ5 × 330 mm.",
            body: "Laparoscopic applicators for polymer (plastic) ligating clips. Each applicator is colour-coded to its clip size, so the right cartridge is easy to pick in theatre: gold for XL, purple for L and green for ML clips.\n\nThe gold and purple applicators have a Φ10 mm shaft; the green applicator is Φ5 mm. All have a 330 mm working length.",
            highlights: ["Colour-coded by clip size", "Gold, purple and green", "Φ10 and Φ5 mm shafts", "330 mm working length"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["101-005", "Plastic clamp applicator (gold), Φ10 × 330 mm"],
                  ["101-006A", "Plastic clamp applicator (purple), Φ10 × 330 mm"],
                  ["101-007B", "Plastic clamp applicator (green), Φ5 × 330 mm"],
                ],
              },
              {
                label: "Matching clips",
                items: [
                  ["544250", "Ligating clip XL (gold)"],
                  ["544240", "Ligating clip L (purple)"],
                  ["544230", "Ligating clip ML (green)"],
                ],
              },
            ],
          },
          {
            name: "Polymer Ligating Clips",
            model: "544250 / 544240 / 544230",
            image: "polymer-ligating-clips",
            short: "Polymer ligating clips in XL, L and ML sizes, in cartridges colour-coded to their applicators.",
            body: "Polymer ligating clips supplied in cartridges. The cartridge colour matches the applicator: gold for XL, purple for L and green for ML.",
            highlights: ["XL, L and ML sizes", "Colour-coded cartridges", "Match the polymer clip applicators"],
            specs: [
              {
                label: "Sizes",
                items: [
                  ["544250", "Ligating clip XL (gold)"],
                  ["544240", "Ligating clip L (purple)"],
                  ["544230", "Ligating clip ML (green)"],
                ],
              },
            ],
          },
          {
            name: "Open Surgery Clip Applicator",
            model: "01-01",
            image: "open-clip-applicator",
            short: "Ring-handled clip applicators for open surgery, in large, medium and small.",
            body: "Clip applicators for open surgery, with ring handles and angled jaws, in three sizes to match the clip: large (01-01), medium (01-02) and small (01-03).",
            highlights: ["Large, medium and small", "Ring handles", "Angled jaws"],
            specs: [
              {
                label: "Sizes",
                items: [
                  ["01-01", "Open surgery clip applicator (L)"],
                  ["01-02", "Open surgery clip applicator (M)"],
                  ["01-03", "Open surgery clip applicator (S)"],
                ],
              },
            ],
          },
          {
            name: "Open Clip Applicator for Polymer Clips",
            model: "01-004",
            image: "polymer-open-clip-applicator",
            short: "Open-type applicators for polymer clips with curved jaws, in large, medium and small.",
            body: "Open-type clip applicators for polymer clips, with ring handles and curved jaws, in three sizes: large (01-004), medium (01-005) and small (01-006).",
            highlights: ["For polymer clips", "Curved jaws", "Large, medium and small"],
            specs: [
              {
                label: "Sizes",
                items: [
                  ["01-004", "Curved (L)"],
                  ["01-005", "Curved (M)"],
                  ["01-006", "Curved (S)"],
                ],
              },
            ],
          },
          {
            name: "Laparoscopic Bulldog Clamp Applier & Clips",
            model: "101-014A",
            image: "bulldog-clamp-applier",
            gallery: ["bulldog-clips"],
            short: "Φ10 × 330 mm bulldog clamp applier with laparoscopic bulldog clips from 25 to 65 mm, with or without teeth.",
            body: "A Φ10 × 330 mm applier for placing and removing laparoscopic bulldog clips, with two bulldog forceps jaw types.\n\nThe clips come straight or curved, with or without teeth, in 25, 45 and 65 mm lengths.",
            highlights: ["Φ10 × 330 mm applier", "Clips 25, 45 and 65 mm", "With or without teeth", "Straight and curved clips"],
            specs: [
              {
                label: "Applier and forceps",
                items: [
                  ["101-014A", "Bulldog clamp applier, Φ10 × 330 mm"],
                  ["101-014", "Bulldog forceps"],
                  ["101-014.1", "Bulldog forceps"],
                ],
              },
              {
                label: "Bulldog clips",
                items: [
                  ["101-014.5", "Bulldog clip, with teeth", "65 mm"],
                  ["101-014.2", "Bulldog clip, without teeth", "45 mm"],
                  ["101-014.3", "Bulldog clip, curving, with teeth", "45 mm"],
                  ["101-014.4", "Bulldog clip, curving, without teeth", "25 mm"],
                ],
              },
            ],
          },
          {
            name: "Laparoscopic Clip Remover",
            model: "101-180",
            image: "clip-remover",
            short: "Clip remover with a ratchet handle, Φ10 and Φ5 × 330 mm.",
            body: "A laparoscopic clip remover with a pistol-grip ratchet handle and rotating shaft, in Φ10 mm (101-180) and Φ5 mm (101-180.1), both 330 mm long.",
            highlights: ["Φ10 and Φ5 mm", "330 mm working length", "Ratchet handle"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["101-180", "Clip remover, Φ10 × 330 mm"],
                  ["101-180.1", "Clip remover, Φ5 × 330 mm"],
                ],
              },
            ],
          },
        ],
      },
      {
        name: "Graspers, Dissectors & Scissors",
        short: "Φ5 and Φ10 mm grasping, dissecting, biopsy and scissor instruments, with handles and inserts.",
        products: [
          {
            name: "Laparoscopic Scissors, 5 mm",
            model: "101-056",
            featured: true,
            image: "scissors-tip",
            short: "Φ5 mm laparoscopic scissors: straight, curved and hook, in single and double action.",
            body: "Φ5 mm laparoscopic scissors with straight, curved and hook blades, in single-action and double-action versions.",
            highlights: ["Straight, curved and hook", "Single and double action", "Φ5 mm"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["101-054", "Scissors, straight, single action"],
                  ["101-055", "Scissors, curved, single action"],
                  ["101-053", "Hook scissors"],
                  ["101-056", "Straight scissors, double action"],
                  ["101-057", "Curved scissors, double action"],
                ],
              },
            ],
          },
          {
            name: "Maryland & Dissecting Forceps, 5 mm",
            model: "101-059",
            featured: true,
            image: "maryland-tip",
            gallery: ["dissecting-tip"],
            short: "Φ5 mm Maryland, Kelly, Mixter and straight dissecting forceps, from 30° to 90°.",
            body: "Φ5 mm dissecting forceps: Maryland forceps in curved, 30° and 45° versions, Kelly dissecting forceps, Mixter right-angle (90°) forceps, a 70° dissector and straight dissecting forceps, most with double-action jaws.",
            highlights: ["Maryland, Kelly and Mixter", "30°, 45°, 70° and 90°", "Double-action jaws", "Φ5 mm"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["101-174", "Maryland forceps (curved)"],
                  ["101-059", "Maryland forceps"],
                  ["101-059.1", "Maryland forceps, 30°, double action"],
                  ["101-059.2", "Maryland forceps, 45°"],
                  ["101-059.3", "Kelly dissecting forceps, 30°, double action"],
                  ["101-062", "Mixter forceps, 90°, double action"],
                  ["101-058", "Dissecting forceps, straight, double action"],
                  ["101-175", "Dissecting forceps, 70°, double action"],
                ],
              },
            ],
          },
          {
            name: "Atraumatic Grasping Forceps, 5 mm",
            model: "101-066",
            featured: true,
            image: "grasping-tip",
            gallery: ["babcock-tip"],
            short: "Φ5 mm atraumatic, fenestrated, Babcock, Allis, bowel and organ graspers in single and double action.",
            body: "Φ5 mm grasping forceps for holding tissue and organs: atraumatic and fenestrated graspers, Babcock and Allis graspers, duck-mouth and V-type jaws, stomach, intestinal, mesentery, appendix and oviduct forceps, and anastomosis traction forceps.\n\nMost are double-action; single-action versions are listed where the catalogue gives them.",
            highlights: ["27 jaw patterns", "Atraumatic and fenestrated", "Babcock and Allis", "Φ5 mm"],
            specs: [
              {
                label: "General grasping",
                items: [
                  ["101-172", "Grasping forceps, double action"],
                  ["101-172.2", "Grasping forceps, single action"],
                  ["101-173", "Grasping forceps, single action"],
                  ["101-064", "Grasping forceps, blunt, double action"],
                  ["101-088", "Grasping forceps"],
                  ["101-096", "Grasping forceps (tissue)"],
                  ["101-083", "Universal forceps, double action"],
                  ["101-067", "Grasping forceps, duck mouth, double action"],
                  ["101-071", "Grasping forceps, V type, double action"],
                ],
              },
              {
                label: "Atraumatic",
                items: [
                  ["101-065", "Atraumatic forceps, double action"],
                  ["101-066", "Grasping forceps, fenestrated atraumatic, double action"],
                  ["101-100", "Atraumatic forceps (dolphin head)"],
                  ["101-063", "Babcock forceps, double action"],
                  ["101-095", "Allis grasper, vertical, double action"],
                  ["101-099", "Triporate forceps, double action"],
                ],
              },
              {
                label: "Organ forceps",
                items: [
                  ["101-093", "Stomach forceps, double action"],
                  ["101-098", "Stomach forceps, single action"],
                  ["101-106", "Stomach forceps, double action, two-hole"],
                  ["101-069", "Intestinal forceps, groove teeth, double action"],
                  ["101-068", "Visceral forceps, double action"],
                  ["101-086", "Mesentery forceps, double action"],
                  ["101-105", "Mesentery forceps, double action"],
                  ["101-085", "Appendix forceps, double action"],
                  ["101-070", "Oviduct grasper, double action"],
                  ["101-081", "Oviduct grasper, double action"],
                  ["101-087", "Oviduct forceps"],
                  ["101-171", "Anastomosis traction forceps, double action"],
                ],
              },
            ],
          },
          {
            name: "Toothed & Claw Grasping Forceps, 5 mm",
            model: "101-091",
            image: "claw-tip",
            short: "Φ5 mm toothed graspers: claw, alligator, mouse-tooth and clinch jaws for firm hold.",
            body: "Φ5 mm grasping forceps with toothed jaws for a firm hold: claw forceps with 3+2 groove or rough teeth, alligator graspers, mouse-tooth forceps (2+1 tooth serration), a clinch grasper and a rough-tooth single-open Maryland forceps.",
            highlights: ["Claw, alligator and mouse-tooth", "3+2 and 2+1 tooth patterns", "Φ5 mm"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["101-091", "Claw forceps, 3+2 groove teeth, double action"],
                  ["101-090", "Claw forceps, 3+2 rough teeth, double action"],
                  ["101-092", "Mouse-tooth forceps, 2+1 tooth serration, single action"],
                  ["101-084", "Alligator grasping forceps, double action"],
                  ["101-109", "Alligator forceps, single action"],
                  ["101-101", "Clinch grasper, double action"],
                  ["101-034", "Rough-tooth single-open Maryland forceps"],
                ],
              },
            ],
          },
          {
            name: "Biopsy & Punch Forceps, 5 mm",
            model: "101-089",
            image: "biopsy-tip",
            gallery: ["punch-tip"],
            short: "Φ5 mm cup biopsy forceps (double action) and punch forceps (single action).",
            body: "Φ5 mm forceps for taking tissue samples: two cup biopsy forceps with double-action jaws, and a single-action punch forceps.",
            highlights: ["Cup biopsy jaws", "Punch forceps", "Φ5 mm"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["101-082", "Biopsy forceps, double action"],
                  ["101-089", "Biopsy forceps, double action"],
                  ["101-094", "Punch forceps, single action"],
                ],
              },
            ],
          },
          {
            name: "Abdominal Grasping Forceps, 10 mm",
            model: "101-202",
            image: "abdominal-tip",
            gallery: ["abdominal-handles"],
            short: "Φ10 × 330 mm graspers, dissectors and scissors, with a choice of four handles.",
            body: "Φ10 × 330 mm instruments for larger tissue and organs: dissecting and large dissecting forceps, Babcock, alligator, duck-mouth, lung, broad-mouth and large-jaw graspers, haemostatic and stomach forceps, anastomosis traction forceps and straight, curved and insulated curved scissors.\n\nThe catalogue shows four handle styles for this range.",
            highlights: ["Φ10 × 330 mm", "16 jaw patterns", "Four handle styles", "Insulated scissors available"],
            specs: [
              {
                label: "Graspers and dissectors",
                items: [
                  ["101-201", "Dissecting forceps, double action"],
                  ["101-202", "Large dissecting forceps, double action"],
                  ["101-203", "Large dissecting forceps, double action"],
                  ["101-009", "Babcock forceps, double action"],
                  ["101-104", "Alligator grasping forceps, double action"],
                  ["101-018", "Grasping forceps, duck mouth, double action"],
                  ["101-020", "Lung forceps, double action"],
                  ["101-019", "Broad-mouth grasper, double action"],
                  ["101-103", "Broad-mouth grasper, double action"],
                  ["101-017", "Grasping forceps, large jaw"],
                  ["101-016", "Haemostatic forceps, curved head"],
                  ["101-015", "Stomach forceps, double action"],
                  ["101-110", "Anastomosis traction forceps"],
                ],
              },
              {
                label: "Scissors",
                items: [
                  ["101-120", "Scissors, straight, double action"],
                  ["101-119", "Scissors, curved, double action"],
                  ["101-097", "Scissors, curved, insulated, double action"],
                ],
              },
            ],
          },
          {
            name: "Laparoscopic Biopsy Forceps, 10 mm",
            model: "101-010",
            image: "biopsy-forceps-10mm",
            short: "Φ10 × 330 mm biopsy forceps without teeth, with a ratchet handle.",
            body: "A Φ10 × 330 mm biopsy forceps with toothless cup jaws, a rotation knob and a pistol-grip ratchet handle.",
            highlights: ["Φ10 × 330 mm", "Toothless cup jaws", "Ratchet handle"],
            specs: [{ label: "Versions", items: [["101-010", "Biopsy forceps, no tooth, Φ10 × 330 mm"]] }],
          },
          {
            name: "Large Grasping Forceps, 10 mm",
            model: "101-176",
            image: "grasping-forceps-10mm",
            short: "Φ10 × 330 mm large grasping forceps with a ratchet handle.",
            body: "A Φ10 × 330 mm grasping forceps with large jaws, a rotation knob and a pistol-grip ratchet handle.",
            highlights: ["Φ10 × 330 mm", "Large jaws", "Ratchet handle"],
            specs: [{ label: "Versions", items: [["101-176", "Large grasping forceps, Φ10 × 330 mm"]] }],
          },
          {
            name: "Knot Forceps",
            model: "101-075",
            image: "knot-forceps",
            short: "Φ5 × 330 mm knot forceps in single and double action.",
            body: "Φ5 × 330 mm knot forceps for intracorporeal knotting, with single-action (101-074) or double-action (101-075) jaws.",
            highlights: ["Φ5 × 330 mm", "Single and double action"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["101-074", "Knot forceps, single action, Φ5 × 330 mm"],
                  ["101-075", "Knot forceps, double action, Φ5 × 330 mm"],
                ],
              },
            ],
          },
          {
            name: "Detachable Operating Forceps & Handles",
            model: "A / B / C / D",
            image: "detachable-forceps",
            gallery: ["detachable-handles"],
            short: "Modular forceps that take apart into handle, outer tube and insert, with four handle styles.",
            body: "Operating forceps that take apart for cleaning: the handle, the outer tube and the jaw insert separate, and the insert rotates with the knob on the handle. Inserts and handles can be replaced individually.\n\nThe catalogue shows handle styles A, B and D, and a two-part structure (C) in which the insert and tube come out together: press the button, lift the back handle, align the pin with the lock and press the handle back to reassemble.",
            highlights: ["Takes apart for cleaning", "Replaceable inserts and handles", "Handle styles A, B, C and D", "Rotating insert"],
            specs: [
              {
                label: "Handles",
                items: [
                  ["A", "Detachable operating forceps handle"],
                  ["B", "Detachable operating forceps handle"],
                  ["C", "Two-part structure handle"],
                  ["D", "Detachable operating forceps handle"],
                ],
              },
            ],
          },
          {
            name: "Laparoscopic Instrument with Flexible Head",
            model: "101-554",
            image: "flexible-head-instrument",
            short: "Φ5 × 330 mm instrument whose head bends at the tip, operated from the handle.",
            body: "A Φ5 × 330 mm laparoscopic instrument with a flexible head that bends at the tip, controlled from the handle, for reaching around structures that a straight instrument cannot.",
            highlights: ["Flexible, bending head", "Φ5 × 330 mm", "Ring handle"],
            specs: [{ label: "Versions", items: [["101-554", "Flexible-head instrument, Φ5 × 330 mm"]] }],
          },
          {
            name: "Target Forceps",
            model: "04-013",
            image: "target-forceps",
            short: "Φ10 × 330 mm target forceps (YD-JC-1).",
            body: "A Φ10 × 330 mm target forceps with a scissor-grip handle, catalogue reference YD-JC-1.",
            highlights: ["Φ10 × 330 mm", "Reference YD-JC-1"],
            specs: [{ label: "Versions", items: [["04-013", "Target forceps, YD-JC-1, Φ10 × 330 mm"]] }],
          },
        ],
      },
      {
        name: "Needle Holders",
        short: "Φ5 × 330 mm laparoscopic needle holders in six handle styles, straight or curved.",
        products: [
          {
            name: "Laparoscopic Needle Holder",
            model: "101-108",
            featured: true,
            image: "needle-holder",
            gallery: ["needle-holder-v1", "needle-holder-pistol", "needle-holder-jaws"],
            short: "Φ5 × 330 mm needle holders with straight or curved jaws, in ring, V-grip, pistol and titanium handle styles.",
            body: "Φ5 × 330 mm laparoscopic needle holders in six handle styles — Mode A (ring handle), Modes V1, V2 and V3 (in-line grips), a pistol grip and a titanium version — each with straight or curved jaws.\n\nJaw options include straight, curved, automatic resetting and multi-function tips.",
            highlights: ["Six handle styles", "Straight or curved jaws", "Self-resetting jaw option", "Φ5 × 330 mm"],
            specs: [
              {
                label: "Handle styles",
                items: [
                  ["101-111 / 101-111.1", "Mode A, straight / curved, Φ5 × 330 mm"],
                  ["101-108 / 101-108.1", "Mode V1, straight / curved, Φ5 × 330 mm"],
                  ["101-117 / 101-117.1", "Mode V2, straight / curved, Φ5 × 330 mm"],
                  ["101-116 / 101-116.1", "Mode V3, straight / curved, Φ5 × 330 mm"],
                  ["101-114 / 101-114.1", "Mode Pistol, straight / curved, Φ5 × 330 mm"],
                  ["101-115 / 101-115.1", "Titanium, straight / curved, Φ5 × 330 mm"],
                ],
              },
              {
                label: "Jaws",
                items: [
                  ["Straight", "Straight jaw"],
                  ["Curved", "Curved jaw"],
                  ["Automatic resetting", "Self-resetting jaw"],
                  ["Multi-function", "Multi-function jaw"],
                ],
              },
            ],
          },
        ],
      },
      {
        name: "Trocars & Access",
        short: "Magnetic, cross-seal and spring trocars, reducers, sealing caps and Veress needles.",
        products: [
          {
            name: "Magnetic Trocar",
            model: "101-028",
            featured: true,
            image: "trocar-magnetic",
            short: "Magnetic-valve trocars in Φ5.5 and Φ10.5 × 105 mm, plain or with screw cannula and safety shield.",
            body: "Reusable trocars with a magnetic valve and an insufflation stopcock, in Φ5.5 and Φ10.5 mm with a 105 mm cannula.\n\nVersions come with a plain cannula, a screw (threaded) cannula for a firmer hold in the abdominal wall, or a screw cannula with a safety shield.",
            highlights: ["Magnetic valve", "Φ5.5 and Φ10.5 × 105 mm", "Screw cannula option", "Safety shield option"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["101-028", "Magnetic, Φ5.5 × 105 mm"],
                  ["101-031", "Magnetic, Φ10.5 × 105 mm"],
                  ["101-029", "Magnetic, Φ5.5 × 105 mm"],
                  ["101-032", "Magnetic, Φ10.5 × 105 mm"],
                  ["101-030", "Magnetic, with screw, Φ5.5 × 105 mm"],
                  ["101-033", "Magnetic, with screw, Φ10.5 × 105 mm"],
                  ["101-048", "Magnetic, with screw & safety, Φ5.5 × 105 mm"],
                  ["101-049", "Magnetic, with screw & safety, Φ10.5 × 105 mm"],
                ],
              },
            ],
          },
          {
            name: "Cross-Seal Trocar",
            model: "101-022",
            image: "trocar-cross",
            short: "Trocars with a cross seal, Φ5.5 and Φ10.5 × 105 mm, plain or with screw cannula and safety shield.",
            body: "Reusable trocars with a cross seal and an insufflation stopcock, in Φ5.5 and Φ10.5 mm with a 105 mm cannula, plain or with a screw cannula, a safety shield, or both.",
            highlights: ["Cross seal", "Φ5.5 and Φ10.5 × 105 mm", "Screw and safety options"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["101-022", "Cross, Φ5.5 × 105 mm"],
                  ["101-025", "Cross, Φ10.5 × 105 mm"],
                  ["101-023", "Cross, with safety, Φ5.5 × 105 mm"],
                  ["101-026", "Cross, with safety, Φ10.5 × 105 mm"],
                  ["101-112", "Cross, with screw, Φ5.5 × 105 mm"],
                  ["101-113", "Cross, with screw, Φ10.5 × 105 mm"],
                  ["101-027", "Cross, with screw & safety, Φ5.5 × 105 mm"],
                  ["101-026", "Cross, with screw & safety, Φ10.5 × 105 mm"],
                ],
              },
            ],
          },
          {
            name: "Spring Trocar",
            model: "101-039",
            image: "trocar-spring",
            short: "Spring-valve trocars, Φ5.5 and Φ10.5 × 105 mm, plain or with screw cannula and safety shield.",
            body: "Reusable trocars with a spring-loaded flap valve and an insufflation stopcock, in Φ5.5 and Φ10.5 mm with a 105 mm cannula, plain or with a screw cannula, a safety shield, or both.",
            highlights: ["Spring valve", "Φ5.5 and Φ10.5 × 105 mm", "Screw and safety options"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["101-039", "Spring, Φ5.5 × 105 mm"],
                  ["101-023", "Spring, Φ10.5 × 105 mm"],
                  ["101-036", "Spring, with safety, Φ5.5 × 105 mm"],
                  ["101-037", "Spring, with safety, Φ10.5 × 105 mm"],
                  ["101-050", "Spring, with screw, Φ5.5 × 105 mm"],
                  ["101-035", "Spring, with screw, Φ10.5 × 105 mm"],
                  ["101-038", "Spring, with screw & safety, Φ5.5 × 105 mm"],
                  ["101-040", "Spring, with screw & safety, Φ10.5 × 105 mm"],
                ],
              },
            ],
          },
          {
            name: "Trocar Reducer",
            model: "101-128",
            image: "reducer",
            gallery: ["reducer-clip"],
            short: "Reducers from Φ10 to Φ5 mm, as a sleeve or a clip-on cap.",
            body: "Reducers for using a Φ5 mm instrument through a Φ10 mm trocar: two sleeve reducers (101-128, 101-128.1) and a clip-on reducer cap (101-051).",
            highlights: ["Φ10 → Φ5 mm", "Sleeve and clip-on types"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["101-128", "Reducer, Φ10–Φ5 mm"],
                  ["101-128.1", "Reducer, Φ10–Φ5 mm"],
                  ["101-051", "Reducer, Φ10–Φ5 mm (clip-on)"],
                ],
              },
            ],
          },
          {
            name: "Trocar Sealing Caps & Rings",
            model: "602-017",
            image: "sealing-caps",
            short: "Replacement crossed sealing caps, sealing caps and sealing rings from Φ3 to Φ10.5 mm.",
            body: "Replacement seals for trocars: crossed sealing caps, sealing caps and sealing rings in sizes from Φ3 to Φ10.5 mm.",
            highlights: ["Φ3 to Φ10.5 mm", "Caps and rings", "Replacement parts"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["602-017", "Crossed sealing cap, Φ5.5 mm"],
                  ["602-018", "Crossed sealing cap, Φ10.5 mm"],
                  ["602-017.1", "Sealing cap, Φ10.5 mm"],
                  ["602-017.2", "Sealing ring, Φ10 mm"],
                  ["602-017.3", "Sealing cap, Φ5.5 mm"],
                  ["602-017.4", "Sealing ring, Φ5 mm"],
                  ["602-017.5", "Sealing cap, Φ3.5 mm"],
                  ["602-017.6", "Sealing ring, Φ3 mm"],
                ],
              },
            ],
          },
          {
            name: "Veress Needle",
            model: "101-139",
            featured: true,
            image: "veress-needles",
            gallery: ["veress-needle-drawing"],
            short: "Veress insufflation needles, Φ2 and Φ2.5 mm, 120 and 140 mm long, with stopcock.",
            body: "Reusable Veress needles for establishing pneumoperitoneum, with a knurled grip and a stopcock with Luer connector. Available in Φ2 and Φ2.5 mm, each in 120 and 140 mm lengths.",
            highlights: ["Φ2 and Φ2.5 mm", "120 and 140 mm", "Stopcock with Luer connector"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["101-139", "Veress needle, Φ2 × 120 mm"],
                  ["101-139.1", "Veress needle, Φ2 × 140 mm"],
                  ["101-139.2", "Veress needle, Φ2.5 × 120 mm"],
                  ["101-139.3", "Veress needle, Φ2.5 × 140 mm"],
                ],
              },
            ],
          },
        ],
      },
      {
        name: "Suction, Irrigation & Electrosurgery",
        short: "Suction and irrigation tubes, flushers, monopolar electrodes, bipolar forceps and cables.",
        products: [
          {
            name: "Suction & Irrigation Tube",
            model: "101-130",
            featured: true,
            image: "suction-irrigation-set",
            gallery: ["suction-irrigation-tube"],
            short: "Detachable suction and irrigation tubes with stopcock or twin-valve body, Φ10 and Φ5 × 330 mm.",
            body: "Detachable suction and irrigation tubes for clearing the operative field. The 101-130 has a rotary stopcock and hose connector; the 101-131 has a twin-valve body. Both are Φ10 × 330 mm and take Φ5 × 330 mm tubes (101-130.1, 101-131.2).",
            highlights: ["Detachable", "Stopcock or twin valve", "Φ10 and Φ5 × 330 mm"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["101-130", "Suction & irrigation tube, detachable, Φ10 × 330 mm"],
                  ["101-130.1", "Suction & irrigation tube, Φ5 × 330 mm"],
                  ["101-131", "Suction & irrigation tube, twin valve, Φ10 × 330 mm"],
                  ["101-131.2", "Suction & irrigation tube, Φ5 × 330 mm"],
                ],
              },
            ],
          },
          {
            name: "Gun Type Flusher",
            model: "101-077",
            image: "gun-flusher",
            short: "Φ5 × 330 mm flusher with a pistol grip and twin hose connectors.",
            body: "A Φ5 × 330 mm irrigation flusher with a pistol grip and twin hose connectors in the handle.",
            highlights: ["Pistol grip", "Φ5 × 330 mm"],
            specs: [{ label: "Versions", items: [["101-077", "Gun type flusher, Φ5 × 330 mm"]] }],
          },
          {
            name: "Monopolar Electrodes",
            model: "101-134",
            image: "monopolar-electrode",
            gallery: ["electrode-hook"],
            short: "Φ5 × 330 mm monopolar electrodes: hook, L-hook, blunt, spatula, needle and ball tips.",
            body: "Φ5 × 330 mm insulated monopolar electrodes with a choice of tips: hook, L-hook, blunt, spatula, needle and ball.",
            highlights: ["Six tip shapes", "Φ5 × 330 mm", "Insulated shaft"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["101-134", "Hook electrode, Φ5 × 330 mm"],
                  ["101-135", "L-hook electrode, Φ5 × 330 mm"],
                  ["101-136", "Blunt electrode, Φ5 × 330 mm"],
                  ["101-137", "Spatula electrode, Φ5 × 330 mm"],
                  ["101-138", "Needle electrode, Φ5 × 330 mm"],
                  ["101-181", "Ball electrode, Φ5 × 330 mm"],
                ],
              },
            ],
          },
          {
            name: "Electric Coagulation Electrode",
            model: "101-136",
            image: "suction-coagulation-electrode",
            short: "Coagulation electrode with valve body and hose connector, with L-hook and blunt tips, Φ5 × 330 mm.",
            body: "A Φ5 × 330 mm electric coagulation electrode with a rotary valve body and hose connector, taking interchangeable L-hook (101-135) and blunt (101-133) tips.",
            highlights: ["Valve body with hose connector", "Interchangeable tips", "Φ5 × 330 mm"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["101-136", "Electric coagulation electrode"],
                  ["101-135", "Tip, L-hook, Φ5 × 330 mm"],
                  ["101-133", "Tip, blunt, Φ5 × 330 mm"],
                ],
              },
            ],
          },
          {
            name: "Monopolar Cable & Connectors",
            model: "101-127",
            image: "monopolar-cable",
            gallery: ["monopolar-connectors"],
            short: "3 m monopolar cables in Φ4, Φ6 and Φ8 mm, with Φ4→Φ6 and Φ4→Φ8 conversion connectors.",
            body: "Monopolar cables 3000 mm long with Φ4, Φ6 or Φ8 mm connectors, and conversion connectors to fit a Φ4 mm cable to Φ6 or Φ8 mm sockets.",
            highlights: ["3000 mm long", "Φ4, Φ6 and Φ8 mm", "Conversion connectors"],
            specs: [
              {
                label: "Cables",
                items: [
                  ["101-127", "Monopolar cable, Φ4 × 3000 mm"],
                  ["101-127.1", "Monopolar cable, Φ6 × 3000 mm"],
                  ["101-127.2", "Monopolar cable, Φ8 × 3000 mm"],
                ],
              },
              {
                label: "Connectors",
                items: [
                  ["101-154", "Monopolar cable conversion connector, Φ4–Φ6"],
                  ["101-153", "Monopolar cable conversion connector, Φ4–Φ8"],
                ],
              },
            ],
          },
          {
            name: "Laparoscopic Bipolar Forceps",
            model: "101-118",
            featured: true,
            image: "bipolar-forceps",
            gallery: ["bipolar-cord"],
            short: "Φ5 × 330 mm bipolar forceps in pistol-grip and detachable designs, with a 3 m bipolar cord.",
            body: "Φ5 × 330 mm bipolar forceps. The pistol-grip forceps (101-118) comes with three jaw types; the removable forceps (101-118A) takes apart in five steps — push the button, open the handle, pull out the tongs, rotate the core clockwise and pull it out — and has non-damage and curved separation jaws. A detachable in-line version (101-118B) and a 3000 mm bipolar cord (101-118C) complete the range.",
            highlights: ["Φ5 × 330 mm", "Pistol-grip and detachable", "Takes apart for cleaning", "3 m bipolar cord"],
            specs: [
              {
                label: "Forceps",
                items: [
                  ["101-118", "Bipolar forceps, pistol grip"],
                  ["101-118.1", "Bipolar forceps, pistol grip"],
                  ["101-118.2", "Bipolar forceps, pistol grip"],
                  ["101-118A", "Bipolar forceps, removable, curved separation clamp, Φ5 × 330 mm"],
                  ["101-118A.1", "Bipolar forceps, removable, non-damage type"],
                  ["101-118B", "Bipolar forceps, detachable, Φ5 × 330 mm"],
                ],
              },
              { label: "Cable", items: [["101-118C", "Bipolar cord", "3000 mm"]] },
            ],
          },
        ],
      },
      {
        name: "Retractors & Specialty Instruments",
        short: "Fan retractors, loop retractors, bile duct and cholangiography instruments, hernia and lithotomy instruments.",
        products: [
          {
            name: "Trifoliate & Fan-Shaped Retractors",
            model: "101-078",
            image: "fan-retractor",
            gallery: ["fan-retractors"],
            short: "Three- and five-blade retractors that open like a fan, Φ5 and Φ10 × 330 mm.",
            body: "Retractors whose blades open like a fan to hold back organs: trifoliate (three-blade) forceps in Φ5 mm, one with a ring handle, and fan-shaped retractors in Φ5 and Φ10 mm.",
            highlights: ["Three- and five-blade", "Φ5 and Φ10 × 330 mm", "Ring-handle version"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["101-076", "Trifoliate forceps, with handle, Φ5 × 330 mm"],
                  ["101-079", "Trifoliate forceps, Φ5 × 330 mm"],
                  ["101-078.1", "Fan-shaped forceps, Φ5 × 330 mm"],
                  ["101-078", "Fan-shaped forceps, Φ10 × 330 mm"],
                ],
              },
            ],
          },
          {
            name: "Loop Retractor with Interchangeable Loops",
            model: "101-156",
            image: "organ-retractor",
            gallery: ["organ-retractor-loops"],
            short: "Retractor handle with interchangeable wire loops in large, medium, small and A shapes.",
            body: "A retractor with a handle and interchangeable wire loops, in large (101-158), medium (101-156), small (101-157) and A-shaped (101-159) patterns.",
            highlights: ["Four loop shapes", "Interchangeable loops"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["101-156", "Retractor with loop"],
                  ["101-158", "Loop (L)"],
                  ["101-156", "Loop (M)"],
                  ["101-157", "Loop (S)"],
                  ["101-159", "Loop (A)"],
                ],
              },
            ],
          },
          {
            name: "Bile Duct Knife",
            model: "101-141",
            image: "bile-duct-knife",
            short: "Bile duct knives in Φ10 and Φ5 × 330 mm.",
            body: "Laparoscopic bile duct knives with a fine blade, in Φ10 mm (101-141) and Φ5 mm (101-140), both 330 mm long.",
            highlights: ["Φ10 and Φ5 mm", "330 mm working length"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["101-141", "Bile duct knife, Φ10 × 330 mm"],
                  ["101-140", "Bile duct knife, Φ5 × 330 mm"],
                ],
              },
            ],
          },
          {
            name: "Spring Forceps",
            model: "101-072",
            image: "spring-forceps",
            short: "Φ5 × 330 mm spring forceps with a wire spring handle, in two jaw patterns.",
            body: "Φ5 × 330 mm spring forceps with a wire spring handle that holds the jaws closed, in two jaw patterns (101-072 and 101-073).",
            highlights: ["Wire spring handle", "Two jaw patterns", "Φ5 × 330 mm"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["101-072", "Spring forceps, Φ5 × 330 mm"],
                  ["101-073", "Spring forceps, Φ5 × 330 mm"],
                ],
              },
            ],
          },
          {
            name: "Cholangiography Forceps",
            model: "101-080",
            image: "cholangiography-forceps",
            short: "Φ5 × 330 mm cholangiography forceps with a ring handle.",
            body: "A Φ5 × 330 mm cholangiography forceps with a ring handle, for laparoscopic cholangiography.",
            highlights: ["Φ5 × 330 mm", "Ring handle"],
            specs: [{ label: "Versions", items: [["101-080", "Cholangiography forceps, Φ5 × 330 mm"]] }],
          },
          {
            name: "Lithotomy Forceps",
            model: "101-107",
            image: "lithotomy-forceps",
            short: "Ring-handled lithotomy forceps with cupped jaws and ratchet.",
            body: "Lithotomy (stone) forceps with long ring handles, a ratchet and cupped jaws.",
            highlights: ["Cupped jaws", "Ring handles with ratchet"],
            specs: [{ label: "Versions", items: [["101-107", "Lithotomy forceps"]] }],
          },
          {
            name: "Hernia Repair Instruments",
            model: "101-060",
            image: "hernia-instruments",
            short: "Instruments for laparoscopic hernia repair.",
            body: "Instruments for laparoscopic hernia repair, as shown in the catalogue: 101-060 with a ring handle, 101-024 with a scissor-grip handle and pointed jaws, and 101-061 with a three-ring syringe-type handle.",
            highlights: ["Three instruments", "For laparoscopic hernia repair"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["101-060", "Hernia repair instrument"],
                  ["101-024", "Hernia repair instrument"],
                  ["101-061", "Hernia repair instrument"],
                ],
              },
            ],
          },
        ],
      },
      {
        name: "Laparoscopy Sets & Systems",
        short: "Complete instrument sets in 3, 5 and 10 mm, single-port systems and training boxes.",
        products: [
          {
            name: "Laparoscopy Instrument Set",
            model: "5 / 10 mm",
            featured: true,
            image: "laparoscopy-set",
            gallery: ["laparoscope", "clip-applicator", "trocar-cross", "needle-holder"],
            short: "A complete 5 and 10 mm set: laparoscope, trocars, graspers, scissors, clip applicator, electrodes and suction.",
            body: "A complete set for general laparoscopic surgery, built from the catalogue's 5 and 10 mm instruments: a Φ10 × 330 mm 30° laparoscope, trocars and a Veress needle, scissors and dissectors, graspers, biopsy forceps, a clip applicator, hook, blunt and spatula electrodes, a suction and irrigation tube, a needle holder and a fan-shaped retractor.\n\nThe set can be quoted as listed or adjusted to the procedures you perform.",
            highlights: ["30° laparoscope included", "26 items", "5 and 10 mm", "Adjustable to your procedures"],
            specs: [
              {
                label: "Optics and access",
                items: [
                  ["Laparoscope", "Φ10 × 330 mm, 30°"],
                  ["101-022", "Trocar, Φ5 × 95 mm"],
                  ["101-025", "Trocar, Φ10 × 95 mm"],
                  ["101-128", "Reducer, Φ10–Φ5 mm"],
                  ["101-139", "Veress needle, Φ2 × 120 mm"],
                ],
              },
              {
                label: "5 mm instruments (Φ5 × 330 mm)",
                items: [
                  ["101-054", "Scissors, straight, single action"],
                  ["101-055", "Scissors, curved, single action"],
                  ["101-053", "Hook scissors"],
                  ["101-058", "Dissecting forceps, straight, double action"],
                  ["101-059", "Dissecting forceps, curved, double action"],
                  ["101-063", "Babcock forceps, double action"],
                  ["101-066", "Grasping forceps, fenestrated atraumatic, double action"],
                  ["101-084", "Alligator forceps"],
                  ["101-089", "Biopsy forceps"],
                  ["101-171", "Anastomosis traction forceps"],
                  ["101-108", "Needle holder, straight"],
                  ["101-134", "Hook electrode"],
                  ["101-136", "Blunt electrode"],
                  ["101-137", "Spatula electrode"],
                  ["101-130.1", "Suction & irrigation tube"],
                ],
              },
              {
                label: "10 mm instruments (Φ10 × 330 mm)",
                items: [
                  ["101-002", "Clip applicator, double action"],
                  ["101-010", "Biopsy applicator"],
                  ["101-176", "Large grasping forceps"],
                  ["101-009", "Babcock forceps, plastic handle"],
                  ["101-130", "Suction & irrigation tube, detachable"],
                  ["101-078.1", "Fan-shaped forceps, bendable"],
                ],
              },
            ],
          },
          {
            name: "3 mm Laparoscopy Instrument Set",
            model: "102 series",
            image: "paediatric-3mm-instrument",
            short: "Φ3 × 330 mm instruments with Φ5 mm clip applicator, Φ3 mm electrodes, suction and a 3 mm trocar.",
            body: "A 3 mm set for mini-laparoscopy, with Φ3 × 330 mm dissecting forceps, scissors, graspers and biopsy forceps, spring forceps, Φ3 × 300 mm electrodes, a Φ3 mm suction and irrigation tube, a Φ5 mm clip applicator, a cross-sealing Φ3 mm trocar and a Φ5–3 mm reducer.",
            highlights: ["Φ3 × 330 mm instruments", "Φ3 mm trocar and reducer", "Electrodes and suction included"],
            specs: [
              {
                label: "Instruments (Φ3 × 330 mm)",
                items: [
                  ["102-014", "Dissecting forceps, straight, double action"],
                  ["102-015", "Dissecting forceps, curved, double action"],
                  ["102-027", "Scissors, straight, single action"],
                  ["102-025", "Scissors, curved, single action"],
                  ["102-026", "Scissors, straight, double action"],
                  ["102-012", "Scissors, curved, double action"],
                  ["102-006", "Alligator grasping forceps"],
                  ["102-003", "Universal forceps"],
                  ["102-008", "Biopsy forceps"],
                  ["102-009", "Biopsy forceps"],
                  ["102-028", "Spring forceps"],
                  ["102-032", "Suction & irrigation tube"],
                ],
              },
              {
                label: "Electrodes (Φ3 × 300 mm)",
                items: [
                  ["102-029", "Blunt electrode"],
                  ["102-030", "Hook electrode"],
                  ["102-031", "Spatula electrode"],
                ],
              },
              {
                label: "Clip applicator and access",
                items: [
                  ["102-001", "Clip applicator, single action, Φ5 × 330 mm"],
                  ["102-022.1", "Trocar, cross sealing, Φ3 × 95 mm"],
                  ["102-033", "Reducer, Φ5–3 × 95 mm"],
                ],
              },
            ],
          },
          {
            name: "Short Laparoscopy Instrument Set, 200–250 mm",
            model: "106 series",
            image: "short-instrument",
            gallery: ["short-clip-applicator"],
            short: "Φ5 × 200 mm instruments and Φ10 × 250 mm applicators, with retractors and optional bile duct needles.",
            body: "A set of shorter instruments: Φ5 × 200 mm dissecting forceps, scissors, knot forceps, electrodes, spring forceps and suction tube, Φ10 × 250 mm clip and biopsy applicators, and L and S retractors.\n\nOptional items include a movable retractor, an appendix retractor, two bile duct needles and a prop opening apparatus.",
            highlights: ["Φ5 × 200 mm instruments", "Φ10 × 250 mm applicators", "Retractors included", "Optional items"],
            specs: [
              {
                label: "Set",
                items: [
                  ["106-011", "Clip applicator, Φ10 × 250 mm"],
                  ["106-002", "Biopsy applicator, Φ10 × 250 mm"],
                  ["106-003", "Dissecting forceps, curved, double action, Φ5 × 200 mm"],
                  ["106-004", "Dissecting forceps, straight, double action, Φ5 × 200 mm"],
                  ["106-005", "Scissors, curved, single action, Φ5 × 200 mm"],
                  ["106-006", "Scissors, straight, single action, Φ5 × 200 mm"],
                  ["106-007", "Knot forceps, Φ5 × 200 mm"],
                  ["106-008", "Hook electrode, Φ5 × 200 mm"],
                  ["106-009", "Blunt electrode, Φ5 × 200 mm"],
                  ["106-010", "Spring forceps, Φ5 × 200 mm"],
                  ["101-130.1", "Suction & irrigation tube, Φ5 × 200 mm"],
                  ["106-013", "Retractor LLG-1 (L)"],
                  ["106-014", "Retractor SLG-1 (S)"],
                ],
              },
              {
                label: "Optional",
                items: [
                  ["106-015", "Movable retractor"],
                  ["106-016", "Appendix retractor"],
                  ["106-017", "Bile duct needle"],
                  ["106-018", "Bile duct needle"],
                  ["106-052", "Prop opening apparatus (CKQ-F)"],
                ],
              },
            ],
          },
          {
            name: "Single-Port Laparoscopy System",
            model: "104 series",
            image: "single-port-system",
            short: "Multi-channel port with curved, pre-bent instruments for single-incision laparoscopy.",
            body: "A system for single-incision laparoscopy: a multi-channel port with insufflation lines, a flexible cannula and punctures, and curved instruments — scissors, duck-mouth and Babcock graspers, a Maryland dissector, a clip applicator, a suction and irrigation tube and hook and ball electrodes.\n\nOptional instruments include a rat-tooth grasper, a heavy grasper, a polymer clip applicator and a needle holder.",
            highlights: ["Multi-channel port", "Curved instruments", "Optional instruments"],
            specs: [
              {
                label: "Port and access",
                items: [
                  ["104-001", "Port"],
                  ["104-023", "Flexible cannula"],
                  ["104-024", "Puncture"],
                  ["104-025", "Puncture"],
                ],
              },
              {
                label: "Instruments",
                items: [
                  ["104-009", "Scissors, curved, double action"],
                  ["104-005", "Grasper, duck mouth, double action"],
                  ["104-007", "Maryland dissector, curved, double action"],
                  ["104-011", "Grasper, Babcock, double action"],
                  ["104-018", "Clip applicator"],
                  ["104-130", "Suction & irrigation tube"],
                  ["104-020", "Hook electrode"],
                  ["104-021", "Ball electrode"],
                  ["104-013", "Electrode"],
                ],
              },
              {
                label: "Optional",
                items: [
                  ["104-004", "Grasper, rat tooth, double action"],
                  ["104-016", "Grasper, heavy, double action"],
                  ["104-002", "Polymer clip applicator"],
                  ["104-022", "Needle holder"],
                ],
              },
            ],
          },
          {
            name: "Laparoscopic Simulation System",
            model: "Training box",
            image: "simulation-system",
            short: "Training box with three instrument ports, for practising laparoscopic skills.",
            body: "A laparoscopic training box with three instrument ports for practising handling, dissection and suturing outside theatre. The catalogue pairs it with curved dissecting forceps, curved scissors, an atraumatic grasper and a needle holder.",
            highlights: ["Three instrument ports", "For training and skills practice"],
            specs: [
              {
                label: "Suggested instruments",
                items: [
                  ["101-059", "Dissecting forceps, curved (20 mm)"],
                  ["101-057", "Scissors, curved"],
                  ["101-066", "Atraumatic grasping forceps"],
                  ["101-108.1", "Needle holder, Φ5 × 330 mm"],
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Gynaecology Instruments",
    image: "uterine-manipulator",
    short: "Uterine manipulators, operating forceps and Φ1.6–Φ2.0 mm micro forceps.",
    description:
      "Instruments for gynaecological laparoscopy: uterine manipulators with interchangeable tips and cups, operating forceps for gynaecology, and fine Φ1.6 and Φ2.0 × 410 mm micro forceps.",
    procurement:
      "Quotations are prepared per code and quantity; manipulators can be quoted complete or with additional tips and cups.",
    subs: [
      {
        name: "Uterine Manipulators",
        short: "Manipulators with interchangeable tips, cups and drills.",
        products: [
          {
            name: "Uterine Manipulator",
            model: "204-001",
            featured: true,
            image: "uterine-manipulator",
            short: "Uterine manipulator with a ratchet handle and eight interchangeable tips.",
            body: "A uterine manipulator with a ratchet handle and a range of interchangeable tips (204-006 to 204-013) in different curves and lengths.",
            highlights: ["Ratchet handle", "Eight interchangeable tips"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["204-001", "Uterine manipulator"],
                  ["204-006", "Tip"],
                  ["204-007", "Tip"],
                  ["204-008", "Tip"],
                  ["204-009", "Tip"],
                  ["204-010", "Tip"],
                  ["204-011", "Tip"],
                  ["204-012", "Tip"],
                  ["204-013", "Tip"],
                ],
              },
            ],
          },
          {
            name: "Uterine Manipulator with Cups",
            model: "203 series",
            image: "uterine-manipulator-cups",
            gallery: ["uterine-manipulator-parts"],
            short: "Manipulator frame with lifting pole and head, cups in three sizes, myoma drills and measuring rod.",
            body: "A modular uterine manipulator: a T-handled frame with a lifting pole and lifting head, cups in large, medium and small, two myoma drills and a measuring rod.",
            highlights: ["Cups in L, M and S", "Myoma drills", "Measuring rod"],
            specs: [
              {
                label: "Parts",
                items: [
                  ["203-001", "Frame"],
                  ["203-002", "Lifting pole"],
                  ["203-003", "Lifting head"],
                  ["203-004", "Afterburner"],
                  ["203-005", "Myoma drill"],
                  ["203-011", "Myoma drill"],
                  ["203-008", "Cup (S)"],
                  ["203-009", "Cup (M)"],
                  ["203-010", "Cup (L)"],
                  ["203-012", "Measuring rod"],
                ],
              },
            ],
          },
        ],
      },
      {
        name: "Gynaecology Operating Instruments",
        short: "Operating forceps for gynaecology and fine micro forceps.",
        products: [
          {
            name: "Operating Forceps for Gynaecology",
            model: "205-001",
            image: "gynaecology-forceps",
            short: "Φ7 × 250 mm biopsy applicator and Φ5 × 250 mm operating forceps.",
            body: "Operating forceps for gynaecology with in-line ring handles: a Φ7 × 250 mm biopsy applicator (205-001) and two Φ5 × 250 mm forceps (106-056, 106-055).",
            highlights: ["Φ7 and Φ5 mm", "250 mm working length"],
            specs: [
              {
                label: "Versions",
                items: [
                  ["205-001", "Biopsy applicator, Φ7 × 250 mm"],
                  ["106-056", "Operating forceps, Φ5 × 250 mm"],
                  ["106-055", "Operating forceps, Φ5 × 250 mm"],
                ],
              },
            ],
          },
          {
            name: "Micro Forceps, Φ1.6 & Φ2.0 × 410 mm",
            model: "201 series",
            image: "micro-forceps",
            gallery: ["micro-forceps-tip"],
            short: "Eighteen fine forceps and scissors, Φ1.6 and Φ2.0 mm with a 410 mm working length.",
            body: "Fine forceps with ring handles and a 410 mm working length, in Φ1.6 and Φ2.0 mm, with eighteen jaw patterns including scissors, graspers and toothed forceps (201-31 to 201-48).",
            highlights: ["Φ1.6 and Φ2.0 mm", "410 mm working length", "18 jaw patterns"],
            specs: [
              {
                label: "Φ1.6 × 410 mm",
                items: [
                  ["201-31", "Φ1.6 × 410 mm"],
                  ["201-32", "Φ1.6 × 410 mm"],
                  ["201-33", "Φ1.6 × 410 mm"],
                  ["201-34", "Φ1.6 × 410 mm"],
                  ["201-39", "Φ1.6 × 410 mm"],
                  ["201-41", "Φ1.6 × 410 mm"],
                  ["201-45", "Φ1.6 × 410 mm"],
                  ["201-46", "Φ1.6 × 410 mm"],
                ],
              },
              {
                label: "Φ2.0 × 410 mm",
                items: [
                  ["201-35", "Φ2.0 × 410 mm"],
                  ["201-36", "Φ2.0 × 410 mm"],
                  ["201-37", "Φ2.0 × 410 mm"],
                  ["201-38", "Φ2.0 × 410 mm"],
                  ["201-40", "Φ2.0 × 410 mm"],
                  ["201-42", "Φ2.0 × 410 mm"],
                  ["201-43", "Φ2.0 × 410 mm"],
                  ["201-44", "Φ2.0 × 410 mm"],
                  ["201-47", "Φ2.0 × 410 mm"],
                  ["201-48", "Φ2.0 × 410 mm"],
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Endoscopy Systems",
    image: "zms-ps046a",
    featured: true,
    short: "Portable HD and Full HD endoscopy units, camera systems and irrigation pumps.",
    description:
      "Endoscopy equipment for laparoscopy, gynaecology, urology, ENT and orthopaedics: portable units that combine camera, LED light source, monitor and recorder in one case, a Full HD camera system and an irrigation pump.",
    procurement:
      "Quotations list the unit, camera head, light cable and accessories. Installation and user orientation can be included.",
    subs: [
      {
        name: "Portable Endoscopy Units",
        short: "Camera, LED light source, monitor and recorder in one portable unit.",
        products: [
          {
            name: "HD Portable Endoscopy Unit ZMS-PS046A",
            model: "ZMS-PS046A",
            featured: true,
            image: "zms-ps046a",
            gallery: ["zms-ps046a-case"],
            short: "4-in-1 portable unit: HD camera, 80 W LED light source, 17-inch monitor and HD recorder, with carry case.",
            body: "A portable endoscopy unit that combines four devices in one: an HD camera, a high-brightness 80 W LED light source, a 17-inch HD monitor and an HD recorder. It travels in its own suitcase and suits both diagnosis and surgery.\n\nApplications include laparoscopy, gynaecology, urology, ENT and orthopaedics.",
            highlights: ["Camera, LED light, monitor and recorder", "17-inch HD monitor", "80 W LED light source", "Carry case included"],
            specs: [
              { label: "Medical monitor", items: [["LCD screen", "17", "inch"], ["Colour", "10.7 billion"], ["Aspect ratio", "5:4"]] },
              {
                label: "Endoscope HD camera",
                items: [
                  ["Image device", "1/2.8 CMOS"],
                  ["SNR", "≥ 50", "dB"],
                  ["System", "PAL"],
                  ["Scanning", "Progressive"],
                  ["Horizontal resolution", "1000 TVL"],
                  ["Brightness", "ODS adjustable"],
                  ["White balance", "Auto / manual"],
                  ["AG", "Low / medium / high / off, adjustable"],
                  ["Minimum illumination", "F1.2 ≤ 0.1 Lx"],
                  ["DNR", "3D"],
                  ["OSD control menu", "Built-in and external"],
                ],
              },
              {
                label: "LED light source",
                items: [
                  ["Input power", "80", "VA"],
                  ["Light source", "LED"],
                  ["Brightness", "≥ 1,200,000", "Lux"],
                  ["Colour temperature", "≥ 6500", "K"],
                  ["Light output hole diameter", "φ (10 ± 0.10)", "mm"],
                  ["Working conditions", "5 °C to +40 °C"],
                  ["Storage conditions", "−40 °C to +55 °C"],
                  ["Continuous working hours", "> 4", "h"],
                ],
              },
              {
                label: "HD recorder",
                items: [
                  ["Recording format", "MP4"],
                  ["Recording quality", "Max 18 Mbps @ 1080P 30 fps"],
                  ["External USB flash disk", "Max 64 GB"],
                  ["External mobile HDD", "Max 2 TB"],
                  ["Recorder interface", "USB disk and removable hard disk"],
                ],
              },
            ],
          },
          {
            name: "Portable FHD Endoscopy Unit SY-GW621",
            model: "SY-GW621",
            image: "sy-gw621",
            gallery: ["sy-gw621-camera"],
            short: "Full HD 1920 × 1080 unit with 21-inch screen, camera, LED light source and recorder, menus in five languages.",
            body: "A portable Full HD (1920 × 1080) endoscopy unit combining a medical Full HD endoscope camera, a 21-inch medical monitor, an HD recorder and an LED light source, with separate menus for the light source, camera and monitor and multiple output ports.\n\nIt works in several modes — laparoscopy, hysteroscopy, ENT and fibrescope — takes pictures and records video, can eliminate moiré, and offers menus in English, Spanish, Russian, French and Portuguese.",
            highlights: ["Full HD 1920 × 1080", "21-inch screen", "Multi-mode", "Five menu languages"],
            specs: [
              { label: "Medical monitor", items: [["LED screen", "21", "inch"]] },
              {
                label: "Endoscope Full HD camera",
                items: [
                  ["Image device", "1/1.8 CMOS"],
                  ["SNR", "≥ 50", "dB"],
                  ["Scan frequency", "N: 60 Hz, P: 60 Hz"],
                  ["Total pixels", "N: 2010 (H) × 1108 (V), P: 2010 (H) × 1118 (V)"],
                  ["Scanning mode", "Progressive"],
                  ["Horizontal resolution", "1200 TVL"],
                  ["White balance", "Auto / manual"],
                  ["Minimum illumination", "F1.2 ≤ 0.1 Lx"],
                ],
              },
              {
                label: "LED light source",
                items: [
                  ["Input power", "120", "VA"],
                  ["Light source", "LED"],
                  ["Brightness", "≥ 1,200,000", "Lux"],
                  ["Colour temperature", "≥ 6500", "K"],
                ],
              },
              {
                label: "HD recorder",
                items: [
                  ["Recording format", "MP4"],
                  ["Recording quality", "Max 18 Mbps @ 1080P 30 fps"],
                  ["External USB flash disk", "Max 64 GB"],
                  ["External mobile HDD", "Max 2 TB"],
                ],
              },
            ],
          },
          {
            name: "Portable HD Endoscopy Unit SY-GW605",
            model: "SY-GW605",
            image: "sy-gw605",
            gallery: ["sy-gw605-camera"],
            short: "Laptop-style unit with Full HD camera, 17-inch monitor, HD recorder and LED light source; HDMI × 2, SDI, CVBS, VGA and USB.",
            body: "A laptop-style portable endoscopy unit combining a medical Full HD endoscope camera, a 17-inch medical monitor, an HD recorder and an LED light source, with 1080 HD video output on HDMI × 2, SDI, CVBS, VGA and USB.\n\nApplications include laparoscopy, gynaecology, urology, ENT and orthopaedics.",
            highlights: ["1080 HD output", "17-inch monitor", "HDMI × 2, SDI, CVBS, VGA, USB", "LED light source"],
            specs: [
              { label: "Medical monitor", items: [["LCD screen", "17", "inch"], ["Colour", "10.7 billion"], ["Aspect ratio", "5:4"]] },
              {
                label: "Endoscope Full HD camera",
                items: [
                  ["Image device", "1/1.8 CMOS"],
                  ["SNR", "≥ 50", "dB"],
                  ["System", "PAL"],
                  ["Total pixels", "N: 2010 (H) × 1108 (V), P: 2010 (H) × 1118 (V)"],
                  ["Effective pixels", "N: 1920 (H) × 1080 (V), P: 1920 (H) × 1080 (V)"],
                  ["Scanning system", "2:1 progressive"],
                  ["Scan frequency", "N: 60 Hz, P: 60 Hz"],
                  ["Horizontal resolution", "1100 TVL"],
                  ["Minimum illumination", "F1.2 ≤ 0.11 Lx"],
                  ["Electronic shutter", "1/50 (60) s – 1/60,000 s"],
                  ["Brightness", "ODS adjustable"],
                  ["Backlight processing", "Wide dynamic (adjustable), backlight compensation, strong inhibition"],
                  ["Synchronous system", "Internal synchronisation"],
                  ["White balance", "Auto / manual"],
                  ["Acutance & saturation", "On / off, adjustable"],
                  ["AG", "Low / medium / high / off, adjustable"],
                  ["Rollovers", "On / off"],
                  ["DNR", "3D"],
                  ["OSD control menu", "Built-in and external"],
                ],
              },
              {
                label: "LED light source",
                items: [
                  ["Input power", "80", "VA"],
                  ["Light source", "LED"],
                  ["Brightness", "≥ 1,200,000", "Lux"],
                  ["Colour temperature", "≥ 6500", "K"],
                  ["Light output hole diameter", "φ (10 ± 0.10)", "mm"],
                  ["Working conditions", "5 °C to +40 °C"],
                  ["Storage conditions", "−40 °C to +55 °C"],
                  ["Continuous working hours", "> 4", "h"],
                ],
              },
              {
                label: "HD recorder",
                items: [
                  ["Recording format", "MP4"],
                  ["Recording quality", "Max 18 Mbps @ 1080P 30 fps"],
                  ["External USB flash disk", "Max 64 GB"],
                  ["External mobile HDD", "Max 2 TB"],
                  ["Recorder interface", "USB disk and removable hard disk"],
                ],
              },
            ],
          },
        ],
      },
      {
        name: "Cameras & Pumps",
        short: "Full HD endoscopy camera system and irrigation pump.",
        products: [
          {
            name: "Full HD Endoscopy Camera System NCM-S200",
            model: "NCM-S200",
            image: "ncm-s200",
            short: "1920 × 1080 60 fps camera system with Sony CMOS, recording and four-screen display; HDMI, DVI, SDI, CVBS and USB out.",
            body: "A Full HD endoscopy camera system with a 1/1.8\" Sony CMOS sensor, 1920 × 1080 progressive scanning at 60 fps and a 7-inch monitor.\n\nIt records video, captures images, plays them back, takes a mouse and can show four screens at once, with HDMI, DVI, SDI, CVBS and USB outputs.",
            highlights: ["1920 × 1080 at 60 fps", "1/1.8\" Sony CMOS", "Record, capture and playback", "HDMI, DVI, SDI, CVBS, USB"],
            specs: [
              {
                label: "Camera system",
                items: [
                  ["Camera", "1/1.8\" Sony CMOS"],
                  ["Image size (H × V)", "1920 × 1080P"],
                  ["Scanning system", "Progressive scanning"],
                  ["Frame rate", "1920 × 1080, 60 fps"],
                  ["Signal-to-noise ratio", "≥ 54", "dB"],
                  ["Processor output", "HDMI + DVI + SDI + CVBS + USB"],
                  ["Monitor", "7", "inch"],
                  ["Features", "Record video, capture image, playback, connect mouse, four-screen display"],
                ],
              },
            ],
          },
          {
            name: "Irrigation Pump SY-GWG200",
            model: "SY-GWG200",
            image: "sy-gwg200",
            short: "Two-channel peristaltic irrigation pump with pressure sensor, 15–400 mmHg and 0.1–1.0 L/min.",
            body: "A roller (peristaltic) irrigation pump with two channels and a high-sensitivity pressure sensor, for orthopaedics, gynaecology and urology. The roller pump gives a large flow; pressure is adjustable on request and monitored in real time.\n\nThe irrigation tube can be autoclaved to avoid secondary contamination, and the emulsion tube and shim are replaceable (5 pieces, approx. 16 cm). Accessories: irrigation tube, thrusting needle, silastic tubing and connector.",
            highlights: ["Two-channel roller pump", "15–400 mmHg", "0.1–1.0 L/min", "Autoclavable irrigation tube"],
            specs: [
              {
                label: "Technical parameters",
                items: [
                  ["Supply voltage", "110–230 V, 50 Hz"],
                  ["Power", "150", "VA"],
                  ["Pressure range", "15–400 mmHg (2–53.3 kPa)"],
                  ["Flow range", "0.1–1.0", "L/min"],
                  ["Noise", "≤ 70", "dB"],
                ],
              },
              {
                label: "Accessories",
                items: [
                  ["Irrigation tube", "Included"],
                  ["Thrusting needle", "Included"],
                  ["Silastic tubing", "Included"],
                  ["Connector", "Included"],
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Sterilization & Storage",
    image: "sterilization-tray",
    short: "Perforated sterilization trays for laparoscopic instruments.",
    description:
      "Perforated trays that hold laparoscopic instruments in place through cleaning, sterilization and storage.",
    procurement: "Trays are quoted to the instrument set they will hold.",
    subs: [
      {
        name: "Sterilization Trays",
        short: "Perforated trays with lid, latches and instrument holders.",
        products: [
          {
            name: "Laparoscopy Instrument Sterilization Tray",
            model: "HN tray",
            featured: true,
            image: "sterilization-tray",
            gallery: ["sterilization-tray-lid"],
            short: "Perforated tray with lid, latches and silicone instrument holders, marked HN Medical System.",
            body: "A long, fully perforated tray for laparoscopic instruments, with a perforated lid, latches at each end and removable silicone holders that keep instruments apart and in place.\n\nThe lid is marked \"HN Medical System, Rohtak\". Trays are quoted to the instrument set they will hold.",
            highlights: ["Perforated base and lid", "Silicone instrument holders", "Latching lid", "HN Medical System marking"],
            specs: [
              {
                label: "Construction",
                items: [
                  ["Base and lid", "Perforated"],
                  ["Closure", "Latches at each end"],
                  ["Instrument holders", "Removable silicone holders"],
                  ["Marking", "HN Medical System, Rohtak"],
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

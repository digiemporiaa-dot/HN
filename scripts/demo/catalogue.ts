/**
 * Demo catalogue for HN Medical.
 *
 * Written to read like a professional Indian B2B equipment supplier while
 * staying safe as sample content: generic equipment descriptions, typical
 * specification ranges rather than claims about a specific manufacturer's
 * model, no prices, no ratings, no clinical outcomes, no certifications.
 * Image keys refer to files in public/images/hn.
 */

export type DemoSpecGroup = { label: string; items: Array<[string, string, string?]> };

export type DemoProduct = {
  name: string;
  short: string;
  body: string;
  image: string;
  alt?: boolean;
  featured?: boolean;
  brand: string;
  highlights: string[];
  features: Array<[string, string]>;
  specs: DemoSpecGroup[];
  applications: string[];
  specialties: string[];
  solutions: string[];
};

export type DemoSub = { name: string; short: string; products: DemoProduct[] };

export type DemoCategory = {
  name: string;
  image: string;
  short: string;
  description: string;
  procurement: string;
  featured?: boolean;
  subs: DemoSub[];
};

const QUOTE_NOTE =
  "Configurations, accessories and installation scope are confirmed at quotation stage.";

export const CATALOGUE: DemoCategory[] = [
  {
    name: "Patient Monitoring",
    image: "patient-monitoring",
    featured: true,
    short: "Bedside, transport and central monitoring for wards, ICUs and theatres.",
    description:
      "Patient monitoring systems for continuous observation of vital signs across critical care, operation theatres, emergency and general wards.\n\nWe help institutions select the right parameter set, screen size and networking option for each department, and plan central monitoring where several beds need to be observed from one place.",
    procurement:
      "A typical quotation covers the monitor, standard accessories (ECG cables, SpO₂ sensor, NIBP cuffs), mounting options and installation. Parameter modules, central station licences and extended accessories are listed separately so each department can be configured to its need.",
    subs: [
      {
        name: "Bedside Monitors",
        short: "Multi-parameter monitors for ICU, HDU and ward beds.",
        products: [
          {
            name: "Multi-Parameter Patient Monitor",
            image: "patient-monitor",
            alt: true,
            featured: true,
            brand: "Alpha",
            short: "Bedside monitoring of ECG, SpO₂, NIBP, respiration and temperature on a 12-inch touchscreen.",
            body: "A bedside monitor for continuous observation of vital signs in intensive care, high-dependency and general ward settings. Standard parameters include **ECG**, **SpO₂**, **non-invasive blood pressure**, respiration and temperature, with optional modules for invasive pressure and EtCO₂.\n\nThe interface is designed for quick review at the bedside, with configurable alarm limits, trend review and the option to connect to a central monitoring station.",
            highlights: ["12.1-inch colour touchscreen", "5-parameter standard configuration", "Optional IBP and EtCO₂ modules", "Central station connectivity"],
            features: [
              ["Clear bedside display", "Large numerics and up to eight waveforms, with layouts configurable by department."],
              ["Alarm management", "Three-level visual and audible alarms with adjustable limits and an alarm history log."],
              ["Trend review", "Graphical and tabular trends to support handover and clinical review."],
              ["Flexible mounting", "Bedside shelf, wall bracket, pendant or rolling stand options."],
            ],
            specs: [
              { label: "Display", items: [["Screen", "12.1-inch colour TFT touchscreen"], ["Waveforms", "Up to 8"], ["Resolution", "1280 × 800", "px"]] },
              { label: "Parameters", items: [["Standard", "ECG, SpO₂, NIBP, RESP, TEMP"], ["Optional", "IBP (2 channels), EtCO₂"], ["ECG leads", "3 / 5 lead"]] },
              { label: "Power & connectivity", items: [["Battery", "Internal Li-ion, up to 4 hours typical"], ["Network", "Wired LAN, optional Wi-Fi"], ["Power supply", "100–240 V AC, 50/60 Hz"]] },
            ],
            applications: ["Intensive Care Unit", "Operation Theatre", "Emergency Department"],
            specialties: ["Critical Care", "Cardiology", "Emergency Medicine"],
            solutions: ["Critical Care Solutions", "Patient Monitoring Systems"],
          },
          {
            name: "Compact Transport Monitor",
            image: "transport-monitor",
            brand: "Alpha",
            short: "Lightweight monitor for intra-hospital transfers, recovery and day-care areas.",
            body: "A compact monitor for patients moving between departments or recovering after procedures. It offers the essential vital-sign parameters in a lightweight, handle-equipped housing with battery operation for transfers.\n\nSettings and patient data can be carried over when the patient returns to a networked bedside monitor, depending on configuration.",
            highlights: ["Integrated carry handle", "Battery operation for transfers", "ECG, SpO₂, NIBP standard", "Recovery and day-care use"],
            features: [
              ["Built for movement", "A compact housing and handle make transfers between departments straightforward."],
              ["Essential parameters", "ECG, SpO₂ and NIBP as standard, with temperature as an option."],
              ["Readable at a glance", "High-contrast numerics remain readable in bright corridors and lifts."],
            ],
            specs: [
              { label: "Display", items: [["Screen", "8–10 inch colour display"], ["Waveforms", "Up to 4"]] },
              { label: "Parameters", items: [["Standard", "ECG, SpO₂, NIBP"], ["Optional", "TEMP"]] },
              { label: "Physical", items: [["Weight", "Approx. 2.5", "kg"], ["Battery", "Internal rechargeable"]] },
            ],
            applications: ["Emergency Department", "Intensive Care Unit"],
            specialties: ["Emergency Medicine", "Critical Care"],
            solutions: ["Patient Monitoring Systems"],
          },
        ],
      },
      {
        name: "Central Monitoring",
        short: "Nurses' station systems that bring several beds onto one screen.",
        products: [
          {
            name: "Central Monitoring Station",
            image: "central-station",
            featured: true,
            brand: "Alpha",
            short: "Observe multiple networked bedside monitors from one nurses' station display.",
            body: "A central station that gathers waveforms, numerics and alarms from networked bedside monitors so a unit can be observed from the nurses' station.\n\nSystems are sized to the number of beds, with options for multiple displays, full disclosure review and integration planning with your IT team.",
            highlights: ["Multi-bed overview", "Alarm review and acknowledgement", "Full-disclosure review option", "Scalable by bed count"],
            features: [
              ["Unit-wide visibility", "Tiled bed views with colour-coded alarm priority."],
              ["Review tools", "Trend, event and waveform review for each connected bed."],
              ["Planned with your team", "Network and bed-count planning carried out before installation."],
            ],
            specs: [
              { label: "System", items: [["Beds per station", "Configurable, typically 8–32"], ["Displays", "Single or dual monitor"]] },
              { label: "Review", items: [["Trend storage", "Configurable retention"], ["Event review", "Alarm and arrhythmia events"]] },
            ],
            applications: ["Intensive Care Unit", "Hospital Wards"],
            specialties: ["Critical Care", "Cardiology"],
            solutions: ["Patient Monitoring Systems", "Critical Care Solutions"],
          },
        ],
      },
    ],
  },
  {
    name: "Critical Care",
    image: "critical-care",
    featured: true,
    short: "Ventilation and infusion therapy equipment for intensive care units.",
    description:
      "Critical care equipment for adult and paediatric intensive care, high-dependency units and step-down areas — from ICU ventilators to infusion and syringe pumps.\n\nWe work with ICU teams and biomedical engineers to match configurations to bed count, patient mix and existing infrastructure such as medical gas outlets and pendants.",
    procurement:
      "Quotations normally include the device, standard accessories, mounting, installation and user orientation. Consumables, extended warranties and service plans are itemised separately. " + QUOTE_NOTE,
    subs: [
      {
        name: "Ventilation",
        short: "ICU ventilators for invasive and non-invasive ventilation.",
        products: [
          {
            name: "ICU Ventilator",
            image: "icu-ventilator",
            alt: true,
            featured: true,
            brand: "Beta",
            short: "Invasive and non-invasive ventilation for adult and paediatric patients, with a 15-inch touchscreen.",
            body: "An intensive care ventilator offering volume- and pressure-controlled modes for invasive and non-invasive ventilation of adult and paediatric patients.\n\nA large touchscreen presents waveforms, loops and monitored values, with a mobile pedestal or pendant mounting to suit the ICU layout.",
            highlights: ["Volume and pressure modes", "Invasive and non-invasive ventilation", "15-inch touchscreen", "Pedestal or pendant mounting"],
            features: [
              ["Comprehensive modes", "Volume, pressure and spontaneous modes, with configuration depending on the selected package."],
              ["Waveforms and loops", "Real-time pressure, flow and volume curves to support review at the bedside."],
              ["Integrated humidification", "Compatible with heated humidifier systems and standard patient circuits."],
              ["Mobile pedestal", "Five-castor stand with brakes, or mounting on a ceiling pendant."],
            ],
            specs: [
              { label: "Ventilation", items: [["Patient types", "Adult, paediatric"], ["Tidal volume", "20–2000", "mL"], ["Respiratory rate", "1–80", "bpm"], ["PEEP", "0–35", "cmH₂O"]] },
              { label: "Display", items: [["Screen", "15-inch colour touchscreen"], ["Curves", "Pressure, flow, volume"]] },
              { label: "Gas & power", items: [["Gas supply", "O₂ and medical air pipeline"], ["Battery backup", "Internal, typical 60–120 minutes"]] },
            ],
            applications: ["Intensive Care Unit"],
            specialties: ["Critical Care", "Anaesthesiology"],
            solutions: ["Critical Care Solutions"],
          },
        ],
      },
      {
        name: "Infusion Therapy",
        short: "Volumetric infusion pumps and syringe pumps.",
        products: [
          {
            name: "Volumetric Infusion Pump",
            image: "infusion-pump",
            brand: "Gamma",
            short: "Pole-mounted volumetric pump for accurate delivery of IV fluids and medications.",
            body: "A volumetric infusion pump for controlled delivery of IV fluids and medications in wards, ICUs and theatres. It mounts on a standard IV pole and supports stacking where several lines are needed.\n\nA drug library option, occlusion detection and air-in-line alarms are typical of this class of device; exact features depend on the selected model.",
            highlights: ["Pole-clamp mounting", "Air-in-line and occlusion alarms", "Optional drug library", "Stackable configuration"],
            features: [
              ["Clear programming", "Rate, volume and time entry on a backlit display."],
              ["Safety alarms", "Occlusion, air-in-line, door-open and end-of-infusion alerts."],
              ["Battery operation", "Continues infusion during transfers."],
            ],
            specs: [
              { label: "Delivery", items: [["Flow rate", "0.1–1200", "mL/h"], ["VTBI", "0.1–9999", "mL"]] },
              { label: "Physical", items: [["Mounting", "Pole clamp"], ["Battery", "Internal rechargeable"]] },
            ],
            applications: ["Intensive Care Unit", "Hospital Wards", "Operation Theatre"],
            specialties: ["Critical Care", "General Surgery"],
            solutions: ["Critical Care Solutions"],
          },
          {
            name: "Syringe Pump",
            image: "syringe-pump",
            brand: "Gamma",
            short: "Precise syringe infusion for critical care, anaesthesia and neonatal units.",
            body: "A syringe pump for precise, low-volume infusions in critical care, anaesthesia and neonatal settings. It accepts common syringe sizes and offers bolus, purge and KVO functions.\n\nCompact and stackable, it can be used on a bedside shelf, a pole or a docking station.",
            highlights: ["Accepts common syringe sizes", "Bolus, purge and KVO", "Compact and stackable", "Occlusion pressure settings"],
            features: [
              ["Syringe recognition", "Supports 5 mL to 50/60 mL syringes from common brands."],
              ["Low-volume precision", "Suited to vasoactive drugs and neonatal infusions."],
              ["Quiet operation", "Designed for use in critical care and NICU environments."],
            ],
            specs: [
              { label: "Delivery", items: [["Syringe sizes", "5, 10, 20, 30, 50/60", "mL"], ["Flow rate", "0.01–1500", "mL/h"]] },
              { label: "Physical", items: [["Mounting", "Pole clamp or shelf"], ["Battery", "Internal rechargeable"]] },
            ],
            applications: ["Intensive Care Unit", "Neonatal ICU"],
            specialties: ["Critical Care", "Anaesthesiology", "Neonatology"],
            solutions: ["Critical Care Solutions"],
          },
        ],
      },
    ],
  },
  {
    name: "Operation Theatre",
    image: "operation-theatre",
    featured: true,
    short: "Surgical lights, operating tables and ceiling pendants for modern theatres.",
    description:
      "Operation theatre equipment for general and specialist surgical suites: LED surgical lights, electro-hydraulic operating tables and ceiling-mounted pendants.\n\nWe plan theatre equipment with your architects and surgical teams so mounting points, ceiling heights and gas outlets are coordinated before installation.",
    procurement:
      "Theatre projects are usually quoted as a package covering lights, table, pendants and installation, with ceiling-structure and electrical requirements confirmed at site survey. " + QUOTE_NOTE,
    subs: [
      {
        name: "Surgical Lights",
        short: "LED operating lights for the surgical field.",
        products: [
          {
            name: "LED Operation Theatre Light",
            image: "ot-light",
            featured: true,
            brand: "Delta",
            short: "Twin-dome LED surgical light with adjustable intensity and colour temperature.",
            body: "A ceiling-mounted twin-dome LED surgical light giving even, shadow-reduced illumination of the operating field. Intensity, field size and colour temperature are adjustable from the light handle or a wall panel.\n\nSingle-dome and camera-ready configurations are available for minor procedure rooms and teaching theatres.",
            highlights: ["Twin-dome configuration", "Adjustable colour temperature", "Shadow-reduced LED array", "Sterilisable handle"],
            features: [
              ["Even illumination", "Multi-LED array designed to reduce shadows from the surgical team."],
              ["Adjustable output", "Intensity and field size set to the procedure."],
              ["Low heat at the field", "LED technology keeps radiant heat at the operating field low."],
            ],
            specs: [
              { label: "Light output", items: [["Central illuminance", "Up to 160,000", "lux"], ["Colour temperature", "3,800–5,000", "K"], ["CRI", "≥ 95"]] },
              { label: "Mechanical", items: [["Configuration", "Twin dome, ceiling mounted"], ["Rotation", "360° arm rotation"]] },
            ],
            applications: ["Operation Theatre"],
            specialties: ["General Surgery", "Orthopaedics", "Gynaecology"],
            solutions: ["Surgical Infrastructure"],
          },
        ],
      },
      {
        name: "Operating Tables",
        short: "Electro-hydraulic tables for general and specialist surgery.",
        products: [
          {
            name: "Electro-Hydraulic Operating Table",
            image: "ot-table",
            alt: true,
            brand: "Delta",
            short: "Powered height, tilt and section adjustment with radiolucent tabletop options.",
            body: "An electro-hydraulic operating table with powered height, Trendelenburg, lateral tilt and back-section adjustment, operated from a corded hand control.\n\nAccessories for orthopaedic, gynaecological and neurosurgical positioning can be added, and radiolucent tabletop options support intra-operative imaging.",
            highlights: ["Powered positioning", "Radiolucent tabletop option", "Specialty accessories", "Battery backup"],
            features: [
              ["Smooth powered movement", "Height, tilt and sections adjusted from the hand control."],
              ["Modular accessories", "Leg plates, arm boards and specialty attachments."],
              ["Imaging compatible", "Radiolucent top option for C-arm access."],
            ],
            specs: [
              { label: "Positioning", items: [["Height range", "650–1050", "mm"], ["Trendelenburg", "± 25", "°"], ["Lateral tilt", "± 20", "°"]] },
              { label: "Capacity", items: [["Patient load", "Up to 250", "kg"], ["Tabletop", "Four or five section"]] },
            ],
            applications: ["Operation Theatre"],
            specialties: ["General Surgery", "Orthopaedics", "Gynaecology"],
            solutions: ["Surgical Infrastructure"],
          },
        ],
      },
      {
        name: "Ceiling Pendants",
        short: "Pendants for gas outlets, power and equipment shelves.",
        products: [
          {
            name: "Surgical Ceiling Pendant",
            image: "pendant",
            brand: "Delta",
            short: "Ceiling-mounted supply unit carrying medical gas outlets, power and equipment shelves.",
            body: "A ceiling pendant that keeps medical gases, electrical outlets and equipment shelves off the floor, improving access around the patient and simplifying cleaning.\n\nArm length, outlet configuration and shelf loads are specified per room at the planning stage.",
            highlights: ["Medical gas and power outlets", "Equipment shelves and rails", "Single or double arm", "Configured per room"],
            features: [
              ["Clear floor space", "Moves supply lines and devices off the floor."],
              ["Room-specific configuration", "Outlets and shelves planned with your team."],
            ],
            specs: [
              { label: "Configuration", items: [["Arms", "Single or double"], ["Gas outlets", "O₂, air, vacuum, N₂O as specified"]] },
            ],
            applications: ["Operation Theatre", "Intensive Care Unit"],
            specialties: ["General Surgery", "Anaesthesiology", "Critical Care"],
            solutions: ["Surgical Infrastructure", "Hospital Setup"],
          },
        ],
      },
    ],
  },
  {
    name: "Anaesthesia",
    image: "anaesthesia",
    short: "Anaesthesia workstations and accessories for operating theatres.",
    description:
      "Anaesthesia delivery systems for main theatres, day-care surgery and procedure rooms, configured with the ventilation, monitoring and vaporiser options your anaesthesia team specifies.",
    procurement:
      "Anaesthesia workstations are quoted with vaporisers, breathing systems and optional integrated monitoring listed individually. " + QUOTE_NOTE,
    subs: [
      {
        name: "Anaesthesia Workstations",
        short: "Integrated anaesthesia delivery and ventilation.",
        products: [
          {
            name: "Anaesthesia Workstation",
            image: "anaesthesia-workstation",
            alt: true,
            featured: true,
            brand: "Beta",
            short: "Integrated anaesthesia delivery with electronic ventilator, dual vaporiser mounts and gas monitoring options.",
            body: "An anaesthesia workstation combining gas delivery, an electronic ventilator and an integrated breathing system on a mobile cart with storage drawers.\n\nDual vaporiser mounts, auxiliary oxygen and optional agent and EtCO₂ monitoring allow the system to be configured to the theatre's case mix.",
            highlights: ["Electronic anaesthesia ventilator", "Dual vaporiser mounts", "Integrated breathing system", "Storage drawers and worktop"],
            features: [
              ["Ventilation modes", "Volume and pressure control with spontaneous support modes, depending on configuration."],
              ["Gas delivery", "O₂, air and N₂O flow control with hypoxic guard."],
              ["Monitoring options", "Agent, EtCO₂ and patient monitoring integration."],
              ["Ergonomic cart", "Worktop, drawers and rails for accessories."],
            ],
            specs: [
              { label: "Ventilator", items: [["Tidal volume", "20–1500", "mL"], ["Modes", "VCV, PCV, SIMV, manual/spont."]] },
              { label: "Gas delivery", items: [["Gases", "O₂, air, N₂O"], ["Vaporiser mounts", "2 (Selectatec-type)"]] },
              { label: "Display", items: [["Screen", "12–15 inch colour display"]] },
            ],
            applications: ["Operation Theatre"],
            specialties: ["Anaesthesiology", "General Surgery"],
            solutions: ["Surgical Infrastructure"],
          },
        ],
      },
    ],
  },
  {
    name: "Surgical Equipment",
    image: "surgical-equipment",
    short: "Electrosurgical units and surgical suction for theatres and procedure rooms.",
    description:
      "Surgical equipment that sits alongside the operating table: electrosurgical generators, smoke and fluid management and surgical suction.",
    procurement:
      "Quotations include the generator or unit with standard accessories; reusable and single-use accessories are listed separately. " + QUOTE_NOTE,
    subs: [
      {
        name: "Electrosurgery",
        short: "Monopolar and bipolar electrosurgical generators.",
        products: [
          {
            name: "Electrosurgical Unit",
            image: "electrosurgical-unit",
            brand: "Sigma",
            short: "Monopolar and bipolar electrosurgical generator with cut, coag and blend modes.",
            body: "An electrosurgical generator offering monopolar cut, blend and coagulation modes alongside bipolar output, with a dual-pedal footswitch.\n\nOutput settings are shown on a clear front display, and return-electrode monitoring is available depending on configuration.",
            highlights: ["Monopolar and bipolar output", "Cut, blend and coag modes", "Dual-pedal footswitch", "Return-electrode monitoring"],
            features: [
              ["Versatile output", "Modes for general, gynaecological and urological procedures."],
              ["Clear settings", "Separate readouts for cut and coag power."],
            ],
            specs: [
              { label: "Output", items: [["Monopolar cut", "Up to 300–400", "W"], ["Bipolar", "Up to 70–100", "W"]] },
              { label: "Accessories", items: [["Standard", "Footswitch, handpiece, return electrode cable"]] },
            ],
            applications: ["Operation Theatre"],
            specialties: ["General Surgery", "Gynaecology"],
            solutions: ["Surgical Infrastructure"],
          },
        ],
      },
      {
        name: "Surgical Suction",
        short: "Mobile suction units for theatres and wards.",
        products: [
          {
            name: "Surgical Suction Unit",
            image: "suction-machine",
            brand: "Sigma",
            short: "Mobile high-vacuum suction unit with twin collection jars.",
            body: "A mobile suction unit for theatres, emergency departments and wards, with twin collection jars, a vacuum regulator and gauge, and overflow protection.\n\nIts castor base and handle make it easy to move between rooms.",
            highlights: ["Twin collection jars", "Adjustable vacuum regulator", "Overflow protection", "Mobile castor base"],
            features: [
              ["Reliable vacuum", "Oil-free pump with adjustable vacuum level."],
              ["Easy to clean", "Removable jars and accessible surfaces."],
            ],
            specs: [
              { label: "Performance", items: [["Maximum vacuum", "Up to −0.09", "MPa"], ["Flow", "Up to 40–60", "L/min"]] },
              { label: "Collection", items: [["Jars", "2 × 2.5 L"]] },
            ],
            applications: ["Operation Theatre", "Emergency Department"],
            specialties: ["General Surgery", "Emergency Medicine"],
            solutions: ["Surgical Infrastructure", "Emergency Care"],
          },
        ],
      },
    ],
  },
  {
    name: "Diagnostic Equipment",
    image: "diagnostic-equipment",
    featured: true,
    short: "ECG and ultrasound systems for clinics, hospitals and diagnostic centres.",
    description:
      "Diagnostic equipment for outpatient clinics, hospital departments and diagnostic centres, including 12-channel ECG and colour Doppler ultrasound systems.",
    procurement:
      "Ultrasound systems are quoted with the probes selected for your applications; software packages and printers are listed separately. " + QUOTE_NOTE,
    subs: [
      {
        name: "Cardiology Diagnostics",
        short: "Resting ECG for clinics and wards.",
        products: [
          {
            name: "12-Channel ECG Machine",
            image: "ecg-machine",
            brand: "Omega",
            short: "Resting 12-lead ECG with touchscreen review and built-in thermal printing.",
            body: "A 12-channel resting ECG machine for clinics, wards and emergency departments, with a tilting touchscreen, alphanumeric keyboard and built-in thermal printer.\n\nRecords can be printed, stored or exported, depending on configuration.",
            highlights: ["Simultaneous 12-lead acquisition", "Built-in thermal printer", "Touchscreen review", "Export options"],
            features: [
              ["Fast acquisition", "Simultaneous 12-lead recording."],
              ["Flexible output", "Print, store or export reports."],
            ],
            specs: [
              { label: "Acquisition", items: [["Leads", "Standard 12-lead"], ["Channels", "12, simultaneous"]] },
              { label: "Printing", items: [["Printer", "Built-in thermal"], ["Paper", "A4 or roll"]] },
            ],
            applications: ["Diagnostics", "Emergency Department"],
            specialties: ["Cardiology", "Emergency Medicine"],
            solutions: ["Diagnostics"],
          },
        ],
      },
      {
        name: "Ultrasound",
        short: "Cart-based colour Doppler systems.",
        products: [
          {
            name: "Colour Doppler Ultrasound System",
            image: "ultrasound",
            alt: true,
            featured: true,
            brand: "Omega",
            short: "Cart-based ultrasound with a 21.5-inch monitor, touch panel and multi-probe ports.",
            body: "A cart-based colour Doppler ultrasound system for radiology, obstetrics and gynaecology, cardiology and general imaging.\n\nThe articulating monitor, touch panel and multiple active probe ports support busy departments; probes and software packages are selected per application.",
            highlights: ["21.5-inch articulating monitor", "Touch-panel control", "Multiple active probe ports", "Application-specific probes"],
            features: [
              ["Ergonomic workflow", "Adjustable console and monitor arm for comfortable scanning."],
              ["Configurable by application", "Probe and software packages selected for each department."],
              ["Report and export", "DICOM and USB export options depending on configuration."],
            ],
            specs: [
              { label: "Display", items: [["Monitor", "21.5-inch LED, articulating arm"], ["Touch panel", "13-inch"]] },
              { label: "Imaging", items: [["Modes", "B, M, Colour, PW Doppler"], ["Probe ports", "4 active"]] },
            ],
            applications: ["Diagnostics"],
            specialties: ["Radiology", "Gynaecology", "Cardiology"],
            solutions: ["Diagnostics"],
          },
        ],
      },
    ],
  },
  {
    name: "Respiratory Care",
    image: "respiratory-care",
    short: "Oxygen therapy and transport ventilation for wards and emergency care.",
    description:
      "Respiratory care equipment from oxygen concentrators and high-flow oxygen therapy to transport ventilators for patient transfers.",
    procurement:
      "Respiratory equipment is quoted with standard circuits and humidification options listed separately. " + QUOTE_NOTE,
    subs: [
      {
        name: "Oxygen Therapy",
        short: "Concentrators and high-flow oxygen systems.",
        products: [
          {
            name: "Oxygen Concentrator",
            image: "oxygen-concentrator",
            alt: true,
            brand: "Gamma",
            short: "Stationary oxygen concentrator for wards, clinics and step-down care.",
            body: "A stationary oxygen concentrator for wards, clinics and step-down areas, with a flow meter, humidifier bottle and purity indicator.\n\nIts castor base and carry handle make it easy to position at the bedside.",
            highlights: ["Adjustable flow meter", "Oxygen purity indicator", "Humidifier bottle", "Mobile castor base"],
            features: [
              ["Continuous flow", "Adjustable flow with a clear flow meter."],
              ["Quiet operation", "Designed for ward and clinic environments."],
            ],
            specs: [
              { label: "Output", items: [["Flow range", "0.5–10", "L/min"], ["Purity", "93% ± 3% (typical)"]] },
              { label: "Physical", items: [["Weight", "Approx. 22–26", "kg"]] },
            ],
            applications: ["Hospital Wards"],
            specialties: ["Critical Care"],
            solutions: ["Hospital Setup"],
          },
          {
            name: "High-Flow Oxygen Therapy System",
            image: "high-flow",
            brand: "Beta",
            short: "Heated, humidified high-flow oxygen delivery on a mobile stand.",
            body: "A high-flow oxygen therapy system delivering heated, humidified gas through a nasal interface, mounted on a mobile stand with an integrated humidifier chamber.\n\nFlow, temperature and FiO₂ are set and displayed on the front panel.",
            highlights: ["Heated humidification", "Adjustable flow and FiO₂", "Mobile stand", "Adult and paediatric interfaces"],
            features: [
              ["Integrated humidifier", "Heated chamber for humidified delivery."],
              ["Simple controls", "Flow, temperature and FiO₂ on one display."],
            ],
            specs: [
              { label: "Delivery", items: [["Flow range", "2–80", "L/min"], ["FiO₂", "21–100", "%"]] },
            ],
            applications: ["Intensive Care Unit", "Hospital Wards"],
            specialties: ["Critical Care", "Emergency Medicine"],
            solutions: ["Critical Care Solutions"],
          },
        ],
      },
      {
        name: "Transport Ventilation",
        short: "Compact ventilators for transfers and emergency use.",
        products: [
          {
            name: "Transport Ventilator",
            image: "transport-ventilator",
            brand: "Beta",
            short: "Compact ventilator for intra- and inter-hospital transfers.",
            body: "A compact ventilator for moving ventilated patients between departments or facilities, with a protective bumper housing, carry handle and battery operation.\n\nIt supports common invasive and non-invasive modes in a lightweight package.",
            highlights: ["Protective bumper housing", "Battery operation", "Invasive and NIV modes", "Lightweight design"],
            features: [
              ["Built for transfer", "Rugged housing and handle for transport."],
              ["Essential modes", "Volume and pressure modes for transfers."],
            ],
            specs: [
              { label: "Ventilation", items: [["Tidal volume", "50–2000", "mL"], ["Modes", "VCV, PCV, SIMV, CPAP"]] },
              { label: "Physical", items: [["Weight", "Approx. 4–5", "kg"], ["Battery", "Up to 4 hours typical"]] },
            ],
            applications: ["Emergency Department", "Intensive Care Unit"],
            specialties: ["Emergency Medicine", "Critical Care"],
            solutions: ["Emergency Care"],
          },
        ],
      },
    ],
  },
  {
    name: "Neonatal Care",
    image: "neonatal-care",
    featured: true,
    short: "Warmers, incubators and phototherapy for labour rooms and NICUs.",
    description:
      "Neonatal care equipment for labour rooms, special newborn care units and NICUs: radiant warmers, incubators and LED phototherapy.",
    procurement:
      "Neonatal equipment is quoted with sensors and mattresses; consumables are listed separately. " + QUOTE_NOTE,
    subs: [
      {
        name: "Infant Warmers",
        short: "Radiant warmers for resuscitation and stabilisation.",
        products: [
          {
            name: "Infant Radiant Warmer",
            image: "infant-warmer",
            alt: true,
            featured: true,
            brand: "Sigma",
            short: "Servo-controlled radiant warmer with bassinet, display and storage cabinet.",
            body: "A servo-controlled radiant warmer for newborn resuscitation and stabilisation in labour rooms and NICUs, with a tilting bassinet, transparent side panels and a storage cabinet.\n\nSkin-temperature and manual modes are set from the display, with an examination light in the heater head.",
            highlights: ["Servo and manual modes", "Transparent drop-down sides", "Examination light", "Storage cabinet"],
            features: [
              ["Temperature control", "Skin-temperature servo control with alarms."],
              ["Easy access", "Drop-down side panels for procedures."],
            ],
            specs: [
              { label: "Heater", items: [["Control", "Servo / manual"], ["Heater power", "Up to 600", "W"]] },
              { label: "Bed", items: [["Tilt", "± 10–12", "°"]] },
            ],
            applications: ["Neonatal ICU"],
            specialties: ["Neonatology", "Gynaecology"],
            solutions: ["Critical Care Solutions"],
          },
        ],
      },
      {
        name: "Incubators",
        short: "Closed incubators for thermal support.",
        products: [
          {
            name: "Infant Incubator",
            image: "incubator",
            brand: "Sigma",
            short: "Closed incubator with double-wall hood, access ports and humidity control.",
            body: "A closed infant incubator providing a controlled thermal environment, with a double-wall hood, hand-access ports and humidity control.\n\nThe cabinet base offers storage drawers and a height-adjustable stand depending on model.",
            highlights: ["Air and skin modes", "Humidity control", "Hand-access ports", "Storage base"],
            features: [
              ["Stable environment", "Air- and skin-controlled temperature modes."],
              ["Gentle access", "Quiet access ports and a removable hood."],
            ],
            specs: [
              { label: "Environment", items: [["Air temperature", "25–37 / 39 (override)", "°C"], ["Humidity", "Servo-controlled option"]] },
            ],
            applications: ["Neonatal ICU"],
            specialties: ["Neonatology"],
            solutions: ["Critical Care Solutions"],
          },
          {
            name: "LED Phototherapy Unit",
            image: "phototherapy",
            brand: "Sigma",
            short: "Blue-LED phototherapy on a mobile, height-adjustable stand.",
            body: "A blue-LED phototherapy unit on a mobile stand, used with warmers, incubators or cots. Height and angle adjust to position the light over the infant.",
            highlights: ["Blue-LED light source", "Height-adjustable stand", "Treatment timer", "Low heat output"],
            features: [["Flexible positioning", "Use over a warmer, incubator or cot."]],
            specs: [{ label: "Light", items: [["Source", "Blue LED"], ["Wavelength", "Approx. 450–475", "nm"]] }],
            applications: ["Neonatal ICU"],
            specialties: ["Neonatology"],
            solutions: ["Critical Care Solutions"],
          },
        ],
      },
    ],
  },
  {
    name: "Emergency Care",
    image: "emergency-care",
    featured: true,
    short: "Defibrillators, crash carts and stretchers for emergency departments.",
    description:
      "Emergency care equipment for emergency departments, casualty, ambulances and ward resuscitation points: defibrillators, crash carts and stretcher trolleys.",
    procurement:
      "Emergency equipment is often quoted as a resuscitation-point package — defibrillator, crash cart, suction and monitor. " + QUOTE_NOTE,
    subs: [
      {
        name: "Resuscitation",
        short: "Defibrillators and resuscitation equipment.",
        products: [
          {
            name: "Biphasic Defibrillator",
            image: "defibrillator",
            alt: true,
            featured: true,
            brand: "Alpha",
            short: "Manual and AED-mode biphasic defibrillator with ECG display and printer.",
            body: "A biphasic defibrillator offering manual and AED modes with an ECG display, external paddles and an optional printer and pacing module.\n\nA protective bumper and carry handle suit emergency departments and crash carts.",
            highlights: ["Manual and AED modes", "Biphasic waveform", "ECG display", "Optional pacing"],
            features: [
              ["Clear workflow", "Energy select, charge and shock controls grouped for quick use."],
              ["Flexible configuration", "Paddles or pads, with pacing and SpO₂ options."],
            ],
            specs: [
              { label: "Defibrillation", items: [["Waveform", "Biphasic"], ["Energy", "Up to 200–360", "J"]] },
              { label: "Monitoring", items: [["Display", "7-inch colour"], ["ECG", "3/5 lead"]] },
            ],
            applications: ["Emergency Department", "Intensive Care Unit"],
            specialties: ["Emergency Medicine", "Cardiology", "Critical Care"],
            solutions: ["Emergency Care"],
          },
        ],
      },
      {
        name: "Emergency Carts",
        short: "Crash carts and procedure trolleys.",
        products: [
          {
            name: "Emergency Crash Cart",
            image: "crash-cart",
            alt: true,
            brand: "Delta",
            short: "Colour-coded drawers, defibrillator shelf and IV pole for resuscitation points.",
            body: "An emergency crash cart with colour-coded drawers, a defibrillator shelf, IV pole, sharps holder and push handle, keeping resuscitation equipment organised and ready.\n\nDrawer configuration and accessories are specified to your resuscitation protocol.",
            highlights: ["Colour-coded drawers", "Defibrillator shelf", "IV pole and side rails", "Lockable castors"],
            features: [
              ["Organised for emergencies", "Drawers laid out to your resuscitation protocol."],
              ["Durable construction", "Easy-clean surfaces and lockable castors."],
            ],
            specs: [{ label: "Construction", items: [["Drawers", "5, colour coded"], ["Castors", "4 × 125 mm, 2 lockable"]] }],
            applications: ["Emergency Department", "Hospital Wards"],
            specialties: ["Emergency Medicine"],
            solutions: ["Emergency Care"],
          },
        ],
      },
      {
        name: "Patient Transfer",
        short: "Stretchers and transfer trolleys.",
        products: [
          {
            name: "Emergency Stretcher Trolley",
            image: "stretcher",
            brand: "Delta",
            short: "Height-adjustable stretcher trolley with backrest, side rails and IV pole.",
            body: "A stretcher trolley for emergency departments and patient transfer, with an adjustable backrest, collapsible side rails, IV pole and large castors.",
            highlights: ["Adjustable backrest", "Collapsible side rails", "IV pole", "Central locking castors"],
            features: [["Smooth transfers", "Large castors and central braking."]],
            specs: [{ label: "Dimensions", items: [["Length", "Approx. 1950–2000", "mm"], ["Safe working load", "Up to 200", "kg"]] }],
            applications: ["Emergency Department"],
            specialties: ["Emergency Medicine"],
            solutions: ["Emergency Care"],
          },
        ],
      },
    ],
  },
  {
    name: "Hospital Furniture",
    image: "hospital-furniture",
    short: "ICU beds, ward beds and bedside furniture.",
    description:
      "Hospital furniture for ICUs and wards: motorised ICU beds, semi-Fowler and Fowler ward beds, bedside lockers and accessories.",
    procurement:
      "Furniture is quoted per room type with mattresses and accessories listed individually. " + QUOTE_NOTE,
    subs: [
      {
        name: "ICU Beds",
        short: "Motorised beds for intensive care.",
        products: [
          {
            name: "Motorised ICU Bed",
            image: "icu-bed",
            alt: true,
            featured: true,
            brand: "Delta",
            short: "Multi-function motorised bed with split side rails, CPR release and integrated controls.",
            body: "A motorised ICU bed with height, backrest, knee-rest and tilt functions, split side rails with integrated controls, and a CPR quick-release.\n\nMattress, weighing and accessory options are specified per unit.",
            highlights: ["Height, backrest, knee and tilt", "Split side rails", "CPR quick release", "Central locking castors"],
            features: [
              ["Motorised positioning", "Functions controlled from side rails and footboard."],
              ["Patient safety", "Split side rails and lockable functions."],
              ["Infection control", "Removable head and foot boards for cleaning."],
            ],
            specs: [
              { label: "Positioning", items: [["Height range", "450–800", "mm"], ["Backrest", "0–70", "°"], ["Trendelenburg", "± 12", "°"]] },
              { label: "Capacity", items: [["Safe working load", "Up to 230", "kg"]] },
            ],
            applications: ["Intensive Care Unit"],
            specialties: ["Critical Care"],
            solutions: ["Critical Care Solutions", "Hospital Setup"],
          },
        ],
      },
      {
        name: "Ward Furniture",
        short: "Ward beds and bedside lockers.",
        products: [
          {
            name: "Semi-Fowler Ward Bed",
            image: "ward-bed",
            brand: "Delta",
            short: "Manual semi-Fowler bed with backrest adjustment and side rails.",
            body: "A manual semi-Fowler ward bed with crank-operated backrest adjustment, side rails, IV pole sockets and castors.",
            highlights: ["Crank backrest adjustment", "Side rails", "IV pole sockets", "Castors with brakes"],
            features: [["Durable construction", "Powder-coated frame and easy-clean panels."]],
            specs: [{ label: "Dimensions", items: [["Length", "Approx. 2100", "mm"], ["Safe working load", "Up to 180", "kg"]] }],
            applications: ["Hospital Wards"],
            specialties: ["General Surgery"],
            solutions: ["Hospital Setup"],
          },
          {
            name: "Bedside Locker",
            image: "bedside-locker",
            brand: "Delta",
            short: "Bedside locker with drawer, cabinet and castors.",
            body: "A bedside locker with a top drawer, lower cabinet and castors, finished in easy-clean surfaces.",
            highlights: ["Drawer and cabinet", "Easy-clean surfaces", "Castors"],
            features: [["Practical storage", "Space for personal items and supplies."]],
            specs: [{ label: "Dimensions", items: [["Height", "Approx. 850", "mm"]] }],
            applications: ["Hospital Wards"],
            specialties: ["General Surgery"],
            solutions: ["Hospital Setup"],
          },
        ],
      },
    ],
  },
];

export const BRANDS = [
  { key: "alpha", name: "Partner Alpha" },
  { key: "beta", name: "Partner Beta" },
  { key: "gamma", name: "Partner Gamma" },
  { key: "delta", name: "Partner Delta" },
  { key: "sigma", name: "Partner Sigma" },
  { key: "omega", name: "Partner Omega" },
];

export const SPECIALTIES = [
  { name: "Cardiology", image: "icu-b", short: "Monitoring, ECG, defibrillation and imaging for cardiac care units and clinics.", categories: ["Patient Monitoring", "Diagnostic Equipment", "Emergency Care"] },
  { name: "Critical Care", image: "icu", short: "Ventilation, monitoring, infusion and ICU furniture for intensive care units.", categories: ["Critical Care", "Patient Monitoring", "Hospital Furniture", "Respiratory Care"] },
  { name: "Anaesthesiology", image: "ot-b", short: "Anaesthesia workstations, monitoring and infusion for theatres and recovery.", categories: ["Anaesthesia", "Patient Monitoring", "Critical Care"] },
  { name: "Orthopaedics", image: "ot", short: "Operating tables, surgical lights and theatre infrastructure for orthopaedic surgery.", categories: ["Operation Theatre", "Surgical Equipment"] },
  { name: "Radiology", image: "diagnostics", short: "Ultrasound and diagnostic systems for imaging departments and diagnostic centres.", categories: ["Diagnostic Equipment"] },
  { name: "Emergency Medicine", image: "emergency", short: "Resuscitation, transfer and monitoring equipment for emergency departments.", categories: ["Emergency Care", "Patient Monitoring", "Respiratory Care"] },
  { name: "General Surgery", image: "hero-ot", short: "Theatre lights, tables, electrosurgery and suction for general surgical suites.", categories: ["Operation Theatre", "Surgical Equipment", "Anaesthesia"] },
  { name: "Gynaecology", image: "diagnostics-b", short: "Ultrasound, theatre and neonatal equipment for obstetrics and gynaecology.", categories: ["Diagnostic Equipment", "Operation Theatre", "Neonatal Care"] },
  { name: "Neonatology", image: "nicu", short: "Warmers, incubators, phototherapy and syringe pumps for newborn care units.", categories: ["Neonatal Care", "Critical Care"] },
];

export const SOLUTIONS = [
  { name: "Hospital Setup", image: "corridor", short: "Equipment planning and supply for new hospitals and major expansions.", categories: ["Hospital Furniture", "Patient Monitoring", "Operation Theatre", "Critical Care"] },
  { name: "Critical Care Solutions", image: "icu", short: "Complete ICU and HDU packages: beds, ventilation, monitoring and infusion.", categories: ["Critical Care", "Patient Monitoring", "Hospital Furniture"] },
  { name: "Surgical Infrastructure", image: "ot-b", short: "Theatre lights, tables, pendants and anaesthesia for modular operating theatres.", categories: ["Operation Theatre", "Anaesthesia", "Surgical Equipment"] },
  { name: "Diagnostics", image: "diagnostics", short: "ECG and ultrasound for diagnostic centres, OPDs and imaging departments.", categories: ["Diagnostic Equipment"] },
  { name: "Patient Monitoring Systems", image: "station", short: "Bedside and central monitoring planned across wards and critical care.", categories: ["Patient Monitoring"] },
  { name: "Emergency Care", image: "emergency", short: "Resuscitation points, transfer and emergency department equipment.", categories: ["Emergency Care", "Respiratory Care"] },
];

export const APPLICATIONS = [
  { name: "Intensive Care Unit", image: "icu-b", description: "Ventilation, monitoring, infusion and beds for adult and paediatric ICUs." },
  { name: "Operation Theatre", image: "ot", description: "Lights, tables, pendants, anaesthesia and electrosurgery for surgical suites." },
  { name: "Emergency Department", image: "emergency", description: "Resuscitation, monitoring, suction and transfer equipment for emergency care." },
  { name: "Diagnostics", image: "diagnostics-b", description: "ECG and ultrasound for OPDs, diagnostic centres and imaging departments." },
  { name: "Neonatal ICU", image: "nicu", description: "Warmers, incubators, phototherapy and precise infusion for newborn care." },
  { name: "Hospital Wards", image: "ward", description: "Beds, lockers, oxygen therapy and monitoring for general wards." },
];

export const PRODUCT_FAQS = [
  {
    question: "How is a quotation prepared?",
    answer:
      "Share the department, quantity and any configuration preferences. We prepare a quotation for your requirement, with the device, accessories, installation and optional items listed separately.",
  },
  {
    question: "Can this be supplied with installation and user training?",
    answer:
      "Yes. Installation, commissioning and user orientation can be included in the quotation, and are scheduled with your biomedical and clinical teams.",
  },
  {
    question: "Can I request several products in one enquiry?",
    answer:
      "Yes. Add each product to your quotation list and send them together as one request — useful for department or tender requirements.",
  },
];

export const CATEGORY_FAQS = [
  {
    question: "Do you help with specifications for tenders?",
    answer:
      "Yes. We can help compare configurations and prepare equipment lists and specifications for your procurement process.",
  },
  {
    question: "Which documents are available before purchase?",
    answer:
      "Product brochures and datasheets are available for most equipment. Further technical documentation can be requested with your enquiry.",
  },
];

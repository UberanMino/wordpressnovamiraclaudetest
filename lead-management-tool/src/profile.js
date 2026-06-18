export const company = {
  name: "LogBATT GmbH",
  founded: 2017,
  location: "Am Filswehr 2, 73207 Plochingen, Germany",
  parent: "Lagermax Group (75% majority owner since July 2023), part of the Green Logistics division",
  employees: 35,
  revenueEur: 8_700_000,
  positioning:
    "Pioneer and fully certified end-to-end reverse logistics provider for lithium-ion batteries. " +
    "Combines logistics services (collection, storage, packaging, transport, delivery to recycling or " +
    "destination) with in-house manufacturing of certified transport/storage/quarantine containers " +
    "(SafetyBATTbox family), including own fire testing and BAM type approval.",
  services: [
    "Collection and pickup of EV/HV lithium-ion batteries (intact, defective, critically defective)",
    "Storage and quarantine of lithium-ion batteries",
    "Certified ADR packaging (incl. P911/LP906 for critically defective batteries, ADR 2025)",
    "Transport across Europe (documented long-haul routes: UK, Poland, Scandinavia, Switzerland, Austria, Hungary, Belgium, Netherlands)",
    "Routing to recycling facilities or final destination",
    "Manufacturing and sale of SafetyBATTbox transport/storage/quarantine containers",
  ],
  certifications: [
    "DIN EN ISO 9001",
    "ISO 14001",
    "QSP (Qualitätssicherungsprogramm Gefahrgutverpackungen)",
    "Anerkannter Entsorgungsfachbetrieb (EfB)",
    "Permits for collection, transport, and brokering of hazardous waste",
    "US DOT Special Permit",
  ],
  referenceCustomers: ["Northvolt", "Volvo Truck", "Stena Recycling"],
  primaryIndustry: "Automotive / EV battery value chain",
};

// Ideal Customer Profile: used to score prospecting search results and qualify leads.
export const icp = {
  industries: [
    "Automotive OEM (EV/HV vehicles)",
    "Battery manufacturing / cell production",
    "Battery recycling",
    "EV fleet operators (logistics, public transport, car rental)",
    "Energy storage / stationary storage integrators",
    "Automotive logistics providers without in-house dangerous-goods battery handling",
  ],
  buyerTitles: [
    "Head of Logistics",
    "Supply Chain Manager",
    "EHS / Dangerous Goods Safety Officer (Gefahrgutbeauftragter)",
    "Head of Aftersales / Warranty",
    "Sustainability / Recycling Manager",
    "Plant Manager",
  ],
  regions: ["Germany", "Austria", "Switzerland", "EU (broader)"],
  triggers: [
    "Company handles or will handle EV/HV battery returns, warranty cases, or end-of-life batteries",
    "Company lacks ADR/dangerous-goods certification for battery transport or storage in-house",
    "Company is scaling EV production or fleet and needs reverse logistics capacity",
    "Recent news about battery recalls, EV recycling investment, or gigafactory expansion",
  ],
  disqualifiers: [
    "No connection to lithium-ion batteries or EV value chain",
    "Company already has an exclusive long-term reverse logistics/battery recycling partner",
    "Outside Europe with no EU import/export battery flow",
  ],
};

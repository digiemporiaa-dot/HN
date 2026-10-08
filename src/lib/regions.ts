/**
 * India's states and union territories by broad region, for grouping city
 * pages. Matched on the state's name so it works with whatever states an
 * administrator has added; anything unmatched is listed as "Across India".
 */
export const REGIONS: Array<[string, RegExp]> = [
  ["North India", /delhi|haryana|punjab|himachal|jammu|kashmir|ladakh|uttarakhand|uttar pradesh|chandigarh|rajasthan/i],
  ["West India", /maharashtra|gujarat|goa|dadra|daman|diu/i],
  ["South India", /karnataka|tamil|kerala|andhra|telangana|puducherry|pondicherry|lakshadweep|andaman/i],
  ["East India", /bengal|odisha|orissa|bihar|jharkhand/i],
  ["Central India", /madhya pradesh|chhattisgarh/i],
  ["North-East India", /assam|meghalaya|manipur|mizoram|nagaland|tripura|arunachal|sikkim/i],
];

export function regionOf(stateName: string): string {
  return REGIONS.find(([, pattern]) => pattern.test(stateName))?.[0] ?? "Across India";
}

/** Cities grouped by region, keeping the order regions are listed in. */
export function groupByRegion<T>(
  states: Array<{ name: string; cities: T[] }>,
): Array<[string, T[]]> {
  const groups = new Map<string, T[]>();
  for (const state of states) {
    const region = regionOf(state.name);
    groups.set(region, [...(groups.get(region) ?? []), ...state.cities]);
  }
  const order = [...REGIONS.map(([name]) => name), "Across India"];
  return [...groups.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
}

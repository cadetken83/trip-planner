import { Continent } from "@/types";

type Rule = { keywords: string[]; continent: Continent };

const RULES: Rule[] = [
  // ── North America ──────────────────────────────────────────────────────────
  {
    continent: "North America",
    keywords: [
      // Countries
      "united states", "usa", "u.s.a", "canada", "mexico", "cuba", "jamaica",
      "bahamas", "barbados", "trinidad", "haiti", "dominican", "puerto rico",
      "costa rica", "panama", "guatemala", "belize", "honduras", "nicaragua",
      "el salvador", "caribbean", "cayman", "bermuda", "aruba",
      // US States (full)
      "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
      "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho",
      "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana",
      "maine", "maryland", "massachusetts", "michigan", "minnesota",
      "mississippi", "missouri", "montana", "nebraska", "nevada",
      "new hampshire", "new jersey", "new mexico", "new york", "north carolina",
      "north dakota", "ohio", "oklahoma", "oregon", "pennsylvania",
      "rhode island", "south carolina", "south dakota", "tennessee", "texas",
      "utah", "vermont", "virginia", "washington", "west virginia",
      "wisconsin", "wyoming",
      // US State abbreviations
      "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga",
      "hi", "id", "il", "in", "ia", "ks", "ky", "la", "me", "md",
      "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj",
      "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc",
      "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy",
      // US Cities
      "new york", "los angeles", "chicago", "houston", "phoenix", "philadelphia",
      "san antonio", "san diego", "dallas", "san jose", "austin", "jacksonville",
      "fort worth", "columbus", "charlotte", "indianapolis", "san francisco",
      "seattle", "denver", "nashville", "portland", "las vegas", "memphis",
      "louisville", "baltimore", "milwaukee", "albuquerque", "tucson", "fresno",
      "mesa", "sacramento", "atlanta", "kansas city", "omaha", "raleigh",
      "miami", "boston", "minneapolis", "new orleans", "cleveland", "honolulu",
      "tampa", "orlando", "pittsburgh", "cincinnati", "st. louis", "salt lake",
      "detroit", "buffalo", "anchorage", "boise", "richmond", "spokane",
      // Canadian cities
      "toronto", "vancouver", "montreal", "calgary", "edmonton", "ottawa",
      "winnipeg", "quebec", "halifax", "victoria",
      // Mexican cities
      "mexico city", "cancun", "guadalajara", "monterrey", "tijuana",
      "cabo", "puerto vallarta", "oaxaca", "merida",
      // Country codes
      "us", "ca", "mx",
    ],
  },

  // ── South America ──────────────────────────────────────────────────────────
  {
    continent: "South America",
    keywords: [
      "brazil", "argentina", "chile", "peru", "colombia", "venezuela",
      "ecuador", "bolivia", "paraguay", "uruguay", "guyana", "suriname",
      "patagonia", "amazon", "galapagos", "andes",
      // Cities
      "rio de janeiro", "rio", "são paulo", "sao paulo", "buenos aires",
      "lima", "bogota", "bogotá", "santiago", "caracas", "quito",
      "la paz", "montevideo", "asuncion", "medellín", "medellin",
      "cartagena", "cusco", "cuzco", "machu picchu", "iguazu",
      "salvador", "brasilia", "fortaleza", "manaus",
      // Country codes
      "br", "ar", "cl", "pe", "co", "ve", "ec", "bo", "py", "uy",
    ],
  },

  // ── Europe ────────────────────────────────────────────────────────────────
  {
    continent: "Europe",
    keywords: [
      // Countries
      "united kingdom", "uk", "england", "scotland", "wales", "northern ireland",
      "ireland", "france", "germany", "italy", "spain", "portugal", "greece",
      "netherlands", "belgium", "switzerland", "austria", "sweden", "norway",
      "denmark", "finland", "poland", "czech", "hungary", "croatia", "slovakia",
      "slovenia", "serbia", "bulgaria", "romania", "ukraine", "belarus",
      "iceland", "turkey", "malta", "cyprus", "luxembourg", "monaco",
      "liechtenstein", "andorra", "san marino", "vatican", "albania",
      "macedonia", "bosnia", "montenegro", "moldova", "latvia", "lithuania",
      "estonia", "europe",
      // Country codes
      "gb", "fr", "de", "it", "es", "pt", "gr", "nl", "be", "ch",
      "at", "se", "no", "dk", "fi", "pl", "cz", "hu", "hr", "sk",
      "si", "rs", "bg", "ro", "ua", "is", "tr", "ie", "mt", "cy",
      "lu", "al", "ba", "me", "lv", "lt", "ee",
      // Cities
      "london", "paris", "rome", "berlin", "madrid", "barcelona", "amsterdam",
      "vienna", "prague", "budapest", "warsaw", "athens", "lisbon", "brussels",
      "dublin", "edinburgh", "stockholm", "oslo", "copenhagen", "helsinki",
      "zurich", "geneva", "milan", "florence", "venice", "naples", "amalfi",
      "seville", "valencia", "porto", "thessaloniki", "krakow", "gdansk",
      "bucharest", "sofia", "zagreb", "ljubljana", "bratislava", "tallinn",
      "riga", "vilnius", "reykjavik", "istanbul", "ankara", "valletta",
      "nicosia", "luxembourg city", "monaco", "andorra",
      // Regions/landmarks
      "tuscany", "sicily", "sardinia", "corsica", "santorini", "mykonos",
      "dubrovnik", "amalfi coast", "french riviera", "bavarian", "alsace",
      "normandy", "provence", "costa brava", "algarve", "douro",
    ],
  },

  // ── Asia ──────────────────────────────────────────────────────────────────
  {
    continent: "Asia",
    keywords: [
      // Countries
      "japan", "china", "india", "thailand", "vietnam", "indonesia", "malaysia",
      "singapore", "philippines", "south korea", "north korea", "taiwan",
      "nepal", "sri lanka", "cambodia", "myanmar", "laos", "bangladesh",
      "pakistan", "afghanistan", "iran", "iraq", "saudi arabia", "uae",
      "emirates", "qatar", "kuwait", "bahrain", "oman", "jordan", "israel",
      "lebanon", "syria", "mongolia", "kazakhstan", "uzbekistan", "kyrgyzstan",
      "tajikistan", "turkmenistan", "azerbaijan", "georgia", "armenia",
      "maldives", "bhutan", "brunei", "east timor", "timor",
      // Country codes
      "jp", "cn", "in", "th", "vn", "id", "my", "sg", "ph", "kr",
      "tw", "np", "lk", "kh", "mm", "la", "bd", "pk", "ir", "iq",
      "sa", "ae", "qa", "kw", "bh", "om", "jo", "il", "lb", "mn",
      "kz", "uz", "kg", "tj", "tm", "az", "ge", "am", "mv", "bt",
      // Cities
      "tokyo", "osaka", "kyoto", "hiroshima", "sapporo", "fukuoka",
      "beijing", "shanghai", "guangzhou", "shenzhen", "chengdu", "xian",
      "hong kong", "macau", "taipei",
      "mumbai", "delhi", "bangalore", "hyderabad", "chennai", "kolkata",
      "jaipur", "agra", "varanasi", "goa",
      "bangkok", "chiang mai", "phuket", "pattaya", "koh samui",
      "hanoi", "ho chi minh", "saigon", "da nang", "hoi an",
      "bali", "jakarta", "surabaya", "yogyakarta", "lombok",
      "kuala lumpur", "penang", "langkawi",
      "manila", "cebu", "boracay", "palawan",
      "seoul", "busan", "jeju",
      "kathmandu", "pokhara", "everest",
      "colombo", "kandy",
      "phnom penh", "siem reap", "angkor",
      "yangon", "mandalay", "bagan",
      "dubai", "abu dhabi", "doha", "riyadh", "muscat", "amman",
      "tel aviv", "jerusalem", "beirut",
      "ulaanbaatar",
      // Regions
      "maldives", "bali", "phuket", "angkor wat",
    ],
  },

  // ── Africa ────────────────────────────────────────────────────────────────
  {
    continent: "Africa",
    keywords: [
      // Countries
      "kenya", "tanzania", "south africa", "egypt", "morocco", "ethiopia",
      "nigeria", "ghana", "senegal", "namibia", "botswana", "zimbabwe",
      "zambia", "uganda", "rwanda", "madagascar", "mozambique", "angola",
      "cameroon", "ivory coast", "mali", "sudan", "somalia", "libya",
      "tunisia", "algeria", "malawi", "lesotho", "swaziland", "eswatini",
      "sierra leone", "liberia", "guinea", "burkina faso", "niger",
      "chad", "central african", "congo", "gabon", "equatorial guinea",
      "seychelles", "mauritius", "reunion", "djibouti", "eritrea",
      // Country codes
      "ke", "tz", "za", "eg", "ma", "et", "ng", "gh", "sn", "na",
      "bw", "zw", "zm", "ug", "rw", "mg", "mz", "ao", "cm", "ci",
      "tn", "dz", "mw", "ls", "sz",
      // Cities
      "nairobi", "mombasa", "dar es salaam", "cape town", "johannesburg",
      "durban", "pretoria", "cairo", "alexandria", "casablanca", "marrakech",
      "fez", "tunis", "algiers", "lagos", "accra", "dakar", "addis ababa",
      "kampala", "kigali", "antananarivo", "maputo", "windhoek", "gaborone",
      "harare", "lusaka", "luanda",
      // Landmarks/regions
      "serengeti", "safari", "kilimanjaro", "masai mara", "okavango",
      "sahara", "zanzibar", "victoria falls", "kruger", "cape of good hope",
      "nile", "luxor", "aswan",
    ],
  },

  // ── Oceania ───────────────────────────────────────────────────────────────
  {
    continent: "Oceania",
    keywords: [
      // Countries
      "australia", "new zealand", "fiji", "papua new guinea", "solomon islands",
      "vanuatu", "samoa", "tonga", "kiribati", "micronesia", "palau",
      "marshall islands", "nauru", "tuvalu",
      // Country codes
      "au", "nz", "fj", "pg", "sb", "vu", "ws", "to",
      // Cities
      "sydney", "melbourne", "brisbane", "perth", "adelaide", "canberra",
      "darwin", "hobart", "gold coast", "cairns", "auckland", "wellington",
      "christchurch", "queenstown", "rotorua", "dunedin",
      "suva", "nadi", "port moresby",
      // Regions/landmarks
      "great barrier reef", "uluru", "ayers rock", "outback", "queensland",
      "tasmania", "south island", "north island", "tahiti", "bora bora",
      "moorea", "cook islands",
    ],
  },

  // ── Antarctica ────────────────────────────────────────────────────────────
  {
    continent: "Antarctica",
    keywords: ["antarctica", "south pole", "antarctic", "falkland"],
  },
];

// Split destination into tokens and check each one
// This allows "Dublin, Ireland" to match "ireland" even if "dublin" isn't listed
export function inferContinent(destination: string): Continent | undefined {
  if (!destination) return undefined;
  const lower = destination.toLowerCase().trim();

  for (const { keywords, continent } of RULES) {
    if (keywords.some((kw) => {
      // Match whole word / phrase to avoid false positives
      // e.g. "or" shouldn't match "portland"
      if (kw.length <= 2) {
        // Short codes: match as standalone word or after comma/space
        const regex = new RegExp(`(^|[,\\s])${kw}([,\\s]|$)`, "i");
        return regex.test(lower);
      }
      return lower.includes(kw);
    })) {
      return continent;
    }
  }
  return undefined;
}

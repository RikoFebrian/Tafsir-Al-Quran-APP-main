// Mapping of Surah names (transliteration) to their numbers
const SURAH_NAME_MAP: Record<string, number> = {
  "al-fatihah": 1,
  "al-baqarah": 2,
  "ali-imran": 3,
  "an-nisa": 4,
  "al-maidah": 5,
  "al-anam": 6,
  "al-araf": 7,
  "al-anfal": 8,
  "at-taubah": 9,
  yunus: 10,
  hud: 11,
  yusuf: 12,
  "ar-rad": 13,
  ibrahim: 14,
  "al-hijr": 15,
  "an-nahl": 16,
  "al-isra": 17,
  "al-kahf": 18,
  maryam: 19,
  taha: 20,
  "al-anbiya": 21,
  "al-hajj": 22,
  "al-mukminun": 23,
  "an-nur": 24,
  "al-furqan": 25,
  "ash-shuara": 26,
  "an-naml": 27,
  "al-qasas": 28,
  "al-ankabut": 29,
  "ar-rum": 30,
  luqman: 31,
  "as-sajdah": 32,
  "al-ahzab": 33,
  saba: 34,
  fatir: 35,
  "ya-sin": 36,
  "as-saffat": 37,
  sad: 38,
  "az-zumar": 39,
  ghafir: 40,
  fussilat: 41,
  "ash-shura": 42,
  "az-zukhruf": 43,
  "ad-dukhan": 44,
  "al-jathiyah": 45,
  "al-ahqaf": 46,
  muhammad: 47,
  "al-fath": 48,
  "al-hujurat": 49,
  qaf: 50,
  "adh-dhariyat": 51,
  "at-tur": 52,
  "an-najm": 53,
  "al-qamar": 54,
  "ar-rahman": 55,
  "al-waqiah": 56,
  "al-hadid": 57,
  "al-mujadilah": 58,
  "al-hashr": 59,
  "al-mumtahanah": 60,
  "as-saff": 61,
  "al-jumuah": 62,
  "al-munafiqun": 63,
  "at-taghabun": 64,
  "at-talaq": 65,
  "at-tahrim": 66,
  "al-mulk": 67,
  "al-qalam": 68,
  "al-haqqah": 69,
  "al-maarij": 70,
  nuh: 71,
  "al-jinn": 72,
  "al-muzzammil": 73,
  "al-muddaththir": 74,
  "al-qiyamah": 75,
  "al-insan": 76,
  "al-mursalat": 77,
  "an-naba": 78,
  "an-naziat": 79,
  abasa: 80,
  "at-takwir": 81,
  "al-infitar": 82,
  "al-mutaffifin": 83,
  "al-inshiqaq": 84,
  "al-buruj": 85,
  "at-tariq": 86,
  "al-ala": 87,
  "al-ghashiyah": 88,
  "al-fajr": 89,
  "al-balad": 90,
  "ash-shams": 91,
  "al-lail": 92,
  "ad-duha": 93,
  "ash-sharh": 94,
  "at-tin": 95,
  "al-alaq": 96,
  "al-qadr": 97,
  "al-bayyinah": 98,
  "az-zalzalah": 99,
  "al-adiyat": 100,
  "al-qaria": 101,
  "at-takathur": 102,
  "al-asr": 103,
  "al-humaza": 104,
  "al-fil": 105,
  quraish: 106,
  "al-maun": 107,
  "al-kawthar": 108,
  "al-kafirun": 109,
  "an-nasr": 110,
  "al-lahab": 111,
  "al-ikhlas": 112,
  "al-falaq": 113,
  "an-nas": 114,
}

/**
 * Normalize a string for comparison (case-insensitive, handle hyphens and spaces)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[-\s]+/g, "-") // Normalize hyphens and spaces to single hyphen
    .replace(/[^\p{L}\p{N}-]/gu, "") // Remove special characters except hyphens
}

/**
 * Parse search input like "Al-fatihah:7" or "Al fatihah 7" to get surah number and ayat number
 * Supports various formats:
 * - "Al-fatihah:7"
 * - "Al fatihah 7"
 * - "Al-fatihah 7"
 * - "alfatihah:7"
 * - Case-insensitive
 */
export function parseSurahAndAyat(input: string): { surahNumber: number; ayatNumber: number } | null {
  if (!input.trim()) return null

  // Try to match patterns like "surah-name:ayat" or "surah-name ayat"
  const patterns = [
    /^([a-zA-Z\s-]+)[:\s]+(\d+)$/, // "Al-fatihah:7" or "Al fatihah 7"
  ]

  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match) {
      const surahNameRaw = match[1]
      const ayatNumber = Number.parseInt(match[2])

      // Normalize the surah name
      const normalizedName = normalizeString(surahNameRaw)

      // Try to find the surah number
      const surahNumber = SURAH_NAME_MAP[normalizedName]

      if (surahNumber && ayatNumber >= 1 && ayatNumber <= 286) {
        return { surahNumber, ayatNumber }
      }
    }
  }

  return null
}

/**
 * Get all available Surah names for reference
 */
export function getAllSurahNames(): string[] {
  return Object.keys(SURAH_NAME_MAP)
}

/**
 * Get Surah number from name
 */
export function getSurahNumberByName(name: string): number | null {
  const normalized = normalizeString(name)
  return SURAH_NAME_MAP[normalized] || null
}

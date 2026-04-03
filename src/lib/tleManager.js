const CORS_PROXY = 'https://corsproxy.io/?';

const TLE_URLS = [
  // CelesTrak supplemental feed (ข้อมูลสด แต่อาจมี CORS)
  `${CORS_PROXY}${encodeURIComponent('https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=tle')}`,
  // CelesTrak GP feed (สำรอง)
  `${CORS_PROXY}${encodeURIComponent('https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle')}`,
];

async function fetchWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

export async function fetchStarlinkTLE() {
  for (const url of TLE_URLS) {
    try {
      console.log('[TLE] Trying:', url);
      const text = await fetchWithTimeout(url, 15000);
      const sats = parseTLE(text);
      if (sats.length > 10) {
        console.log(`[TLE] Loaded ${sats.length} satellites`);
        return sats;
      }
    } catch (err) {
      console.warn('[TLE] Failed:', err.message);
    }
  }
  console.error('[TLE] All sources failed');
  return [];
}


function parseTLE(tleText) {
  const lines = tleText.trim().split('\n');
  const satellites = [];
  
  for (let i = 0; i < lines.length; i += 3) {
    if (i + 2 < lines.length) {
      const name = lines[i].trim();
      const line1 = lines[i + 1].trim();
      const line2 = lines[i + 2].trim();
      satellites.push({
        name,
        tleLine1: line1,
        tleLine2: line2
      });
    }
  }
  return satellites;
}

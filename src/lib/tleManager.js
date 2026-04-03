export async function fetchStarlinkTLE() {
  const url = 'https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=tle';
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const text = await response.text();
    return parseTLE(text);
  } catch (error) {
    console.error("Failed to fetch TLE data", error);
    return [];
  }
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

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ktvsadogjzctxtpugkwt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnNhZG9nanpjdHh0cHVna3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MzQ5ODQsImV4cCI6MjA4OTMxMDk4NH0.KASeXHAN8S8nWNyx4XVpYIazggoXkXR6uTljrp_xhHY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// VI FOKUSERAR ENBART PÅ MELLANSVERIGE SOM MISSLYCKADES
const MELLAN_BBOX = "58.0,10.9,60.5,19.0";

async function fixMellanSverige() {
  console.log('🔄 Räddar Mellansverige: Hämtar Bad- och Rastplatser...');
  
  const query = `[out:json][timeout:180];(nw["leisure"~"swimming_area|bathing_place"](${MELLAN_BBOX});nw["amenity"="rest_area"](${MELLAN_BBOX});nw["leisure"="picnic_site"](${MELLAN_BBOX}););out center;`;

  let attempt = 0;
  const maxAttempts = 5;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      console.log(`📡 Försök ${attempt} av ${maxAttempts}...`);
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`
      });

      if (!response.ok) throw new Error(`HTTP Fel: ${response.status}`);

      const data = await response.json();
      
      if (!data.elements || data.elements.length === 0) {
        console.log("ℹ️ Inga platser hittades.");
        return;
      }

      const pois = data.elements.map(el => {
        const tags = el.tags || {};
        const lat = el.lat || (el.center && el.center.lat);
        const lon = el.lon || (el.center && el.center.lon);
        if (!lat || !lon) return null;

        const isSwimming = tags.leisure === 'swimming_area' || tags.leisure === 'bathing_place';
        return {
          name: tags.name || (isSwimming ? 'Badplats' : 'Rastplats'),
          category: isSwimming ? 'swimming' : 'rest_area',
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          description: tags.description || (isSwimming ? 'Badplats i Mellansverige' : 'Rastplats/Picknick'),
          has_parking: true,
          created_by: 'system_bulk_import'
        };
      }).filter(Boolean);

      console.log(`💾 Sparar ${pois.length} platser för Mellansverige till Supabase...`);
      const { error } = await supabase.from('pois').insert(pois);
      
      if (error) {
        console.error("❌ Supabase-fel:", error.message);
      } else {
        console.log("🎉 SUCCESS! Mellansverige är nu komplett.");
        return; // Vi är klara!
      }

    } catch (err) {
      console.error(`⚠️ Försök ${attempt} misslyckades: ${err.message}`);
      if (attempt < maxAttempts) {
        console.log('⏳ Väntar 20 sekunder innan nytt försök...');
        await new Promise(r => setTimeout(r, 20000));
      }
    }
  }
  console.log('❌ Kunde inte hämta Mellansverige efter 5 försök. Testa igen om en stund.');
}

fixMellanSverige();
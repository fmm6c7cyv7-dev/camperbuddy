const { createClient } = require('@supabase/supabase-js');

// Behåll exakt dessa korta namn, klistra bara in dina länkar mellan fnuttarna!
const SUPABASE_URL = 'https://ktvsadogjzctxtpugkwt.supabase.co';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedPois() {
  console.log('🌍 Hämtar riktiga ställplatser & rastplatser runt Mälardalen...');

  const overpassQuery = `
    [out:json][timeout:25];
    (
      node["tourism"="caravan_site"](59.0, 15.0, 60.5, 17.5);
      node["highway"="rest_area"](59.0, 15.0, 60.5, 17.5);
    );
    out body 50;
  `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery,
    });

    const data = await response.json();
    
    if (!data.elements || data.elements.length === 0) {
      console.log('Hittade inga platser. API:et kanske är överbelastat.');
      return;
    }

    console.log(`✅ Hittade ${data.elements.length} platser! Formaterar data...`);

    const poisToInsert = data.elements.map(node => {
      const tags = node.tags || {};
      const isRestArea = tags.highway === 'rest_area';
      const hasToilets = tags.toilets === 'yes';
      const hasWater = tags.drinking_water === 'yes';
      const hasDump = tags.sanitary_dump_station === 'yes';

      return {
        name: tags.name || (isRestArea ? 'Rastplats' : 'Ställplats'),
        category: 'parking', 
        description: tags.description || tags.fee === 'no' ? 'Gratis ställplats/rastplats' : 'Rastplats/Ställplats hämtad från OSM',
        latitude: node.lat,
        longitude: node.lon,
        has_parking: true,
        has_blackwater: hasToilets || hasDump, 
        has_graywater: hasDump,                
        has_freshwater: hasWater,              
      };
    });

    console.log('🚀 Skickar in platserna i Supabase...');

    const { error } = await supabase.from('pois').insert(poisToInsert);

    if (error) {
      console.error('❌ Fel vid insättning i Supabase:', error.message);
    } else {
      console.log('🎉 Succé! Din karta är nu full av riktiga platser.');
    }

  } catch (err) {
    console.error('❌ Något gick fel:', err.message);
  }
}

seedPois();
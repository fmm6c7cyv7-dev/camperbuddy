import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// 🚨 BYT TILL DIN SERVICE_ROLE NYCKEL
const SUPABASE_URL = 'https://ktvsadogjzctxtpugkwt.supabase.co';
const SUPABASE_KEY = 'GÖMD_NYCKEL';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function importGoldenData() {
  console.log('🔄 Läser in CSV-filen (11 275 platser, nu åker vi!)...');

  try {
    const fileContent = fs.readFileSync('/workspaces/camperbuddy/Downloads/husbilsplatser_260327.csv', 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    
    const headerLine = lines[0];
    let separator = ',';
    if (headerLine.includes(';')) separator = ';';
    if (headerLine.includes('\t')) separator = '\t';

    console.log(`📊 Avskiljare vald: '${separator}'. Analyserar och städar namn...`);

    const poisToInsert = [];

    // Loopa igenom alla rader (hoppa över rubrikraden [0])
    for (let i = 1; i < lines.length; i++) {
      // Hantera om kommatecken finns inuti citattecken
      let rawLine = lines[i];
      const columns = rawLine.split(separator);
      
      if (columns.length >= 4) {
        const lon = parseFloat(columns[0].replace(/"/g, '').trim());
        const lat = parseFloat(columns[1].replace(/"/g, '').trim());
        const rawName = columns[2].replace(/"/g, '').trim(); // Ex: "Väggahamnen - Ställplats"
        const addressText = columns.slice(3).join(' ').replace(/"/g, '').trim();

        if (!isNaN(lat) && !isNaN(lon)) {
          
          // --- ✂️ KLIPP ISÄR NAMN OCH TYP ---
          let cleanName = rawName;
          let placeType = '';

          // Letar efter " - " från slutet (ifall platsen har bindestreck i sitt namn)
          const lastDashIndex = rawName.lastIndexOf(' - ');
          if (lastDashIndex !== -1) {
            cleanName = rawName.substring(0, lastDashIndex).trim(); // "Väggahamnen"
            placeType = rawName.substring(lastDashIndex + 3).trim().toLowerCase(); // "ställplats"
          } else {
            // Om det inte finns något bindestreck, kolla om typen står i själva ordet
            placeType = rawName.toLowerCase(); 
          }

          // --- 🧠 BESTÄM KATEGORI ---
          let category = 'parking'; // Standard fallback
          if (placeType.includes('camping')) category = 'camp_site';
          else if (placeType.includes('rastplats')) category = 'rest_area';
          else if (placeType.includes('parkering') || placeType.includes('friplats') || placeType.includes('ställplats')) category = 'parking';
          else if (placeType.includes('hamn')) category = 'marina';

          // --- 🔌 LÄS AV INFO TILL FACILITETER ---
          const textToAnalyze = addressText.toLowerCase();
          const hasElectricity = textToAnalyze.includes('el '); // Mellanslag för att inte ta t.ex. "hotell"
          const hasWater = textToAnalyze.includes('vatten');
          const hasBlackwater = textToAnalyze.includes('kassettömning') || textToAnalyze.includes('wc');
          const hasGraywater = textToAnalyze.includes('gråvatten');

          poisToInsert.push({
            name: cleanName, // Nu är det bara det fina namnet!
            latitude: lat,
            longitude: lon,
            category: category,
            description: addressText,
            has_electricity: hasElectricity,
            has_freshwater: hasWater,
            has_blackwater: hasBlackwater,
            has_graywater: hasGraywater,
            created_by: 'husbilsklubben_import'
          });
        }
      }
    }

    console.log(`✅ ${poisToInsert.length} platser är tvättade och isärklippta. Skjuter upp till Supabase...`);

    // Skicka upp i Chunks (Extremt viktigt när vi pratar 11 000+ rader)
    const CHUNK_SIZE = 1000;
    let totalInserted = 0;

    for (let i = 0; i < poisToInsert.length; i += CHUNK_SIZE) {
      const chunk = poisToInsert.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from('pois').insert(chunk);
      
      if (error) {
        console.error(`❌ Fel vid batch ${i}-${i + CHUNK_SIZE}:`, error.message);
        return;
      } else {
        totalInserted += chunk.length;
        console.log(`⏳ Sparat ${totalInserted} av ${poisToInsert.length}...`);
      }
    }

    console.log("🎉 SUCCESS! 11 000+ platser laddade! Öppna appen och njut av kartan!");

  } catch (error) {
    console.error("❌ Ett fel uppstod. Kontrollera CSV-filen.", error);
  }
}

importGoldenData();
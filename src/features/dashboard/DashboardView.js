import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Trophy,
  Clock,
  Camera,
  Navigation,
  Map as MapIcon,
  Sun,
  Sunrise,
  Sunset,
  Cloud,
  Star,
  ExternalLink,
  X,
  Save,
  Loader2,
  Plus,
  MapPin,
  Check,
} from 'lucide-react';

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix för Leaflet-ikoner
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- KOMPONENTER FÖR KART-INTERAKTION ---
function MapEvents({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) map.setView(center, 13);
  }, [center, map]);
  return null;
}

const createPoiIcon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

const redIcon = createPoiIcon('red');

const singleServiceIcons = {
  parking: createPoiIcon('green'),
  graywater: createPoiIcon('grey'),
  blackwater: createPoiIcon('black'),
  freshwater: createPoiIcon('blue'),
  electricity: createPoiIcon('gold'), // Guld/Gul för El
  default: createPoiIcon('gold'),
};

const officialStarIcon = L.divIcon({
  html: `<div style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.3)); transform: translateY(-5px);">
           <svg width="32" height="32" viewBox="0 0 24 24" fill="#FFD700" stroke="#B8860B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
             <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
           </svg>
         </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const SERVICE_META = {
  parking: { label: 'Parkering / Ställplats', color: '#4D8A57' },
  graywater: { label: 'Gråvatten', color: '#7E8A8A' },
  blackwater: { label: 'Svartvatten', color: '#36424A' },
  freshwater: { label: 'Färskvatten', color: '#4D93C7' },
  electricity: { label: 'El finns', color: '#D4A017' }, // Ny kategori
};

function normalizePoiCategory(rawCategory) {
  const category = String(rawCategory || 'default').trim().toLowerCase();
  const categoryMap = {
    parking: 'parking', parkering: 'parking', ställplats: 'parking', stallplats: 'parking', overnight: 'parking',
    graywater: 'graywater', gråvatten: 'graywater', markbrunn: 'graywater',
    blackwater: 'blackwater', svartvatten: 'blackwater', latrin: 'blackwater', kassett: 'blackwater',
    freshwater: 'freshwater', dricksvatten: 'freshwater', vatten: 'freshwater',
    electricity: 'electricity', el: 'electricity', power: 'electricity'
  };
  return categoryMap[category] || category;
}

function buildMultiServiceIcon(serviceKeys) {
  const dots = serviceKeys
    .map(
      (key) => `
        <span
          style="
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: ${SERVICE_META[key]?.color || '#D3B98A'};
            border: 1px solid rgba(255,255,255,0.9);
            box-sizing: border-box;
            display: inline-block;
          "
        ></span>
      `
    )
    .join('');

  const html = `
    <div style="position: relative; width: 34px; height: 44px;">
      <div
        style="
          position: absolute;
          top: 0;
          left: 1px;
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 12%;
          transform: rotate(-45deg);
          background: #ffffff;
          border: 2px solid #47525d;
          box-shadow: 0 3px 8px rgba(0,0,0,0.28);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        "
      >
        <div
          style="
            transform: rotate(45deg);
            display: flex;
            flex-wrap: wrap;
            gap: 2px;
            align-items: center;
            justify-content: center;
            max-width: 18px;
          "
        >
          ${dots}
        </div>
      </div>
    </div>
  `;

  return L.divIcon({ html, className: '', iconSize: [34, 44], iconAnchor: [17, 42], popupAnchor: [0, -36] });
}

function buildTextBlob(poi) {
  return [poi?.name || '', poi?.category || '', poi?.address || '', poi?.description || '']
    .join(' | ')
    .toLowerCase();
}

function getPoiServiceFlags(poi, normalizedCategory) {
  const text = buildTextBlob(poi);
  const check = (terms) => terms.some((term) => text.includes(term));
  return {
    parking: poi?.has_parking === true || normalizedCategory === 'parking' || check(['ställplats', 'stallplats', 'parkering', 'husbilsplats']),
    graywater: poi?.has_graywater === true || normalizedCategory === 'graywater' || check(['markbrunn', 'gråvatten', 'gråvattentömning']),
    blackwater: poi?.has_blackwater === true || normalizedCategory === 'blackwater' || check(['kassett', 'latrin', 'svartvatten', 'toatömning']),
    freshwater: poi?.has_freshwater === true || normalizedCategory === 'freshwater' || check(['färskvatten', 'dricksvatten', 'vattenpost']),
    electricity: poi?.has_electricity === true || normalizedCategory === 'electricity' || check([' el ', ' elanslutning', 'ström']),
  };
}

function DashboardView({ setActiveTab, onOpenLogbookPhotoFlow, currentUser }) {
  const [topProposal, setTopProposal] = useState(null);
  const [latestEntry, setLatestEntry] = useState(null);
  const [pois, setPois] = useState([]);
  const [communityPois, setCommunityPois] = useState({ drafts: [], officials: [] });
  const [loading, setLoading] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showNavModal, setShowNavModal] = useState(false);
  const [selectedPoiForNav, setSelectedPoiForNav] = useState(null);

  // States för ny POI - NU MED MULTI-VAL
  const [tempMarker, setTempMarker] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPoi, setNewPoi] = useState({ 
    name: '', 
    services: { parking: false, graywater: false, blackwater: false, freshwater: false, electricity: false }, 
    lat: null, 
    lng: null 
  });
  const [isSaving, setIsSaving] = useState(false);

  const [activeFilters, setActiveFilters] = useState({
    parking: true,
    graywater: true,
    blackwater: true,
    freshwater: true,
    electricity: true,
    hidden_gems: true, 
  });

  const [weather, setWeather] = useState({
    temp: '--', sunrise: '--:--', sunset: '--:--', icon: <Sun size={18} color="#D8A826" />,
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: propsData } = await supabase.from('proposals').select('*');
      if (propsData?.length > 0) {
        setTopProposal([...propsData].sort((a, b) => (b.votes_up || 0) - (a.votes_up || 0))[0]);
      }
      const { data: logData } = await supabase.from('logbook').select('*').order('created_at', { ascending: false }).limit(1);
      if (logData?.length > 0) setLatestEntry(logData[0]);
      
      const { data: poiData } = await supabase.from('pois').select('*').limit(500);
      setPois(Array.isArray(poiData) ? poiData : []);
      
      const { data: officialData } = await supabase.from('v_official_pois').select('*');
      setCommunityPois({ officials: officialData || [] });

      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=59.61&longitude=16.54&current=temperature_2m,weather_code&daily=sunrise,sunset&timezone=auto');
      const data = await res.json();
      const timeConfig = { hour: '2-digit', minute: '2-digit' };
      setWeather({
        temp: Math.round(data?.current?.temperature_2m ?? 0),
        sunrise: data?.daily?.sunrise?.[0] ? new Date(data.daily.sunrise[0]).toLocaleTimeString('sv-SE', timeConfig) : '--:--',
        sunset: data?.daily?.sunset?.[0] ? new Date(data.daily.sunset[0]).toLocaleTimeString('sv-SE', timeConfig) : '--:--',
        icon: (data?.current?.weather_code ?? 0) > 3 ? <Cloud size={18} color="#8D9998" /> : <Sun size={18} color="#D8A826" />,
      });
    } catch (error) {
      console.error('Fel i dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const validPois = useMemo(() => {
    return pois.map((poi) => {
      const lat = Number(poi?.latitude);
      const lng = Number(poi?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const normalizedCategory = normalizePoiCategory(poi?.category);
      const serviceFlags = getPoiServiceFlags(poi, normalizedCategory);
      return { ...poi, lat, lng, normalizedCategory, serviceFlags };
    }).filter(Boolean);
  }, [pois]);

  const filteredPois = useMemo(() => {
    const activeKeys = Object.entries(activeFilters).filter(([k, v]) => v && k !== 'hidden_gems').map(([k]) => k);
    if (activeKeys.length === 0) return [];
    return validPois.filter((poi) => activeKeys.some((key) => poi.serviceFlags[key]));
  }, [validPois, activeFilters]);

  const toggleFilter = (key) => setActiveFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  const selectAllFilters = () => setActiveFilters({ parking: true, graywater: true, blackwater: true, freshwater: true, electricity: true, hidden_gems: true });
  const clearAllFilters = () => setActiveFilters({ parking: false, graywater: false, blackwater: false, freshwater: false, electricity: false, hidden_gems: false });

  const getMarkerIconForPoi = (poi) => {
    const activeKeys = Object.entries(activeFilters).filter(([k, v]) => v && poi.serviceFlags[k]).map(([k]) => k);
    if (activeKeys.length === 1) return singleServiceIcons[activeKeys[0]] || singleServiceIcons.default;
    if (activeKeys.length > 1) return buildMultiServiceIcon(activeKeys);
    return singleServiceIcons.default;
  };

  const handleMapClick = async (latlng) => {
    setTempMarker(latlng);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      const addr = data.address || {};
      const placeName = data.name || addr.caravan_site || addr.camp_site || addr.road || "Markerad plats";
      
      // Detektera automatiskt tjänster baserat på namnet för att hjälpa användaren
      const autoFlags = getPoiServiceFlags({ name: placeName }, '');
      
      setNewPoi({ 
        name: placeName, 
        services: autoFlags,
        lat: latlng.lat, 
        lng: latlng.lng 
      });
    } catch (e) {
      setNewPoi({ 
        name: 'Markerad plats', 
        services: { parking: false, graywater: false, blackwater: false, freshwater: false, electricity: false },
        lat: latlng.lat, 
        lng: latlng.lng 
      });
    }
  };

  const toggleServiceInModal = (key) => {
    setNewPoi(prev => ({
      ...prev,
      services: { ...prev.services, [key]: !prev.services[key] }
    }));
  };

  const handleSavePoi = async () => {
    if (!newPoi.name.trim()) return;
    setIsSaving(true);
    
    // Vi sparar både i den gamla 'category'-kolumnen (första valet) och de nya boolean-kolumnerna
    const firstSelected = Object.keys(newPoi.services).find(k => newPoi.services[k]) || 'default';

    const { error } = await supabase.from('pois').insert([{
      name: newPoi.name.trim(),
      category: firstSelected,
      latitude: newPoi.lat,
      longitude: newPoi.lng,
      has_parking: newPoi.services.parking,
      has_graywater: newPoi.services.graywater,
      has_blackwater: newPoi.services.blackwater,
      has_freshwater: newPoi.services.freshwater,
      has_electricity: newPoi.services.electricity,
      created_by: currentUser?.id
    }]);

    if (!error) {
      setShowCreateModal(false);
      setTempMarker(null);
      fetchDashboardData();
    } else {
      alert("Fel vid sparande: " + error.message);
    }
    setIsSaving(false);
  };

  const openInApp = (type) => {
    if (!selectedPoiForNav) return;
    const lat = selectedPoiForNav.lat || selectedPoiForNav.latitude;
    const lng = selectedPoiForNav.lng || selectedPoiForNav.longitude;
    const url = type === 'waze' 
      ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` 
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    
    window.open(url, '_blank');
    setShowNavModal(false);
  };

  if (loading) return <div style={loadingStateStyle}>Startar systemet...</div>;

  return (
    <>
      <div style={{ padding: '10px 20px 100px 20px' }} className="animate-fade-in">
        <div style={weatherCardStyle}>
          <div style={weatherRowStyle}>
            <div style={weatherItemStyle}>{weather.icon} <b>{weather.temp}°C</b></div>
            <div style={weatherItemStyle}><Sunrise size={14} color="#CF651F" /> {weather.sunrise}</div>
            <div style={weatherItemStyle}><Sunset size={14} color="#2F5D3A" /> {weather.sunset}</div>
          </div>
        </div>

        <div style={mapContainerStyle}>
          <MapContainer center={[59.61, 16.54]} zoom={11} style={{ height: '100%', width: '100%', borderRadius: '22px' }} zoomControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
            <MapEvents onMapClick={handleMapClick} />
            
            {filteredPois.map((poi) => (
              <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={getMarkerIconForPoi(poi)}>
                <Popup>
                  <div style={{ minWidth: '180px' }}>
                    <strong style={{ color: '#2F5D3A', fontSize: '15px' }}>{poi.name || 'Plats'}</strong>
                    <hr style={{ margin: '8px 0', border: '0', borderTop: '1px solid #E6E2D9' }} />
                    <p style={{ fontSize: '11px', color: '#667276', marginBottom: '10px' }}>{poi.description || poi.address}</p>
                    <button onClick={() => { setSelectedPoiForNav(poi); setShowNavModal(true); }} style={goButtonStyle}>Åk hit 🚐</button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {tempMarker && (
              <Marker position={[tempMarker.lat, tempMarker.lng]} icon={redIcon}>
                <Popup autoOpen>
                  <div style={{ textAlign: 'center', minWidth: '160px', padding: '5px' }}>
                    <strong style={{ display: 'block', marginBottom: '8px' }}>{newPoi.name}</strong>
                    <button onClick={() => setShowCreateModal(true)} style={goButtonStyle}>➕ Lägg till plats</button>
                  </div>
                </Popup>
              </Marker>
            )}

            {activeFilters.hidden_gems && communityPois.officials.map((poi) => {
              if (!poi.latitude || !poi.longitude) return null;
              return (
                <Marker key={poi.id} position={[poi.latitude, poi.longitude]} icon={officialStarIcon}>
                  <Popup>
                    <div style={{ minWidth: '160px', textAlign: 'center' }}>
                      <Star size={24} fill="#FFD700" color="#B8860B" style={{ margin: '0 auto 5px auto' }} />
                      <strong style={{ color: '#B8860B', display: 'block' }}>{poi.name}</strong>
                      <button onClick={() => { setSelectedPoiForNav(poi); setShowNavModal(true); }} style={{...goButtonStyle, marginTop: '10px'}}>Åk hit 🚐</button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          <div style={legendButtonStyle} onClick={() => setShowFilterModal(true)}>
            <span style={{ fontSize: '10px', fontWeight: '800', color: '#95A5A6', marginRight: '2px' }}>POI</span>
            <div style={{ width: '1px', height: '12px', backgroundColor: '#E5DED2' }}></div>
            {['parking', 'graywater', 'blackwater', 'freshwater', 'electricity'].map(k => (
              <span key={k} style={{ ...dot, backgroundColor: activeFilters[k] ? SERVICE_META[k].color : '#D5D8D1' }}></span>
            ))}
            <div style={{ width: '1px', height: '12px', backgroundColor: '#E5DED2' }}></div>
            <Star size={13} fill={activeFilters.hidden_gems ? "#FFD700" : "none"} color={activeFilters.hidden_gems ? "#B8860B" : "#A9B4B5"} />
          </div>
        </div>
          
        <div style={summaryGridStyle}>
          <div style={smallSectionStyle} onClick={() => setActiveTab('convoy')}>
            <div style={sectionHeaderStyle}><Trophy size={14} color="#D8A826" /> MIN KONVOJ VILL ÅKA HIT</div>
            <div style={miniCardStyle}><h4 style={miniTitleStyle}>{topProposal?.name || 'Ingen rutt'}</h4></div>
          </div>
          <div style={smallSectionStyle} onClick={() => setActiveTab('logbook')}>
            <div style={sectionHeaderStyle}><Clock size={14} color="#4D93C7" /> LOGGBOKEN</div>
            <div style={miniCardStyle}><h4 style={miniTitleStyle}>{latestEntry?.location || 'Inga minnen'}</h4></div>
          </div>
        </div>

        <h3 style={shortcutTitleStyle}>Genvägar</h3>
        <div style={shortcutGridStyle}>
          <button style={actionBtnStyle} onClick={() => setActiveTab('convoy')}>
            <MapIcon size={20} color="#2F5D3A" />
            <span style={btnLabelStyleLong}>Vad tipsar mina Buddies om?</span>
          </button>
          <button style={actionBtnStyle} onClick={onOpenLogbookPhotoFlow}>
            <Camera size={20} color="#4D93C7" />
            <span style={btnLabelStyle}>Ta en bild till Loggboken</span>
          </button>
          <button style={actionBtnStyle} onClick={() => setActiveTab('convoy')}>
            <Navigation size={20} color="#CF651F" />
            <span style={btnLabelStyle}>Hitta</span>
          </button>
        </div>
      </div>

      {/* MODAL: SKAPA POI - NU MED MULTI-VAL-UI */}
      {showCreateModal && (
        <div style={modalOverlayStyle} onClick={() => setShowCreateModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Spara ny plats</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none' }}><X /></button>
            </div>
            
            <p style={{ fontSize: '14px', color: '#667276', marginBottom: '8px' }}>Namn på platsen</p>
            <input 
              type="text" 
              value={newPoi.name} 
              onChange={e => setNewPoi({...newPoi, name: e.target.value})} 
              style={inputStyle} 
            />

            <p style={{ fontSize: '14px', color: '#667276', marginBottom: '12px', marginTop: '15px' }}>Vad finns här?</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              {Object.keys(SERVICE_META).map(key => (
                <button
                  key={key}
                  onClick={() => toggleServiceInModal(key)}
                  style={{
                    ...serviceToggleBtn,
                    backgroundColor: newPoi.services[key] ? SERVICE_META[key].color : '#F0F0F0',
                    color: newPoi.services[key] ? 'white' : '#666',
                    border: newPoi.services[key] ? 'none' : '1px solid #DDD'
                  }}
                >
                  {newPoi.services[key] && <Check size={14} style={{ marginRight: '4px' }} />}
                  {SERVICE_META[key].label}
                </button>
              ))}
            </div>

            <button onClick={handleSavePoi} disabled={isSaving} style={saveBtnStyle}>
              {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Spara på kartan</>}
            </button>
          </div>
        </div>
      )}

      {/* NAVIGATION MODAL */}
      {showNavModal && (
        <div style={modalOverlayStyle} onClick={() => setShowNavModal(false)}>
          <div style={modalSheetStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHandleStyle}></div>
            <h3 style={modalTitleStyle}>Vill du åka till {selectedPoiForNav?.name}?</h3>
            <p style={modalTextStyle}>Välj din favoritapp för navigering.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => openInApp('google')} style={navOptionBtnStyle}><Navigation size={20} color="#4285F4" /> Google Maps</button>
              <button onClick={() => openInApp('waze')} style={navOptionBtnStyle}><Navigation size={20} color="#33CCFF" /> Waze</button>
            </div>
            <button onClick={() => setShowNavModal(false)} style={cancelBtnStyle}>Avbryt</button>
          </div>
        </div>
      )}

      {/* FILTER MODAL */}
      {showFilterModal && (
        <div style={modalOverlayStyle} onClick={() => setShowFilterModal(false)}>
          <div style={modalSheetStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHandleStyle}></div>
            <h3 style={modalTitleStyle}>Filtrera POIs</h3>
            <div style={filterListStyle}>
              {Object.keys(SERVICE_META).map(key => (
                <button key={key} type="button" onClick={() => toggleFilter(key)} style={{ ...filterOptionStyle, ...(activeFilters[key] ? filterOptionActiveStyle : {}) }}>
                  <span style={{ ...filterDotStyle, backgroundColor: SERVICE_META[key].color }}></span> {SERVICE_META[key].label}
                </button>
              ))}
              <button type="button" onClick={() => toggleFilter('hidden_gems')} style={{ ...filterOptionStyle, ...(activeFilters.hidden_gems ? filterOptionActiveStyle : {}) }}>
                <Star size={16} fill={activeFilters.hidden_gems ? "#FFD700" : "none"} color="#B8860B" /> Gömda Pärlor
              </button>
            </div>
            <div style={modalActionsStyle}>
              <button onClick={selectAllFilters} style={secondaryModalBtnStyle}>Alla</button>
              <button onClick={clearAllFilters} style={secondaryModalBtnStyle}>Rensa</button>
              <button onClick={() => setShowFilterModal(false)} style={primaryModalBtnStyle}>Klar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// --- STYLES ---
const loadingStateStyle = { textAlign: 'center', marginTop: '100px', color: '#8B9798' };
const weatherCardStyle = { background: '#F7F4EE', border: '1px solid #E8E1D6', borderRadius: '20px', padding: '12px 16px', marginBottom: '14px' };
const weatherRowStyle = { display: 'flex', justifyContent: 'center', gap: '18px', color: '#667276', fontSize: '13px' };
const weatherItemStyle = { display: 'flex', alignItems: 'center', gap: '5px' };
const mapContainerStyle = { height: '350px', width: '100%', borderRadius: '28px', overflow: 'hidden', marginBottom: '25px', position: 'relative', border: '5px solid #F9F7F2' };
const legendButtonStyle = { position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)', zIndex: 2000, backgroundColor: 'rgba(255, 255, 255, 0.96)', padding: '8px 16px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.12)', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.05)' };
const dot = { width: '10px', height: '10px', borderRadius: '50%' };
const summaryGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' };
const smallSectionStyle = { cursor: 'pointer' };
const sectionHeaderStyle = { fontSize: '11px', fontWeight: 'bold', color: '#98A4A5', marginBottom: '7px', display: 'flex', alignItems: 'flex-end', minHeight: '32px', gap: '5px', textTransform: 'uppercase' };
const miniCardStyle = { backgroundColor: '#FAF9F6', padding: '14px', borderRadius: '20px', minHeight: '44px', display: 'flex', alignItems: 'center', border: '1px solid #EEE7DB' };
const miniTitleStyle = { margin: 0, fontSize: '14px', color: '#243137', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const shortcutTitleStyle = { fontSize: '16px', marginBottom: '15px', color: '#243137' };
const shortcutGridStyle = { display: 'flex', gap: '15px' };
const actionBtnStyle = { flex: 1, backgroundColor: '#FAF9F6', border: '1px solid #EEE7DB', padding: '14px 10px', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', minHeight: '100px' };
const btnLabelStyle = { fontSize: '11px', fontWeight: 'bold', color: '#667276', textAlign: 'center' };
const btnLabelStyleLong = { fontSize: '10px', fontWeight: 'bold', color: '#667276', textAlign: 'center' };
const goButtonStyle = { width: '100%', padding: '10px', backgroundColor: '#2F5D3A', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(47,93,58,0.2)' };
const navOptionBtnStyle = { width: '100%', padding: '16px', backgroundColor: 'white', border: '1px solid #E6DED1', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: 'bold', color: '#334247', cursor: 'pointer' };
const cancelBtnStyle = { width: '100%', padding: '14px', border: 'none', background: 'none', color: '#95A5A6', fontSize: '14px', marginTop: '10px', cursor: 'pointer' };
const modalOverlayStyle = { position: 'fixed', inset: 0, zIndex: 3000, backgroundColor: 'rgba(24, 29, 26, 0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '28px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', margin: '0 20px' };
const modalSheetStyle = { width: '100%', maxWidth: '520px', backgroundColor: '#FAF9F6', borderTopLeftRadius: '26px', borderTopRightRadius: '26px', padding: '14px 18px 22px 18px', alignSelf: 'flex-end' };
const modalHandleStyle = { width: '46px', height: '5px', borderRadius: '999px', backgroundColor: '#D5D8D1', margin: '0 auto 14px auto' };
const modalTitleStyle = { margin: '0 0 6px 0', fontSize: '18px', color: '#243137' };
const modalTextStyle = { margin: '0 0 16px 0', fontSize: '13px', color: '#667276' };
const filterListStyle = { display: 'flex', flexDirection: 'column', gap: '10px' };
const filterOptionStyle = { width: '100%', border: '1px solid #E6DED1', backgroundColor: '#F7F4EE', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 'bold' };
const filterOptionActiveStyle = { border: '2px solid #2F5D3A', backgroundColor: '#EEF3EA' };
const filterDotStyle = { width: '12px', height: '12px', borderRadius: '50%' };
const modalActionsStyle = { display: 'flex', gap: '10px', marginTop: '18px' };
const secondaryModalBtnStyle = { flex: 1, border: '1px solid #DDD6CA', backgroundColor: '#ECE9E1', borderRadius: '16px', padding: '14px', fontSize: '14px', fontWeight: 'bold' };
const primaryModalBtnStyle = { flex: 1.3, border: 'none', backgroundColor: '#2F6927', color: '#FFF', borderRadius: '16px', padding: '14px', fontSize: '14px', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #ECE7DF', backgroundColor: '#FAF9F6', outline: 'none', fontSize: '15px' };
const saveBtnStyle = { width: '100%', padding: '16px', backgroundColor: '#2F5D3A', color: 'white', border: 'none', borderRadius: '18px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px', cursor: 'pointer' };
const serviceToggleBtn = { padding: '10px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' };

export default DashboardView;
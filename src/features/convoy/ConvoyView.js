import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import { 
  ThumbsUp, ThumbsDown, Trash2, Plus, Search, Loader2, X, Save, ArrowRightLeft,
  MapPin, Tent, Coffee, Flame, Anchor, Waves, Droplet, Zap, ArrowDown, Star, Camera 
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapEvents({ onMapClick }) {
  useMapEvents({ click(e) { onMapClick(e.latlng); } });
  return null;
}

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, 13); }, [center, map]);
  return null;
}

const createPoiIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const redIcon = createPoiIcon('red');

const singleServiceIcons = {
  parking: createPoiIcon('green'),
  camp_site: createPoiIcon('darkred'),
  rest_area: createPoiIcon('lightgreen'),
  freshwater: createPoiIcon('blue'),
  graywater: createPoiIcon('grey'),
  blackwater: createPoiIcon('black'),
  electricity: createPoiIcon('gold'),
  propane: createPoiIcon('orange'),
  marina: createPoiIcon('darkblue'),
  swimming: createPoiIcon('cadetblue'),
  viewpoint: createPoiIcon('purple'),
  default: createPoiIcon('gold'),
};

const officialStarIcon = L.divIcon({
  html: `<div style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.3)); transform: translateY(-5px);">
           <svg width="32" height="32" viewBox="0 0 24 24" fill="#FFD700" stroke="#B8860B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
             <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
           </svg>
         </div>`,
  className: '', iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32],
});

const SERVICE_META = {
  parking: { label: 'Ställplats', color: '#4D8A57', lightBg: '#E8F5E9' },
  camp_site: { label: 'Camping', color: '#8D6E63', lightBg: '#EFEBE9' },
  rest_area: { label: 'Rastplats', color: '#7CB342', lightBg: '#F1F8E9' },
  freshwater: { label: 'Färskvatten', color: '#4D93C7', lightBg: '#E3F2FD' },
  graywater: { label: 'Gråvatten', color: '#7E8A8A', lightBg: '#F5F5F5' },
  blackwater: { label: 'Svartvatten', color: '#36424A', lightBg: '#ECEFF1' },
  electricity: { label: 'El', color: '#D4A017', lightBg: '#FFF8E1' },
  propane: { label: 'Gasol', color: '#E64A19', lightBg: '#FBE9E7' },
  marina: { label: 'Gästhamn', color: '#1976D2', lightBg: '#E3F2FD' },
  swimming: { label: 'Badplats', color: '#00BCD4', lightBg: '#E0F7FA' },
  viewpoint: { label: 'Utsikt', color: '#9C27B0', lightBg: '#F3E5F5' },
};

const FILTER_CONFIG = [
  { key: 'parking', icon: MapPin, label: 'Ställplats' },
  { key: 'camp_site', icon: Tent, label: 'Camping' },
  { key: 'rest_area', icon: Coffee, label: 'Rastplats' },
  { key: 'freshwater', icon: Droplet, label: 'Färskvatten' },
  { key: 'graywater', icon: ArrowDown, label: 'Gråvatten' },
  { key: 'blackwater', icon: Trash2, label: 'Svartvatten' },
  { key: 'electricity', icon: Zap, label: 'El' },
  { key: 'propane', icon: Flame, label: 'Gasol' },
  { key: 'marina', icon: Anchor, label: 'Gästhamn' },
  { key: 'swimming', icon: Waves, label: 'Badplats' },
  { key: 'viewpoint', icon: Camera, label: 'Utsikt' },
  { key: 'hidden_gems', icon: Star, label: 'Pärlor' },
];

function normalizePoiCategory(rawCategory) {
  const cat = String(rawCategory || 'default').trim().toLowerCase();
  if (['parking', 'parkering', 'ställplats', 'stallplats', 'overnight'].includes(cat)) return 'parking';
  if (['camp_site', 'camping'].includes(cat)) return 'camp_site';
  if (['rest_area', 'rastplats'].includes(cat)) return 'rest_area';
  return cat;
}

function buildMultiServiceIcon(serviceKeys) {
  const dots = serviceKeys.map(key => `<span style="width: 9px; height: 9px; border-radius: 50%; background: ${SERVICE_META[key]?.color || '#D3B98A'}; border: 1px solid rgba(255,255,255,0.9); display: inline-block;"></span>`).join('');
  const html = `<div style="position: relative; width: 34px; height: 44px;"><div style="position: absolute; top: 0; left: 1px; width: 32px; height: 32px; border-radius: 50% 50% 50% 12%; transform: rotate(-45deg); background: #ffffff; border: 2px solid #47525d; box-shadow: 0 3px 8px rgba(0,0,0,0.28); display: flex; align-items: center; justify-content: center; overflow: hidden;"><div style="transform: rotate(45deg); display: flex; flex-wrap: wrap; gap: 2px; align-items: center; justify-content: center; max-width: 18px;">${dots}</div></div></div>`;
  return L.divIcon({ html, className: '', iconSize: [34, 44], iconAnchor: [17, 42], popupAnchor: [0, -36] });
}

function buildTextBlob(poi) {
  return [poi?.name || '', poi?.category || '', poi?.address || '', poi?.description || ''].join(' | ').toLowerCase();
}

function getPoiServiceFlags(poi, normalizedCategory) {
  const text = buildTextBlob(poi);
  const check = (terms) => terms.some((term) => text.includes(term));
  return {
    parking: poi?.has_parking === true || normalizedCategory === 'parking' || check(['ställplats', 'parkering']),
    camp_site: poi?.has_camp_site === true || normalizedCategory === 'camp_site' || check(['camping']),
    rest_area: poi?.has_rest_area === true || normalizedCategory === 'rest_area' || check(['rastplats', 'rast', 'picnic']),
    freshwater: poi?.has_freshwater === true || normalizedCategory === 'freshwater' || check(['färskvatten', 'dricksvatten']),
    graywater: poi?.has_graywater === true || normalizedCategory === 'graywater' || check(['gråvatten']),
    blackwater: poi?.has_blackwater === true || normalizedCategory === 'blackwater' || check(['svartvatten', 'latrin', 'kassett']),
    electricity: poi?.has_electricity === true || normalizedCategory === 'electricity' || check([' el ', 'ström']),
    propane: poi?.has_propane === true || normalizedCategory === 'propane' || check(['gasol', 'gas ']),
    marina: poi?.has_marina === true || normalizedCategory === 'marina' || check(['gästhamn', 'hamn']),
    swimming: poi?.has_swimming === true || normalizedCategory === 'swimming' || check(['badplats', 'strand', 'beach']),
    viewpoint: poi?.has_viewpoint === true || normalizedCategory === 'viewpoint' || check(['utsikt', 'viewpoint']),
  };
}

const ALL_FILTERS_FALSE = { ...Object.keys(SERVICE_META).reduce((acc, key) => ({ ...acc, [key]: false }), {}), hidden_gems: false };
const ALL_FILTERS_TRUE = { ...Object.keys(SERVICE_META).reduce((acc, key) => ({ ...acc, [key]: true }), {}), hidden_gems: true };

// --- HUVUDKOMPONENT ---
function ConvoyView({ currentUser }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState([59.61, 16.54]);
  const [tempMarker, setTempMarker] = useState(null);
  
  const [pois, setPois] = useState([]);
  const [communityPois, setCommunityPois] = useState({ drafts: [], officials: [] });
  const [activeFilters, setActiveFilters] = useState({ ...ALL_FILTERS_FALSE });
  const [findModalRendered, setFindModalRendered] = useState(false);
  const [findModalVisible, setFindModalVisible] = useState(false);
  const [poiSearchText, setPoiSearchText] = useState('');
  
  const [isConvoyFull, setIsConvoyFull] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [modalDraft, setModalDraft] = useState({ name: '', lat: null, lng: null });
  const [isSaving, setIsSaving] = useState(false);

  const openFindModal = () => { 
    setFindModalRendered(true); 
    setTimeout(() => setFindModalVisible(true), 50); 
  };

  useEffect(() => { 
    fetchProposals(); 
    fetchPois();

    // HÄR ÄR MAGIN: Kollar om vi kom hit via "Hitta"-knappen på Dashboarden
    if (sessionStorage.getItem('openConvoySearch') === 'true') {
      sessionStorage.removeItem('openConvoySearch');
      // Vänta liiite grann så att appen hinner rita upp kartan innan modalen glider upp
      setTimeout(() => {
        openFindModal();
      }, 250); 
    }
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('proposals').select('*').order('votes_up', { ascending: false });
    if (!error) {
      setProposals(data || []);
      setIsConvoyFull((data || []).length >= 5);
    }
    setLoading(false);
  };

  const fetchPois = async () => {
    const { data: poiData } = await supabase.from('pois').select('*').limit(500);
    setPois(Array.isArray(poiData) ? poiData : []);
    const { data: officialData } = await supabase.from('v_official_pois').select('*');
    setCommunityPois({ officials: officialData || [] });
  };

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
    
    if (activeKeys.length === 0 && poiSearchText.trim() === '') return [];
    
    return validPois.filter((poi) => {
      const matchesSearch = poiSearchText.trim() === '' || 
        (poi.name && poi.name.toLowerCase().includes(poiSearchText.toLowerCase())) ||
        (poi.description && poi.description.toLowerCase().includes(poiSearchText.toLowerCase()));
      
      const matchesFilter = activeKeys.length === 0 ? true : activeKeys.some((key) => poi.serviceFlags[key]);
      
      return matchesFilter && matchesSearch;
    });
  }, [validPois, activeFilters, poiSearchText]);

  const currentHitsCount = useMemo(() => {
    const regularHits = filteredPois.length;
    const gemsHits = activeFilters.hidden_gems ? communityPois.officials.filter(p => !poiSearchText || p.name?.toLowerCase().includes(poiSearchText.toLowerCase())).length : 0;
    return regularHits + gemsHits;
  }, [filteredPois, activeFilters.hidden_gems, communityPois.officials, poiSearchText]);

  const getMarkerIconForPoi = (poi) => {
    let activeKeys = Object.keys(SERVICE_META).filter(k => activeFilters[k] && poi.serviceFlags[k]);
    if (activeKeys.length === 0) {
      activeKeys = Object.keys(SERVICE_META).filter(k => poi.serviceFlags[k]);
    }
    if (activeKeys.length === 1) return singleServiceIcons[activeKeys[0]] || singleServiceIcons.default;
    if (activeKeys.length > 1) return buildMultiServiceIcon(activeKeys);
    return singleServiceIcons.default;
  };

  const toggleFilter = (key) => setActiveFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  
  const closeFindModal = () => { 
    setFindModalVisible(false); 
    setTimeout(() => setFindModalRendered(false), 400); 
  };

  const selectAllFilters = () => {
    setActiveFilters({ ...ALL_FILTERS_TRUE });
    setPoiSearchText('');
  };

  const clearAllFilters = () => {
    setActiveFilters({ ...ALL_FILTERS_FALSE });
    setPoiSearchText('');
  };

  const triggerAddFlow = (draftData) => {
    setModalDraft(draftData);
    if (isConvoyFull) {
      setShowReplaceModal(true);
      setShowCreateModal(false);
    } else {
      setShowCreateModal(true);
      setShowReplaceModal(false);
    }
  };

  const handleMapClick = async (latlng) => {
    setTempMarker(latlng);
    
    supabase.from('proposals').select('*', { count: 'exact', head: true }).then(({ count }) => {
      if (count !== null) {
        setIsConvoyFull(count >= 5);
        if (count !== proposals.length) fetchProposals(); 
      }
    });

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      const placeName = data.name || data.address?.road || "Markerad plats";
      setModalDraft({ name: placeName, lat: latlng.lat, lng: latlng.lng });
    } catch (e) {
      setModalDraft({ name: 'Markerad plats', lat: latlng.lat, lng: latlng.lng });
    }
  };

  const handleCreateNew = async () => {
    if (!modalDraft.name.trim() || isSaving) return;
    setIsSaving(true);

    try {
      const { count, error: countError } = await supabase.from('proposals').select('*', { count: 'exact', head: true });
      if (countError) { alert("Kunde inte bekräfta plats. Försök igen."); setIsSaving(false); return; }
      if (count >= 5) {
        alert("Någon hann före! Konvojen är nu full.");
        setIsConvoyFull(true);
        await fetchProposals();
        setShowCreateModal(false);
        setShowReplaceModal(true);
        setIsSaving(false);
        return;
      }

      const { error: insertError } = await supabase.from('proposals').insert([{ 
        name: modalDraft.name.trim(), votes_up: 1, user_id: currentUser?.id,
        created_by_name: currentUser?.name || 'Anonym Buddy', latitude: modalDraft.lat, longitude: modalDraft.lng
      }]);

      if (!insertError) { closeAllAndRefresh(); } else { alert("Kunde inte publicera: " + insertError.message); }
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  const handleReplace = async (oldId) => {
    if (!modalDraft.name.trim() || isSaving) return;
    setIsSaving(true);

    try {
      const { error: deleteError } = await supabase.from('proposals').delete().eq('id', oldId);
      if (deleteError) { alert("Kunde inte radera det gamla tipset."); setIsSaving(false); return; }

      const { error: insertError } = await supabase.from('proposals').insert([{ 
        name: modalDraft.name.trim(), votes_up: 1, user_id: currentUser?.id,
        created_by_name: currentUser?.name || 'Anonym Buddy', latitude: modalDraft.lat, longitude: modalDraft.lng
      }]);

      if (!insertError) { closeAllAndRefresh(); } else { alert("Fel vid sparning: " + insertError.message); }
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  const closeAllAndRefresh = () => {
    setShowCreateModal(false);
    setShowReplaceModal(false);
    setTempMarker(null);
    setSearchQuery('');
    setModalDraft({ name: '', lat: null, lng: null });
    fetchProposals();
  };

  return (
    <div style={{ padding: '10px 20px 100px 20px' }}>
      
      {/* KARTAN */}
      <div style={mapWrapperStyle}>
        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <ChangeView center={mapCenter} />
          <MapEvents onMapClick={handleMapClick} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {/* KONVOJ-FÖRSLAG */}
          {proposals.map(p => (
            p.latitude && p.longitude && (
              <Marker key={`prop-${p.id}`} position={[p.latitude, p.longitude]} icon={redIcon}>
                <Popup>
                  <div style={{ textAlign: 'center' }}>
                    <strong>{p.name}</strong>
                    <br/><span style={{ fontSize: '11px', color: '#666' }}>I Konvojen</span>
                  </div>
                </Popup>
              </Marker>
            )
          ))}

          {/* SÖKTA POIS */}
          {filteredPois.map((poi) => (
            <Marker key={`poi-${poi.id}`} position={[poi.lat, poi.lng]} icon={getMarkerIconForPoi(poi)}>
              <Popup>
                <div style={{ minWidth: '160px', textAlign: 'center' }}>
                  <strong style={{ color: '#2F5D3A', fontSize: '15px', display: 'block', marginBottom: '8px' }}>{poi.name}</strong>
                  <button onClick={() => triggerAddFlow({ name: poi.name, lat: poi.lat, lng: poi.lng })} style={popupActionBtn}>
                    ➕ {isConvoyFull ? 'Ersätt i Konvoj' : 'Föreslå för Konvoj'}
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* GÖMDA PÄRLOR */}
          {activeFilters.hidden_gems && communityPois.officials.map((poi) => {
            if (!poi.latitude || !poi.longitude) return null;
            if (poiSearchText && !poi.name?.toLowerCase().includes(poiSearchText.toLowerCase())) return null;
            return (
              <Marker key={`star-${poi.id}`} position={[poi.latitude, poi.longitude]} icon={officialStarIcon}>
                <Popup>
                  <div style={{ minWidth: '160px', textAlign: 'center' }}>
                    <Star size={24} fill="#FFD700" color="#B8860B" style={{ margin: '0 auto 5px auto' }} />
                    <strong style={{ color: '#B8860B', display: 'block', marginBottom: '8px' }}>{poi.name}</strong>
                    <button onClick={() => triggerAddFlow({ name: poi.name, lat: poi.latitude, lng: poi.longitude })} style={popupActionBtn}>
                      ➕ {isConvoyFull ? 'Ersätt i Konvoj' : 'Föreslå för Konvoj'}
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* TILLFÄLLIG MARKÖR VID KLICK */}
          {tempMarker && (
            <Marker position={tempMarker} icon={redIcon}>
              <Popup autoOpen>
                <button onClick={() => triggerAddFlow(modalDraft)} style={popupActionBtn}>
                  ➕ {isConvoyFull ? 'Ersätt ett tips' : 'Skapa reseförslag'}
                </button>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* HITTA-KNAPP DIREKT PÅ KARTAN */}
        <div style={legendButtonStyle} onClick={openFindModal}>
          <Search size={16} color="#2F5D3A" style={{ marginRight: '6px' }} />
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#334247' }}>Hitta platser & POIs</span>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '25px', display: 'flex', gap: '10px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} color="#98A4A5" style={{ position: 'absolute', left: '12px', top: '15px' }} />
          <input 
            type="text" placeholder="Skriv in egen text..." 
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
            style={searchInputStyle} 
          />
        </div>
        <button 
          onClick={() => {
            supabase.from('proposals').select('*', { count: 'exact', head: true }).then(({ count }) => {
              setIsConvoyFull(count >= 5);
              triggerAddFlow({ name: searchQuery, lat: null, lng: null });
            });
          }} 
          style={addBtnStyle}
        >
          <Plus color="white" />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={countInfoStyle}>
          <span style={{ color: isConvoyFull ? '#E74C3C' : '#98A4A5' }}>
            {proposals.length} av 5 förslag använda
          </span>
        </div>
        
        {proposals.map((p) => (
          <div key={p.id} style={proposalCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>{p.name}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#98A4A5' }}>Tips från {p.created_by_name}</p>
              </div>
              <button onClick={async () => { if(window.confirm("Ta bort?")) { await supabase.from('proposals').delete().eq('id', p.id); fetchProposals(); } }} style={deleteBtnStyle}><Trash2 size={18} /></button>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button onClick={async () => { await supabase.from('proposals').update({ votes_up: (p.votes_up || 0) + 1 }).eq('id', p.id); fetchProposals(); }} style={voteUpBtn}><ThumbsUp size={18} /> {p.votes_up || 0}</button>
              <button onClick={async () => { await supabase.from('proposals').update({ votes_down: (p.votes_down || 0) + 1 }).eq('id', p.id); fetchProposals(); }} style={voteDownBtn}><ThumbsDown size={18} /> {p.votes_down || 0}</button>
            </div>
          </div>
        ))}
      </div>

      {/* --- MJUK, FLYTANDE SÖKMODAL --- */}
      {findModalRendered && (
        <div style={{ ...modalOverlayStyle, opacity: findModalVisible ? 1 : 0, transition: 'opacity 0.4s ease' }} onClick={closeFindModal}>
          <div style={{ ...modalSheetStyle, transform: findModalVisible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)' }} onClick={(e) => e.stopPropagation()}>
            <div style={modalHandleStyle}></div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div>
                <h3 style={modalTitleStyle}>Sök POIs för Konvojen</h3>
                <p style={modalTextStyle}>Välj symboler och/eller sök på namn.</p>
              </div>
              <button onClick={closeFindModal} style={iconOnlyBtnStyle}><X size={24}/></button>
            </div>

            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <Search size={18} color="#98A4A5" style={{ position: 'absolute', left: '14px', top: '15px' }} />
              <input 
                type="text" placeholder="Fritextsök (t.ex. 'Lövlunds gård')..." 
                value={poiSearchText} onChange={(e) => setPoiSearchText(e.target.value)}
                style={{...searchInputStyle, paddingLeft: '40px', backgroundColor: '#FFF', width: '100%', boxSizing: 'border-box'}} 
              />
            </div>
            
            <div style={findGridStyle}>
              {FILTER_CONFIG.map(({ key, icon: Icon, label }) => {
                const isHiddenGems = key === 'hidden_gems';
                const isActive = activeFilters[key];
                const color = isHiddenGems ? '#B8860B' : SERVICE_META[key].color;
                const lightBg = isHiddenGems ? '#FFFDE7' : SERVICE_META[key].lightBg;

                return (
                  <button key={key} onClick={() => toggleFilter(key)} style={{ ...findOptionBtnStyle, opacity: isActive ? 1 : 0.4 }}>
                    <div style={{ ...findIconWrapper, backgroundColor: isActive ? lightBg : '#F0F0F0', border: isActive ? `2px solid ${color}` : '2px solid transparent' }}>
                      <Icon size={24} color={isActive ? color : '#999'} />
                    </div>
                    <span style={{...findOptionTextStyle, color: isActive ? '#334247' : '#999'}}>{label}</span>
                  </button>
                );
              })}
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
               <button onClick={clearAllFilters} style={secondaryModalBtnStyle}>Rensa</button>
               <button onClick={selectAllFilters} style={secondaryModalBtnStyle}>Alla</button>
               <button onClick={() => { closeFindModal(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={primaryModalBtnStyle}>
                Visa {currentHitsCount} träffar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SKAPA NYTT (Manuellt) */}
      {showCreateModal && (
        <div style={modalOverlayStyle} onClick={() => setShowCreateModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Föreslå för konvoj</h2>
              <button onClick={() => setShowCreateModal(false)} style={iconOnlyBtnStyle}><X /></button>
            </div>
            <input 
              type="text" value={modalDraft.name} 
              onChange={(e) => setModalDraft({ ...modalDraft, name: e.target.value })} 
              style={{ ...searchInputStyle, paddingLeft: '15px', marginBottom: '20px', width: '100%', boxSizing: 'border-box' }} 
              autoFocus 
            />
            <button onClick={handleCreateNew} disabled={isSaving} style={saveBtnStyle}>
              {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Bekräfta & Publicera</>}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ERSÄTT */}
      {showReplaceModal && (
        <div style={modalOverlayStyle} onClick={() => setShowReplaceModal(false)}>
          <div style={{ ...modalSheetStyle, transform: 'translateY(0)', padding: '20px 24px 40px 24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={modalHandleStyle}></div>
            <h3 style={{ marginBottom: '10px', textAlign: 'center', color: '#243137' }}>Konvojen är full! (Max 5)</h3>
            <p style={{ textAlign: 'center', color: '#667276', marginBottom: '20px', fontSize: '14px' }}>
              Välj ett tips att radera för att ge plats åt:<br/><b>{modalDraft.name}</b>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {proposals.map(p => (
                <button key={p.id} onClick={() => handleReplace(p.id)} disabled={isSaving} style={replaceOptionBtn}>
                  <ArrowRightLeft size={16} style={{ marginRight: '12px', color: '#2F5D3A' }} /> 
                  <span style={{ flex: 1 }}>{p.name}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowReplaceModal(false)} style={cancelBtnStyle}>Avbryt</button>
          </div>
        </div>
      )}
    </div>
  );
}

// STYLES
const mapWrapperStyle = { height: '350px', borderRadius: '28px', overflow: 'hidden', marginBottom: '20px', border: '5px solid #F9F7F2', position: 'relative' };
const legendButtonStyle = { position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)', zIndex: 2000, backgroundColor: 'rgba(255, 255, 255, 0.96)', padding: '12px 20px', borderRadius: '999px', display: 'flex', alignItems: 'center', boxShadow: '0 8px 25px rgba(0,0,0,0.15)', cursor: 'pointer', border: '1px solid rgba(47,93,58,0.1)' };
const searchInputStyle = { width: '100%', padding: '14px 14px 14px 40px', borderRadius: '16px', border: '2px solid #ECE7DF', outline: 'none', backgroundColor: '#FAF9F6' };
const addBtnStyle = { backgroundColor: '#2F5D3A', border: 'none', borderRadius: '16px', width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const countInfoStyle = { fontSize: '11px', fontWeight: '800', color: '#98A4A5', textAlign: 'right', textTransform: 'uppercase', marginBottom: '5px' };
const proposalCardStyle = { backgroundColor: '#FAF9F6', borderRadius: '24px', padding: '20px', border: '1px solid #EEE7DB' };
const popupActionBtn = { width: '100%', padding: '12px', backgroundColor: '#2F5D3A', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' };
const voteUpBtn = { flex: 1, padding: '12px', borderRadius: '14px', border: 'none', backgroundColor: '#E7EFE3', color: '#2F5D3A', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '8px', cursor: 'pointer' };
const voteDownBtn = { flex: 1, padding: '12px', borderRadius: '14px', border: 'none', backgroundColor: '#FDECEC', color: '#C0392B', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '8px', cursor: 'pointer' };
const deleteBtnStyle = { background: 'none', border: 'none', color: '#98A4A5', padding: '5px', cursor: 'pointer' };

const modalOverlayStyle = { position: 'fixed', inset: 0, zIndex: 3000, backgroundColor: 'rgba(24, 29, 26, 0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '28px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' };
const modalSheetStyle = { width: '100%', maxWidth: '520px', backgroundColor: '#FAF9F6', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '20px 24px 30px 24px', alignSelf: 'flex-end', boxShadow: '0 -10px 40px rgba(0,0,0,0.15)', maxHeight: '85vh', overflowY: 'auto' };
const modalHandleStyle = { width: '46px', height: '5px', borderRadius: '999px', backgroundColor: '#D5D8D1', margin: '0 auto 16px auto' };
const modalTitleStyle = { margin: '0 0 4px 0', fontSize: '20px', color: '#243137', fontWeight: '800' };
const modalTextStyle = { margin: '0 0 0 0', fontSize: '13px', color: '#667276' };

const secondaryModalBtnStyle = { flex: 1, border: '1px solid #DDD6CA', backgroundColor: '#ECE9E1', borderRadius: '16px', padding: '14px 10px', fontSize: '13px', fontWeight: 'bold', color: '#667276', cursor: 'pointer', textAlign: 'center' };
const primaryModalBtnStyle = { flex: 2.5, border: 'none', backgroundColor: '#2F5D3A', color: '#FFF', borderRadius: '16px', padding: '14px 10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 8px 20px rgba(47,93,58,0.25)', textAlign: 'center' };

const saveBtnStyle = { width: '100%', padding: '16px', backgroundColor: '#2F5D3A', color: 'white', border: 'none', borderRadius: '18px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '10px', cursor: 'pointer' };
const replaceOptionBtn = { width: '100%', padding: '16px', backgroundColor: 'white', border: '1px solid #EEE7DB', borderRadius: '16px', textAlign: 'left', fontWeight: '700', display: 'flex', alignItems: 'center', fontSize: '15px', color: '#243137', cursor: 'pointer' };
const cancelBtnStyle = { width: '100%', padding: '14px', border: 'none', background: 'none', color: '#95A5A6', marginTop: '10px', fontWeight: '600', cursor: 'pointer' };
const iconOnlyBtnStyle = { background: 'none', border: 'none', color: '#98A4A5', cursor: 'pointer', padding: '5px' };

const findGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '25px', marginTop: '15px' };
const findOptionBtnStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: '0', transition: 'all 0.2s ease' };
const findIconWrapper = { width: '56px', height: '56px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', margin: '0 auto' };
const findOptionTextStyle = { fontSize: '11px', fontWeight: '800', transition: 'color 0.2s ease' };

export default ConvoyView;
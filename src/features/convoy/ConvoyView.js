import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import { 
  ThumbsUp, ThumbsDown, Trash2, Plus, Search, Loader2, X, Save, ArrowRightLeft,
  MapPin, Tent, Coffee, Flame, Anchor, Waves, Droplet, Zap, ArrowDown, Star, Camera, Navigation
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- LEAFLET GRUND-SETUP ---
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

function ChangeView({ center, zoom, trigger }) {
  const map = useMap();
  useEffect(() => { 
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || 10, { duration: 1.5 }); 
    }
  }, [center, zoom, trigger, map]);
  return null;
}

const blueDotIcon = L.divIcon({
  html: `<div style="width: 18px; height: 18px; background-color: #4285F4; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 8px rgba(0,0,0,0.4);"></div>`,
  className: '', iconSize: [18, 18], iconAnchor: [9, 9]
});

const createPoiIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const redIcon = createPoiIcon('red');

const singleServiceIcons = {
  parking: createPoiIcon('green'),
  camp_site: createPoiIcon('violet'),
  rest_area: createPoiIcon('orange'),
  freshwater: createPoiIcon('blue'),
  graywater: createPoiIcon('grey'),
  blackwater: createPoiIcon('black'),
  electricity: createPoiIcon('gold'),
  propane: createPoiIcon('orange'),
  marina: createPoiIcon('blue'),
  swimming: createPoiIcon('blue'),
  viewpoint: createPoiIcon('purple'),
  default: createPoiIcon('grey'),
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
  parking: { label: 'Ställplats', color: '#2e7d32', lightBg: '#E8F5E9' },
  camp_site: { label: 'Camping', color: '#7b1fa2', lightBg: '#F3E5F5' },
  rest_area: { label: 'Rastplats', color: '#ed6c02', lightBg: '#FFF3E0' },
  freshwater: { label: 'Vatten', color: '#1976D2', lightBg: '#E3F2FD' },
  graywater: { label: 'Gråvatten', color: '#7E8A8A', lightBg: '#F5F5F5' },
  blackwater: { label: 'Svartvatten', color: '#36424A', lightBg: '#ECEFF1' },
  electricity: { label: 'El', color: '#D4A017', lightBg: '#FFF8E1' },
  propane: { label: 'Gasol', color: '#E64A19', lightBg: '#FBE9E7' },
  marina: { label: 'Gästhamn', color: '#1976D2', lightBg: '#E3F2FD' },
  swimming: { label: 'Badplats', color: '#0288d1', lightBg: '#E1F5FE' },
  viewpoint: { label: 'Utsikt', color: '#9C27B0', lightBg: '#F3E5F5' },
};

const FILTER_CONFIG = [
  { key: 'parking', icon: MapPin, label: 'Ställplats' },
  { key: 'camp_site', icon: Tent, label: 'Camping' },
  { key: 'rest_area', icon: Coffee, label: 'Rastplats' },
  { key: 'freshwater', icon: Droplet, label: 'Vatten' },
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
  if (['parking', 'parkering', 'ställplats', 'stallplats'].includes(cat)) return 'parking';
  if (['camp_site', 'camping'].includes(cat)) return 'camp_site';
  if (['rest_area', 'rastplats', 'picnic_site'].includes(cat)) return 'rest_area';
  if (['swimming', 'swimming_area', 'bathing_place', 'badplats', 'bad'].includes(cat)) return 'swimming';
  return cat;
}

function getPoiServiceFlags(poi, normalizedCategory) {
  const text = [poi?.name || '', poi?.description || ''].join(' ').toLowerCase();
  const check = (terms) => terms.some((term) => text.includes(term));
  return {
    parking: normalizedCategory === 'parking' || check(['ställplats', 'parkering']),
    camp_site: normalizedCategory === 'camp_site' || check(['camping']),
    rest_area: normalizedCategory === 'rest_area' || check(['rastplats', 'rast', 'picnic']),
    freshwater: poi?.has_freshwater || check(['färskvatten', 'vatten']),
    graywater: poi?.has_graywater || check(['gråvatten']),
    blackwater: poi?.has_blackwater || check(['svartvatten', 'latrin']),
    electricity: poi?.has_electricity || check([' el ', 'ström']),
    propane: poi?.has_propane || check(['gasol']),
    marina: normalizedCategory === 'marina' || check(['hamn']),
    swimming: normalizedCategory === 'swimming' || check(['bad', 'strand', 'beach']),
    viewpoint: normalizedCategory === 'viewpoint' || check(['utsikt', 'viewpoint']),
  };
}

function buildMultiServiceIcon(serviceKeys) {
  const dots = serviceKeys.slice(0, 4).map(key => `<span style="width: 8px; height: 8px; border-radius: 50%; background: ${SERVICE_META[key]?.color || '#999'}; border: 1px solid white; display: inline-block;"></span>`).join('');
  const html = `<div style="position: relative; width: 34px; height: 44px;"><div style="position: absolute; top: 0; left: 1px; width: 32px; height: 32px; border-radius: 50% 50% 50% 12%; transform: rotate(-45deg); background: white; border: 2.5px solid #47525d; box-shadow: 0 3px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; overflow: hidden;"><div style="transform: rotate(45deg); display: flex; flex-wrap: wrap; gap: 2px; align-items: center; justify-content: center; max-width: 20px;">${dots}</div></div></div>`;
  return L.divIcon({ html, className: '', iconSize: [34, 44], iconAnchor: [17, 42], popupAnchor: [0, -36] });
}

const ALL_FILTERS_FALSE = { ...Object.keys(SERVICE_META).reduce((acc, key) => ({ ...acc, [key]: false }), {}), hidden_gems: false };

// --- HUVUDKOMPONENT ---
function ConvoyView({ currentUser }) {
  // STATES
  const [proposals, setProposals] = useState([]);
  const [pois, setPois] = useState([]);
  const [communityPois, setCommunityPois] = useState({ officials: [] });
  const [activeFilters, setActiveFilters] = useState({ ...ALL_FILTERS_FALSE });
  const [flyTrigger, setFlyTrigger] = useState(0);
  const [focusMarker, setFocusMarker] = useState(null); 
  
  const [findModalVisible, setFindModalVisible] = useState(false);
  const [findModalRendered, setFindModalRendered] = useState(false);
  
  const [navModalVisible, setNavModalVisible] = useState(false);
  const [navModalRendered, setNavModalRendered] = useState(false);
  const [selectedNavPoi, setSelectedNavPoi] = useState(null);

  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([59.61, 16.54]);
  const [mapZoom, setMapZoom] = useState(13);
  
  const [tempMarker, setTempMarker] = useState(null);
  const [modalDraft, setModalDraft] = useState({ name: '', lat: null, lng: null });
  const [isConvoyFull, setIsConvoyFull] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // --- EFFEKT VID START ---
  useEffect(() => { 
    fetchProposals(); 
    fetchPois(); 
    
    // Kolla om vi ska fokusera på en specifik plats (från Dashboard)
    const convoyFocusRaw = sessionStorage.getItem('openConvoyFocus');
    if (convoyFocusRaw) {
      sessionStorage.removeItem('openConvoyFocus');
      const focusData = JSON.parse(convoyFocusRaw);
      if (focusData.coords) {
          setMapCenter(focusData.coords);
          setMapZoom(focusData.zoom || 14);
          setFlyTrigger(prev => prev + 1);
      }
    } else if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          setMapCenter(coords);
          setMapZoom(10); 
          setFlyTrigger(prev => prev + 1);
        },
        () => console.warn("Kunde inte hämta plats"),
        { timeout: 5000 }
      );
    }

    if (sessionStorage.getItem('openConvoySearch') === 'true') {
        sessionStorage.removeItem('openConvoySearch');
        setTimeout(() => openFindModal(), 300);
    }
  }, []);

  // NOMINATIM AUTO-SÖK: Begränsat till NORDEN
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 2) {
        setIsSearching(true);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=se,no,dk,fi,is`);
          const data = await res.json();
          setSearchResults(data);
        } catch (e) {
          console.error("Fel vid platssökning:", e);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 800);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Funktion för att visa ett tips från listan på kartan
  const handleShowProposalOnMap = (proposal) => {
    if (proposal && proposal.latitude && proposal.longitude) {
      const lat = parseFloat(proposal.latitude);
      const lng = parseFloat(proposal.longitude);
      
      setMapCenter([lat, lng]);
      setMapZoom(14);
      setFlyTrigger(prev => prev + 1);

      setFocusMarker({
        coords: [lat, lng],
        name: proposal.name,
        createdBy: proposal.created_by_name || 'En Buddy'
      });
    }
  };

  const fetchProposals = async () => {
    const { data } = await supabase.from('proposals').select('*').order('votes_up', { ascending: false });
    setProposals(data || []);
    setIsConvoyFull((data || []).length >= 5);
  };

  const fetchPois = async () => {
    const { data: poiData } = await supabase.from('pois').select('*').limit(10000);
    setPois(poiData || []);
    const { data: officialData } = await supabase.from('v_official_pois').select('*');
    setCommunityPois({ officials: officialData || [] });
  };

  const validPois = useMemo(() => {
    return pois.map((poi) => {
      const lat = parseFloat(poi.latitude); 
      const lng = parseFloat(poi.longitude);
      if (isNaN(lat) || isNaN(lng) || lat === 0) return null;
      const normalizedCategory = normalizePoiCategory(poi.category);
      const serviceFlags = getPoiServiceFlags(poi, normalizedCategory);
      return { ...poi, lat, lng, normalizedCategory, serviceFlags };
    }).filter(Boolean);
  }, [pois]);

  const filteredPois = useMemo(() => {
    const activeKeys = Object.entries(activeFilters).filter(([k, v]) => v && k !== 'hidden_gems').map(([k]) => k);
    if (activeKeys.length === 0 && !searchQuery.trim()) return [];
    
    return validPois.filter((poi) => {
      const matchesSearch = !searchQuery || poi.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeKeys.length === 0 || activeKeys.some(key => poi.serviceFlags[key]);
      return matchesSearch && matchesFilter;
    });
  }, [validPois, activeFilters, searchQuery]);

  const currentHitsCount = useMemo(() => {
    const regularHits = filteredPois.length;
    const gemsHits = activeFilters.hidden_gems ? communityPois.officials.filter(p => !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase())).length : 0;
    return regularHits + gemsHits;
  }, [filteredPois, activeFilters.hidden_gems, communityPois.officials, searchQuery]);

  const getMarkerIconForPoi = (poi) => {
    const keys = Object.keys(SERVICE_META).filter(k => poi.serviceFlags[k]);
    if (keys.length === 1) return singleServiceIcons[keys[0]] || singleServiceIcons.default;
    if (keys.length > 1) return buildMultiServiceIcon(keys);
    return singleServiceIcons[poi.normalizedCategory] || singleServiceIcons.default;
  };

  const handleVote = async (id, isUpvote) => {
    const proposal = proposals.find((p) => p.id === id);
    if (!proposal) return;
    const updatePayload = isUpvote 
      ? { votes_up: (proposal.votes_up || 0) + 1 }
      : { votes_down: (proposal.votes_down || 0) + 1 };
    await supabase.from('proposals').update(updatePayload).eq('id', id);
    fetchProposals();
  };

  const openFindModal = () => { setFindModalRendered(true); setTimeout(() => setFindModalVisible(true), 50); };
  const closeFindModal = () => { setFindModalVisible(false); setTimeout(() => setFindModalRendered(false), 400); };
  
  const openNavModal = (poi) => {
    setSelectedNavPoi(poi);
    setNavModalRendered(true);
    setTimeout(() => setNavModalVisible(true), 50);
  };

  const closeNavModal = () => {
    setNavModalVisible(false);
    setTimeout(() => setNavModalRendered(false), 400);
  };

  const handleNavigate = (type) => {
    if (!selectedNavPoi) return;
    const lat = selectedNavPoi.lat || selectedNavPoi.latitude;
    const lng = selectedNavPoi.lng || selectedNavPoi.longitude;
    const url = type === 'waze' 
      ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` 
      : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
    closeNavModal();
  };

  const toggleFilter = (key) => setActiveFilters(prev => ({ ...prev, [key]: !prev[key] }));
  const selectAllFilters = () => setActiveFilters({ ...Object.keys(SERVICE_META).reduce((acc, k) => ({...acc, [k]: true}), {}), hidden_gems: true });
  const clearAllFilters = () => setActiveFilters({ ...ALL_FILTERS_FALSE });

  const handleMapClick = async (latlng) => {
    setTempMarker(latlng);
    setMapCenter([latlng.lat, latlng.lng]);
    setFlyTrigger(prev => prev + 1); 
    setFocusMarker(null); 

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      const addr = data.address || {};
      const placeName = data.name || addr.caravan_site || addr.camp_site || addr.road || "Markerad plats";
      setModalDraft({ name: placeName, lat: latlng.lat, lng: latlng.lng });
    } catch (e) { 
      setModalDraft({ name: 'Markerad plats', lat: latlng.lat, lng: latlng.lng }); 
    }
  };

  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    const cleanName = result.name || result.display_name.split(',')[0];

    setMapCenter([lat, lon]);
    setMapZoom(14);
    setFlyTrigger(prev => prev + 1);

    setTempMarker({ lat, lng: lon });
    setModalDraft({ name: cleanName, lat, lng: lon });

    setSearchQuery(cleanName); 
    setSearchResults([]); 
    setFocusMarker(null); 
  };

  const triggerAddFlow = (draft) => { setModalDraft(draft); if (isConvoyFull) setShowReplaceModal(true); else setShowCreateModal(true); };

  const handleCreateNew = async () => {
    if (isSaving || !modalDraft.name) return;
    setIsSaving(true);
    await supabase.from('proposals').insert([{ name: modalDraft.name, latitude: modalDraft.lat, longitude: modalDraft.lng, votes_up: 1, user_id: currentUser?.id, created_by_name: currentUser?.name || 'Buddy' }]);
    setShowCreateModal(false); setTempMarker(null); fetchProposals(); setIsSaving(false);
  };

  const handleReplace = async (id) => { await supabase.from('proposals').delete().eq('id', id); handleCreateNew(); setShowReplaceModal(false); };

  return (
    <div style={{ padding: '10px 20px 100px 20px', boxSizing: 'border-box' }}>
      <div style={mapWrapperStyle}>
        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%' }} zoomControl={false}>
          <ChangeView center={mapCenter} zoom={mapZoom} trigger={flyTrigger} />
          <MapEvents onMapClick={handleMapClick} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {userLocation && (
              <Marker position={userLocation} icon={blueDotIcon} zIndexOffset={1000}>
                <Popup><strong style={{ color: '#4285F4' }}>Du är här</strong></Popup>
              </Marker>
          )}

          {focusMarker && (
            <Marker position={focusMarker.coords} icon={redIcon}>
              <Popup autoOpen>
                <div style={{ textAlign: 'center', minWidth: '160px' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#2F5D3A', fontSize: '16px' }}>{focusMarker.name}</h3>
                  <hr style={{ border: 'none', borderTop: '1px solid #EEE7DB', marginBottom: '10px' }} />
                  <p style={{ fontSize: '11px', color: '#667276', marginBottom: '15px' }}>Tips från {focusMarker.createdBy}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {proposals.map(p => {
             if (!p.latitude || !p.longitude) return null;
             return <Marker key={p.id} position={[parseFloat(p.latitude), parseFloat(p.longitude)]} icon={redIcon}><Popup><strong>{p.name}</strong></Popup></Marker>
          })}

          {filteredPois.map(poi => (
            <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={getMarkerIconForPoi(poi)}>
                <Popup>
                    <div style={{ textAlign: 'center', minWidth: '180px' }}>
                        <h3 style={{ margin: '0 0 8px 0', color: '#2F5D3A', fontSize: '16px' }}>{poi.name}</h3>
                        <hr style={{ border: 'none', borderTop: '1px solid #EEE7DB', marginBottom: '10px' }} />
                        <button onClick={() => openNavModal(poi)} style={goButtonStyle}>
                            Åk hit 🚐
                        </button>
                        <button 
                            onClick={() => triggerAddFlow(poi)} 
                            style={{ ...goButtonStyle, backgroundColor: 'transparent', color: '#2F5D3A', marginTop: '8px', border: '1px solid #2F5D3A', boxShadow: 'none' }}
                        >
                            ➕ Föreslå för Konvoj
                        </button>
                    </div>
                </Popup>
            </Marker>
          ))}
          
          {activeFilters.hidden_gems && communityPois.officials.map(p => {
             if (!p.latitude || !p.longitude) return null;
             return (
                <Marker key={p.id} position={[parseFloat(p.latitude), parseFloat(p.longitude)]} icon={officialStarIcon}>
                    <Popup>
                        <div style={{ textAlign: 'center', minWidth: '160px' }}>
                            <strong style={{ color: '#B8860B', display: 'block' }}>{p.name}</strong>
                            <button onClick={() => openNavModal(p)} style={{...goButtonStyle, marginTop: '10px'}}>Åk hit 🚐</button>
                        </div>
                    </Popup>
                </Marker>
             );
          })}

          {tempMarker && <Marker position={tempMarker} icon={redIcon}><Popup autoOpen><button onClick={()=>triggerAddFlow(modalDraft)} style={goButtonStyle}>➕ Föreslå</button></Popup></Marker>}
        </MapContainer>
        <div style={legendButtonStyle} onClick={openFindModal}><Search size={16} style={{marginRight:'8px', flexShrink: 0}}/><span>Hitta platser & POIs</span></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', marginTop: '-10px' }}>
          <button 
            onClick={() => { if(userLocation) { setMapCenter([...userLocation]); setMapZoom(10); setFlyTrigger(prev => prev + 1); } }} 
            style={centerMapBtnStyle}
          >
            <Navigation size={14} /> Centrera karta
          </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999', flexShrink: 0 }} />
          <input 
            type="text" 
            placeholder="Sök gata, stad eller POI..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            style={searchInputStyle} 
          />
          
          {searchResults.length > 0 && (
            <div style={searchResultsDropdownStyle}>
              {searchResults.map((result) => (
                <div 
                  key={result.place_id} 
                  onClick={() => handleSelectSearchResult(result)}
                  style={searchResultItemStyle}
                >
                  <MapPin size={16} color="#2F5D3A" style={{ flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#243137' }}>
                      {result.name || result.display_name.split(',')[0]}
                    </span>
                    <span style={{ fontSize: '11px', color: '#667276', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                      {result.display_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => triggerAddFlow({ name: searchQuery, lat: null, lng: null })} style={addBtnStyle}>
          <Plus color="white" />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={countInfoStyle}>{proposals.length} av 5 förslag använda</div>
        {proposals.map(p => (
          <div key={p.id} style={proposalCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 
                  style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#2F5D3A', textDecoration: 'underline', cursor: 'pointer' }} 
                  onClick={() => handleShowProposalOnMap(p)}
                >
                  {p.name}
                </h3>
                <span style={{ fontSize: '12px', color: '#98A4A5' }}>Tips från {p.created_by_name}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => handleVote(p.id, true)} style={{ ...voteBtnStyle, backgroundColor: '#E8F5E9', color: '#2e7d32' }}>
                  <ThumbsUp size={16} style={{ marginRight: '4px' }} /> {p.votes_up || 0}
                </button>
                <button onClick={() => handleVote(p.id, false)} style={{ ...voteBtnStyle, backgroundColor: '#FFEBEE', color: '#c62828' }}>
                  <ThumbsDown size={16} style={{ marginRight: '4px' }} /> {p.votes_down || 0}
                </button>
                <button onClick={()=>{if(window.confirm("Ta bort förslag?")){supabase.from('proposals').delete().eq('id',p.id).then(()=>fetchProposals());}}} style={deleteBtnStyle}>
                  <Trash2 size={18}/>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {findModalRendered && (
        <div style={{ ...modalOverlayStyle, opacity: findModalVisible ? 1 : 0, transition: 'opacity 0.4s ease' }} onClick={closeFindModal}>
          <div style={{ ...modalSheetStyle, transform: findModalVisible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)' }} onClick={e => e.stopPropagation()}>
            <div style={modalHandleStyle} />
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
              <div><h3 style={modalTitleStyle}>Filtrera på kartan</h3><p style={{margin:0, fontSize:'13px', color:'#667276'}}>Välj vad du vill se.</p></div>
              <button onClick={closeFindModal} style={{background:'none', border:'none'}}><X size={24} color="#98A4A5"/></button>
            </div>
            <div style={findGridStyle}>
              {FILTER_CONFIG.map(({ key, icon: Icon, label }) => {
                const isActive = activeFilters[key];
                const color = key === 'hidden_gems' ? '#B8860B' : (SERVICE_META[key]?.color || '#999');
                return (
                  <button key={key} onClick={() => toggleFilter(key)} style={{ ...findOptionBtnStyle, opacity: isActive ? 1 : 0.4 }}>
                    <div style={{ ...findIconWrapper, backgroundColor: isActive ? (SERVICE_META[key]?.lightBg || '#FFFDE7') : '#f5f5f5', border: isActive ? `2px solid ${color}` : '2px solid transparent' }}><Icon size={24} color={isActive ? color : '#999'} /></div>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: isActive ? '#334247' : '#999' }}>{label}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
               <button onClick={clearAllFilters} style={secondaryModalBtnStyle}>Rensa</button>
               <button onClick={selectAllFilters} style={secondaryModalBtnStyle}>Alla</button>
               <button onClick={closeFindModal} style={primaryModalBtnStyle}>Visa {currentHitsCount} resultat</button>
            </div>
          </div>
        </div>
      )}

      {navModalRendered && (
        <div style={{ ...modalOverlayStyle, opacity: navModalVisible ? 1 : 0, transition: 'opacity 0.4s ease' }} onClick={closeNavModal}>
          <div style={{ ...modalSheetStyle, transform: navModalVisible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div style={modalHandleStyle} />
            <h3 style={{ ...modalTitleStyle, textAlign: 'center' }}>Vill du åka till {selectedNavPoi?.name}?</h3>
            <p style={{ textAlign: 'center', color: '#667276', marginBottom: '25px', fontSize: '14px' }}>Välj din favoritapp för navigering.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => handleNavigate('google')} style={navOptionBtnStyle}><Navigation size={20} color="#4285F4" style={{marginRight:'12px'}}/> Google Maps</button>
              <button onClick={() => handleNavigate('waze')} style={navOptionBtnStyle}><Navigation size={20} color="#33CCFF" style={{marginRight:'12px'}}/> Waze</button>
            </div>
            <button onClick={closeNavModal} style={cancelBtnStyle}>Avbryt</button>
          </div>
        </div>
      )}

      {showCreateModal && <div style={modalOverlayStyle} onClick={()=>setShowCreateModal(false)}><div style={modalStyle} onClick={e=>e.stopPropagation()}><h3>Föreslå plats</h3><input value={modalDraft.name} onChange={e=>setModalDraft({...modalDraft,name:e.target.value})} style={searchInputStyle}/><button onClick={handleCreateNew} style={saveBtnStyle}>Publicera</button></div></div>}
      {showReplaceModal && <div style={modalOverlayStyle} onClick={()=>setShowReplaceModal(false)}><div style={modalSheetStyle} onClick={e=>e.stopPropagation()}><h3 style={{textAlign:'center'}}>Konvojen är full!</h3><div style={{display:'flex',flexDirection:'column',gap:'8px'}}>{proposals.map(p=><button key={p.id} onClick={()=>handleReplace(p.id)} style={navOptionBtnStyle}>{p.name}</button>)}</div><button onClick={()=>setShowReplaceModal(false)} style={cancelBtnStyle}>Avbryt</button></div></div>}
    </div>
  );
}

// --- STYLES ---
const mapWrapperStyle = { height: '350px', borderRadius: '28px', overflow: 'hidden', marginBottom: '20px', border: '5px solid #F9F7F2', position: 'relative' };
const legendButtonStyle = { position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, backgroundColor: 'white', padding: '12px 20px', borderRadius: '999px', display: 'flex', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', cursor: 'pointer', fontWeight: '800', whiteSpace: 'nowrap' };
const centerMapBtnStyle = { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#FAF9F6', color: '#2F5D3A', border: '1px solid #E5E0D8', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' };
const searchInputStyle = { width: '100%', padding: '14px 14px 14px 38px', borderRadius: '16px', border: '2px solid #ECE7DF', outline: 'none', backgroundColor: '#FAF9F6', boxSizing: 'border-box' };
const searchResultsDropdownStyle = { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#FFF', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #ECE7DF', marginTop: '8px', zIndex: 4000, maxHeight: '250px', overflowY: 'auto' };
const searchResultItemStyle = { padding: '12px 16px', borderBottom: '1px solid #F0F0F0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' };
const addBtnStyle = { backgroundColor: '#2F5D3A', border: 'none', borderRadius: '16px', width: '52px', height: '52px', flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const countInfoStyle = { fontSize: '11px', fontWeight: '800', color: '#98A4A5', textAlign: 'right', textTransform: 'uppercase', marginBottom: '5px' };
const proposalCardStyle = { backgroundColor: '#FAF9F6', padding: '20px', borderRadius: '24px', border: '1px solid #EEE7DB' };
const voteBtnStyle = { display: 'flex', alignItems: 'center', border: 'none', padding: '6px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' };
const goButtonStyle = { width: '100%', padding: '12px', backgroundColor: '#2F5D3A', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(47,93,58,0.2)' };
const deleteBtnStyle = { background: 'none', border: 'none', color: '#98A4A5', cursor: 'pointer', marginLeft: '8px' };
const modalOverlayStyle = { position: 'fixed', inset: 0, zIndex: 3000, backgroundColor: 'rgba(24, 29, 26, 0.42)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' };
const modalSheetStyle = { width: '100%', maxWidth: '520px', backgroundColor: '#FAF9F6', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '24px', boxSizing: 'border-box' };
const modalStyle = { backgroundColor: 'white', padding: '24px', borderRadius: '28px', width: '90%', maxWidth: '400px' };
const modalHandleStyle = { width: '40px', height: '4px', backgroundColor: '#ddd', borderRadius: '2px', margin: '0 auto 16px auto' };
const modalTitleStyle = { margin: '0', fontSize: '20px', fontWeight: '800' };
const findGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '24px' };
const findOptionBtnStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer' };
const findIconWrapper = { width: '56px', height: '56px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const primaryModalBtnStyle = { flex: 2, padding: '16px', backgroundColor: '#2F5D3A', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 'bold' };
const secondaryModalBtnStyle = { flex: 1, border: '1px solid #DDD6CA', backgroundColor: '#ECE9E1', borderRadius: '16px', padding: '14px 10px', fontSize: '13px', fontWeight: 'bold', color: '#667276' };
const saveBtnStyle = { width: '100%', padding: '16px', backgroundColor: '#2F5D3A', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 'bold' };
const navOptionBtnStyle = { width: '100%', padding: '16px', backgroundColor: 'white', border: '1px solid #EEE7DB', borderRadius: '16px', textAlign: 'left', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', fontSize: '15px', color: '#243137', cursor: 'pointer' };
const cancelBtnStyle = { width: '100%', padding: '12px', border: 'none', background: 'none', color: '#999', fontWeight: 'bold', cursor: 'pointer' };

export default ConvoyView;
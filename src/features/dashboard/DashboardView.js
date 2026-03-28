import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Trophy, Clock, Camera, Navigation, Map as MapIcon, Sun, Sunrise, Sunset, Cloud, Star,
  X, Save, Loader2, Plus, MapPin, Check, Droplet, Zap, CloudRain, CloudSun,
  Share2, Clipboard, MessageSquare, Mail, Users
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

function MapEvents({ onMapClick, onBoundsChange }) {
  const map = useMapEvents({
    click(e) { onMapClick(e.latlng); },
    moveend() { onBoundsChange(map.getBounds()); },
    zoomend() { onBoundsChange(map.getBounds()); }
  });

  useEffect(() => {
    // Sätt initiala bounds när kartan laddas
    onBoundsChange(map.getBounds());
  }, [map, onBoundsChange]);

  return null;
}

function ChangeView({ center, zoom, trigger }) {
  const map = useMap();
  useEffect(() => { 
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || 10, { duration: 1.0 }); 
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
  freshwater: createPoiIcon('blue'),
  graywater: createPoiIcon('grey'),
  blackwater: createPoiIcon('black'),
  electricity: createPoiIcon('gold'),
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

const SERVICE_META_ALL = {
  parking: { label: 'Ställplats', color: '#4D8A57' },
  camp_site: { label: 'Camping', color: '#8D6E63' },
  rest_area: { label: 'Rastplats', color: '#7CB342' },
  freshwater: { label: 'Färskvatten', color: '#4D93C7' },
  graywater: { label: 'Gråvatten', color: '#7E8A8A' },
  blackwater: { label: 'Svartvatten', color: '#36424A' },
  electricity: { label: 'El', color: '#D4A017' },
  propane: { label: 'Gasol', color: '#E64A19' },
  marina: { label: 'Gästhamn', color: '#1976D2' },
  swimming: { label: 'Badplats', color: '#00BCD4' },
  viewpoint: { label: 'Utsikt', color: '#9C27B0' },
};

const QUICK_FILTERS = {
  parking: { label: 'Parkering / Ställplats', color: '#4D8A57' },
  graywater: { label: 'Gråvatten', color: '#7E8A8A' },
  blackwater: { label: 'Svartvatten', color: '#36424A' },
  freshwater: { label: 'Färskvatten', color: '#4D93C7' },
  electricity: { label: 'El finns', color: '#D4A017' },
};

function normalizePoiCategory(rawCategory) {
  const cat = String(rawCategory || 'default').trim().toLowerCase();
  if (['parking', 'parkering', 'ställplats', 'stallplats', 'overnight'].includes(cat)) return 'parking';
  if (['camp_site', 'camping'].includes(cat)) return 'camp_site';
  if (['rest_area', 'rastplats'].includes(cat)) return 'rest_area';
  return cat;
}

function buildMultiServiceIcon(serviceKeys) {
  const dots = serviceKeys.filter(key => QUICK_FILTERS[key]).map(key => `<span style="width: 9px; height: 9px; border-radius: 50%; background: ${QUICK_FILTERS[key]?.color || '#D3B98A'}; border: 1px solid rgba(255,255,255,0.9); display: inline-block;"></span>`).join('');
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
    graywater: poi?.has_graywater === true || normalizedCategory === 'graywater' || check(['gråvatten']),
    blackwater: poi?.has_blackwater === true || normalizedCategory === 'blackwater' || check(['svartvatten', 'latrin', 'kassett']),
    freshwater: poi?.has_freshwater === true || normalizedCategory === 'freshwater' || check(['färskvatten', 'dricksvatten']),
    electricity: poi?.has_electricity === true || normalizedCategory === 'electricity' || check([' el ', 'ström']),
  };
}

const ALL_FILTERS_OFF = { parking: false, graywater: false, blackwater: false, freshwater: false, electricity: false, hidden_gems: false };
const ALL_SERVICES_FALSE = Object.keys(SERVICE_META_ALL).reduce((acc, key) => ({ ...acc, [key]: false }), {});

// --- KOMPONENT START ---
function DashboardView({ setActiveTab, onOpenLogbookPhotoFlow, currentUser }) {
  
  // --- NY KONVOJ-LOGIK (STARTA RESA) ---
  const [showConvoyMenu, setShowConvoyMenu] = useState(false);
  const [isLoadingConvoy, setIsLoadingConvoy] = useState(false);
  const [activeConvoy, setActiveConvoy] = useState(null); // Sparar nuvarande rum

  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleStartTrip = async (withInvite) => {
    if (!currentUser) return alert("Du måste vara inloggad för att starta en resa.");
    setIsLoadingConvoy(true);
    
    try {
      const joinCode = generateJoinCode();
      
      // 1. Skapa "Rummet" i databasen
      const { data: convoyData, error: convoyError } = await supabase
        .from('convoys')
        .insert([{ 
          join_code: joinCode, 
          created_by: currentUser.id, 
          name: `${currentUser.name}s Resa` 
        }])
        .select()
        .single();

      if (convoyError) throw convoyError;

      // 2. Placera dig själv i rummet
      const { error: buddyError } = await supabase
        .from('buddies')
        .update({ current_convoy_id: convoyData.id })
        .eq('id', currentUser.id);

      if (buddyError) throw buddyError;

      // Sätt det aktiva rummet lokalt så knappen ändrar sig direkt
      setActiveConvoy({ id: convoyData.id, join_code: convoyData.join_code });

      // 3. Hantera inbjudan (Magic Link)
      if (withInvite) {
        const shareUrl = `https://camper-buddy.vercel.app/?join=${joinCode}`;
        if (navigator.share) {
          await navigator.share({
            title: 'Häng med i min CamperBuddy konvoj!',
            text: 'Klicka på länken för att joina min resa på kartan:',
            url: shareUrl
          });
        } else {
          navigator.clipboard.writeText(shareUrl);
          alert('Din inbjudningslänk är kopierad! Skicka den till dina vänner.');
        }
      }

      setShowConvoyMenu(false);
      if (typeof setActiveTab === 'function') setActiveTab('convoy');

    } catch (err) {
      console.error("Fel vid skapande av konvoj:", err);
      alert("Kunde inte starta resan. Försök igen.");
    } finally {
      setIsLoadingConvoy(false);
    }
  };

  // FUNKTION: Går till vinnaren i Konvoj
  const handleGoToTopProposal = (proposal) => {
    if (proposal && proposal.latitude && proposal.longitude) {
      sessionStorage.setItem('openConvoyFocus', JSON.stringify({
        coords: [parseFloat(proposal.latitude), parseFloat(proposal.longitude)],
        name: proposal.name,
        createdBy: proposal.created_by_name || 'En Buddy',
        zoom: 15
      }));
    }
    setActiveTab('convoy');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const [navModalVisible, setNavModalVisible] = useState(false);
  const [navModalRendered, setNavModalRendered] = useState(false);
  const [selectedNavPoi, setSelectedNavPoi] = useState(null);

  const [topProposal, setTopProposal] = useState(null);
  const [latestEntry, setLatestEntry] = useState(null);
  const [pois, setPois] = useState([]);
  const [mapBounds, setMapBounds] = useState(null);
  const [communityPois, setCommunityPois] = useState({ drafts: [], officials: [] });
  const [loading, setLoading] = useState(true);
  const [flyTrigger, setFlyTrigger] = useState(0);
  
  const [filterModalRendered, setFilterModalRendered] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const [tempMarker, setTempMarker] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [newPoi, setNewPoi] = useState({ name: '', services: { ...ALL_SERVICES_FALSE }, lat: null, lng: null });
  const [isSaving, setIsSaving] = useState(false);

  const [activeFilters, setActiveFilters] = useState({ ...ALL_FILTERS_OFF });

  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([59.61, 16.54]); 
  const [mapZoom, setMapZoom] = useState(10); 
  
  const [locationInfo, setLocationInfo] = useState({ name: 'SÖKER...', coords: '' });
  const [weather, setWeather] = useState({ temp: '--', sunrise: '--:--', sunset: '--:--', icon: <Sun size={18} color="#D8A826" /> });

  const [showShareModal, setShowShareModal] = useState(false);
  
  // Uppdaterad inbjudningslänk (med join-kod om vi har ett aktivt rum)
  const inviteLink = activeConvoy 
    ? `https://camper-buddy.vercel.app/?join=${activeConvoy.join_code}` 
    : "https://camper-buddy.vercel.app/";

  const shareViaOs = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Gå med i min konvoj på CamperBUDDY',
          text: 'Hej! Gå med i min konvoj på CamperBUDDY så kan vi dela våra resor och planer. 🚐💨',
          url: inviteLink,
        });
      } catch (error) {
        console.error('Fel vid delning:', error);
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      alert("Inbjudningslänken har kopierats till urklipp!");
    });
  };

  const shareViaSmsUrl = `sms:?&body=Hej! Gå med i min konvoj på CamperBUDDY: ${inviteLink}`;
  const shareViaEmailUrl = `mailto:?subject=Gå med i min konvoj på CamperBUDDY&body=Hej! Gå med i min konvojgrupp på CamperBUDDY-appen: ${inviteLink}`;

  const fetchLocationAndWeather = async (lat, lng) => {
    try {
      const coords = [lat, lng];
      setUserLocation(coords);
      setMapCenter(coords);
      setMapZoom(10); 

      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&daily=sunrise,sunset&timezone=auto`);
      const weatherData = await weatherRes.json();
      
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`);
      const geoData = await geoRes.json();
      const addr = geoData.address || {};
      const cityName = addr.city || addr.town || addr.village || addr.municipality || "EXPEDITION";

      const timeConfig = { hour: '2-digit', minute: '2-digit' };
      const weatherCode = weatherData?.current?.weather_code ?? 2;
      
      let WeatherIcon = <Sun size={18} color="#D8A826" />; 
      if (weatherCode >= 2 && weatherCode <= 3) {
        WeatherIcon = <CloudSun size={18} color="#8D9998" />; 
      } else if (weatherCode > 3 && weatherCode < 60) {
        WeatherIcon = <Cloud size={18} color="#8D9998" />; 
      } else if (weatherCode >= 60) {
        WeatherIcon = <CloudRain size={18} color="#4D93C7" />; 
      }

      setWeather({
        temp: Math.round(weatherData?.current?.temperature_2m ?? 0),
        sunrise: weatherData?.daily?.sunrise?.[0] ? new Date(weatherData.daily.sunrise[0]).toLocaleTimeString('sv-SE', timeConfig) : '--:--',
        sunset: weatherData?.daily?.sunset?.[0] ? new Date(weatherData.daily.sunset[0]).toLocaleTimeString('sv-SE', timeConfig) : '--:--',
        icon: WeatherIcon,
      });

      setLocationInfo({
        name: cityName.toUpperCase(),
        coords: `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`
      });

    } catch (error) {
      console.error('Kunde inte hämta plats/väder:', error);
      setUserLocation([59.61, 16.54]);
      setMapCenter([59.61, 16.54]);
      setMapZoom(10);
      setLocationInfo({ name: "VÄSTERÅS", coords: "59.6100° N, 16.5400° E" });
      setWeather(prev => ({ ...prev, icon: <CloudSun size={18} color="#8D9998" /> }));
    }
  };

  // --- SÄKER UPPFÖLJNING AV DATA ---
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Kolla om vi är i ett rum
      let roomId = null;
      if (currentUser?.id) {
        const { data: buddyData } = await supabase
          .from('buddies')
          .select('current_convoy_id')
          .eq('id', currentUser.id)
          .single();

        if (buddyData?.current_convoy_id) {
          roomId = buddyData.current_convoy_id;
          const { data: convoyData } = await supabase
            .from('convoys')
            .select('id, join_code')
            .eq('id', buddyData.current_convoy_id)
            .single();

          if (convoyData) {
            setActiveConvoy(convoyData);
          }
        }
      }

      // 2. Hämta FÖRSLAG (Säkerhetslåst till DITT rum)
      if (roomId) {
        const { data: propsData } = await supabase
          .from('proposals')
          .select('*')
          .eq('convoy_id', roomId);

        if (propsData && propsData.length > 0) {
          setTopProposal([...propsData].sort((a, b) => (b.votes_up || 0) - (a.votes_up || 0))[0]);
        } else {
          setTopProposal(null);
        }
      } else {
        setTopProposal(null);
      }

      // 3. Hämta LOGGBOK (Säkerhetslåst till DIN profil)
      if (currentUser?.id) {
        const { data: logData } = await supabase
          .from('logbook')
          .select('*')
          .eq('buddy_id', currentUser.id) // Låset!
          .order('created_at', { ascending: false })
          .limit(1);

        if (logData && logData.length > 0) {
          setLatestEntry(logData[0]);
        } else {
          setLatestEntry(null);
        }
      }

      // 4. Hämta POIs (Dessa är globala och ska synas för alla)
      const { data: poiData } = await supabase.from('pois').select('*').limit(10000);
      setPois(Array.isArray(poiData) ? poiData : []);

      const { data: officialData } = await supabase.from('v_official_pois').select('*');
      setCommunityPois({ officials: officialData || [] });

    } catch (error) {
      console.error('Fel i dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchLocationAndWeather(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.warn("Plats nekad, använder standard:", error);
          fetchLocationAndWeather(59.61, 16.54); 
        },
        { timeout: 10000 }
      );
    } else {
      fetchLocationAndWeather(59.61, 16.54); 
    }
  }, []);

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
    const activeKeys = Object.keys(QUICK_FILTERS).filter(k => activeFilters[k]);
    if (activeKeys.length === 0) return [];
    return validPois.filter((poi) => activeKeys.some((key) => poi.serviceFlags[key]));
  }, [validPois, activeFilters]);

  const visiblePois = useMemo(() => {
    if (!mapBounds || filteredPois.length === 0) return [];
    // Lägg till 20% marginal så att kartan inte laddar för tätt inpå kanterna när man drar
    const paddedBounds = mapBounds.pad(0.2); 
    return filteredPois.filter(poi => paddedBounds.contains([poi.lat, poi.lng]));
  }, [filteredPois, mapBounds]);

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

  const openFilterModal = () => {
    setFilterModalRendered(true);
    setTimeout(() => setFilterModalVisible(true), 50);
  };

  const closeFilterModal = () => {
    setFilterModalVisible(false);
    setTimeout(() => setFilterModalRendered(false), 400);
  };

  const toggleFilter = (key) => setActiveFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  const selectAllFilters = () => setActiveFilters({ parking: true, graywater: true, blackwater: true, freshwater: true, electricity: true, hidden_gems: true });
  const clearAllFilters = () => setActiveFilters({ ...ALL_FILTERS_OFF });

  const getMarkerIconForPoi = (poi) => {
    const activeKeys = Object.keys(QUICK_FILTERS).filter(k => activeFilters[k] && poi.serviceFlags[k]);
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
      setNewPoi({ name: placeName, services: { ...ALL_SERVICES_FALSE }, lat: latlng.lat, lng: latlng.lng });
    } catch (e) {
      setNewPoi({ name: 'Markerad plats', services: { ...ALL_SERVICES_FALSE }, lat: latlng.lat, lng: latlng.lng });
    }
  };

  const toggleServiceInModal = (key) => setNewPoi(prev => ({ ...prev, services: { ...prev.services, [key]: !prev.services[key] } }));

  const handleSavePoi = async () => {
    if (!newPoi.name.trim()) return;
    setIsSaving(true);
    const firstSelected = Object.keys(newPoi.services).find(k => newPoi.services[k]) || 'default';
    
    const payload = {
      name: newPoi.name.trim(), category: firstSelected, latitude: newPoi.lat, longitude: newPoi.lng, created_by: currentUser?.id
    };
    Object.keys(newPoi.services).forEach(key => {
      payload[`has_${key}`] = newPoi.services[key];
    });

    const { error } = await supabase.from('pois').insert([payload]);

    if (!error) {
      setShowCreateModal(false);
      setTempMarker(null);
      fetchDashboardData();
    } else {
      alert("Fel vid sparande: " + error.message);
    }
    setIsSaving(false);
  };

  if (loading) return <div style={loadingStateStyle}>Startar systemet...</div>;

  return (
    <>
      <div style={{ padding: '10px 20px 100px 20px' }} className="animate-fade-in">
        
        {/* --- NY LAYOUT: VÄDER OCH INBJUDAN --- */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'stretch' }}>
          
          <div style={{ ...weatherCardStyle, flex: 3, margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '14px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <MapPin size={16} color="#2F5D3A" />
              <span style={{ fontSize: '14px', fontWeight: '900', color: '#243137', letterSpacing: '0.5px' }}>{locationInfo.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={weatherItemStyle}>{weather.icon} <b style={{ fontSize: '14px' }}>{weather.temp}°C</b></div>
              <div style={{ width: '1px', height: '14px', backgroundColor: '#E6E2D9' }}></div>
              <div style={weatherItemStyle}><Sunrise size={12} color="#CF651F" /> <span style={{fontSize: '12px'}}>{weather.sunrise}</span></div>
              <div style={weatherItemStyle}><Sunset size={12} color="#2F5D3A" /> <span style={{fontSize: '12px'}}>{weather.sunset}</span></div>
            </div>
          </div>

          {/* DYNAMISK KNAPP: Byter färg och text om man redan är i en Konvoj */}
          <div 
            onClick={() => activeConvoy ? setShowShareModal(true) : setShowConvoyMenu(true)}
            style={{ 
              backgroundColor: activeConvoy ? '#EEF3EA' : '#F7F4EE', 
              borderRadius: '20px', border: activeConvoy ? '1px solid #DCE5DA' : '1px solid #EEE7DB',
              padding: '12px 8px', flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0,0,0,0.02)', textAlign: 'center', transition: 'all 0.3s ease'
            }}
          >
            <div style={{ width: '38px', height: '38px', backgroundColor: activeConvoy ? '#DCE5DA' : '#EEF3EA', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {activeConvoy ? <Users size={18} color="#2F5D3A" /> : <Share2 size={18} color="#2F5D3A" />}
            </div>
            <div>
              <h3 style={{ margin: '0', fontSize: '12px', color: '#172026', fontWeight: '800', lineHeight: '1.2' }}>
                {activeConvoy ? <>Bjud in<br/>Buddies</> : <>Starta<br/>Resa</>}
              </h3>
            </div>
          </div>
          
        </div>

        <div style={mapContainerStyle}>
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%', borderRadius: '22px' }} zoomControl={false}>
            <ChangeView center={mapCenter} zoom={mapZoom} trigger={flyTrigger} />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
            <MapEvents onMapClick={handleMapClick} onBoundsChange={setMapBounds} />
            
            {userLocation && (
              <Marker position={userLocation} icon={blueDotIcon} zIndexOffset={1000}>
                <Popup><strong style={{ color: '#4285F4' }}>Du är här</strong></Popup>
              </Marker>
            )}

            {visiblePois.map((poi) => (
              <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={getMarkerIconForPoi(poi)}>
                <Popup>
                  <div style={{ minWidth: '180px' }}>
                    <strong style={{ color: '#2F5D3A', fontSize: '15px' }}>{poi.name || 'Plats'}</strong>
                    <hr style={{ margin: '8px 0', border: '0', borderTop: '1px solid #E6E2D9' }} />
                    <p style={{ fontSize: '11px', color: '#667276', marginBottom: '10px' }}>{poi.description || poi.address}</p>
                    <button onClick={() => openNavModal(poi)} style={goButtonStyle}>Åk hit 🚐</button>
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
              
              // 🚨 NYTT: Kontrollera om pärlan är inom den synliga kartan
              if (mapBounds && !mapBounds.pad(0.2).contains([poi.latitude, poi.longitude])) {
                return null; 
              }

              return (
                <Marker key={poi.id} position={[poi.latitude, poi.longitude]} icon={officialStarIcon}>
                  <Popup>
                    <div style={{ minWidth: '160px', textAlign: 'center' }}>
                      <Star size={24} fill="#FFD700" color="#B8860B" style={{ margin: '0 auto 5px auto' }} />
                      <strong style={{ color: '#B8860B', display: 'block' }}>{poi.name}</strong>
                      <button onClick={() => openNavModal(poi)} style={{...goButtonStyle, marginTop: '10px'}}>Åk hit 🚐</button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          <div style={legendButtonStyle} onClick={openFilterModal}>
            <span style={{ fontSize: '10px', fontWeight: '800', color: '#95A5A5', marginRight: '2px' }}>POI</span>
            <div style={{ width: '1px', height: '12px', backgroundColor: '#E5DED2' }}></div>
            {Object.keys(QUICK_FILTERS).map(k => (
              <span key={k} style={{ ...dot, backgroundColor: activeFilters[k] ? QUICK_FILTERS[k].color : '#D5D8D1' }}></span>
            ))}
            <div style={{ width: '1px', height: '12px', backgroundColor: '#E5DED2' }}></div>
            <Star size={13} fill={activeFilters.hidden_gems ? "#FFD700" : "none"} color={activeFilters.hidden_gems ? "#B8860B" : "#A9B4B5"} />
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', marginTop: '-10px' }}>
           <button 
              onClick={() => { if(userLocation) { setMapCenter([...userLocation]); setMapZoom(10); setFlyTrigger(prev => prev + 1); } }} 
              style={centerMapBtnStyle}
           >
             <Navigation size={14} /> Centrera karta
           </button>
        </div>
          
        <div style={summaryGridStyle}>
          <div style={smallSectionStyle} onClick={() => handleGoToTopProposal(topProposal)}>
            <div style={sectionHeaderStyle}><Trophy size={14} color="#D8A826" /> DINA BUDDIES TIPSAR OM NÄSTA STOPP</div>
            <div style={miniCardStyle}>
              <h4 style={miniTitleStyle}>
                {topProposal ? (
                  <>
                    <strong>{topProposal.created_by_name || 'En Buddy'}</strong> föreslår <strong>
                      {topProposal.name.length > 40 
                        ? `${topProposal.name.substring(0, 40)}...` 
                        : topProposal.name}
                    </strong>
                  </>
                ) : (
                  'Inga förslag ännu'
                )}
              </h4>
            </div>
          </div>
          <div style={smallSectionStyle} onClick={() => setActiveTab('logbook')}>
            <div style={sectionHeaderStyle}><Clock size={14} color="#4D93C7" /> MIN SENSTE LOGG</div>
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
          <button style={actionBtnStyle} onClick={() => {
            sessionStorage.setItem('openConvoySearch', 'true');
            setActiveTab('convoy');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}>
            <Navigation size={20} color="#CF651F" />
            <span style={btnLabelStyle}>Hitta platser</span>
          </button>
        </div>
      </div>

      {/* --- MODAL: STARTA RESA --- */}
      {showConvoyMenu && (
        <div 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(24, 29, 26, 0.56)', zIndex: 5000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} 
          onClick={() => setShowConvoyMenu(false)}
        >
          <div 
            style={{ backgroundColor: '#FAF9F6', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '24px 24px 40px 24px', animation: 'slideUp 0.3s ease-out' }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: '48px', height: '5px', borderRadius: '999px', backgroundColor: '#D9DDD6', margin: '0 auto 20px auto' }} />
            
            <h3 style={{ margin: '0 0 8px 0', fontSize: '22px', color: '#172026', fontWeight: '900', textAlign: 'center' }}>
              Dags att rulla? 🚐
            </h3>
            <p style={{ margin: '0 0 24px 0', color: '#667276', fontSize: '14px', textAlign: 'center', lineHeight: '1.4' }}>
              Starta en session för att aktivera den gemensamma kartan. Du kan alltid bjuda in fler senare.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Alternativ 1: Soloresa */}
              <button 
                onClick={() => handleStartTrip(false)}
                disabled={isLoadingConvoy}
                style={{ width: '100%', padding: '18px', backgroundColor: '#FFF', border: '1px solid #EEE7DB', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '18px' }}>👤</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#243137', marginBottom: '2px' }}>Starta soloresa</div>
                  <div style={{ fontSize: '12px', color: '#95A5A6' }}>Bara jag på kartan just nu</div>
                </div>
              </button>

              {/* Alternativ 2: Bjud in vänner */}
              <button 
                onClick={() => handleStartTrip(true)}
                disabled={isLoadingConvoy}
                style={{ width: '100%', padding: '18px', backgroundColor: '#2F5D3A', border: 'none', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', textAlign: 'left', boxShadow: '0 8px 16px rgba(47, 93, 58, 0.2)' }}
              >
                {isLoadingConvoy ? (
                  <div style={{ width: '100%', textAlign: 'center', color: '#FFF' }}>Startar... <Loader2 size={16} className="animate-spin" style={{marginLeft: '8px', display: 'inline-block'}}/></div>
                ) : (
                  <>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Share2 size={20} color="#FFF" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#FFF', marginBottom: '2px' }}>Konvoj med Buddies</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>Starta rum och skicka länk</div>
                    </div>
                  </>
                )}
              </button>
            </div>

            <button 
              onClick={() => setShowConvoyMenu(false)} 
              style={{ width: '100%', padding: '16px', background: 'none', border: 'none', color: '#95A5A6', fontWeight: '700', fontSize: '15px', marginTop: '12px', cursor: 'pointer' }}
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {/* --- SHARE MODAL --- */}
      {showShareModal && (
        <div style={{ ...modalOverlayStyle, opacity: 1, zIndex: 6000 }} onClick={() => setShowShareModal(false)}>
          <div style={{ ...modalSheetStyle, padding: '24px' }} className="animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div style={modalHandleStyle}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#172026', fontWeight: '800' }}>Bjud in vänner</h2>
              <button onClick={() => setShowShareModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#667276" /></button>
            </div>
            <p style={{ fontSize: '14px', color: '#667276', marginBottom: '24px', lineHeight: '1.4' }}>Dela inbjudningslänken så kan dina Buddies ansluta.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {navigator.share && (
                <button type="button" onClick={shareViaOs} style={shareMainBtnStyle}><Share2 size={20} /> Dela via telefonen</button>
              )}
              <button type="button" onClick={copyToClipboard} style={shareSecondaryBtnStyle}><Clipboard size={18} /> Kopiera inbjudningslänk</button>
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <a href={shareViaSmsUrl} style={{ ...shareSecondaryBtnStyle, flex: 1, textDecoration: 'none' }}><MessageSquare size={18} /> SMS</a>
                <a href={shareViaEmailUrl} style={{ ...shareSecondaryBtnStyle, flex: 1, textDecoration: 'none' }}><Mail size={18} /> E-post</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- FILTER MODAL --- */}
      {filterModalRendered && (
        <div style={{ ...modalOverlayStyle, opacity: filterModalVisible ? 1 : 0, transition: 'opacity 0.4s ease' }} onClick={closeFilterModal}>
          <div style={{ ...modalSheetStyle, transform: filterModalVisible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)' }} onClick={(e) => e.stopPropagation()}>
            <div style={modalHandleStyle}></div><h3 style={modalTitleStyle}>Filtrera POIs</h3>
            <div style={filterListStyle}>
              {Object.keys(QUICK_FILTERS).map(key => (
                <button key={key} type="button" onClick={() => toggleFilter(key)} style={{ ...filterOptionStyle, ...(activeFilters[key] ? filterOptionActiveStyle : {}) }}>
                  <span style={{ ...filterDotStyle, backgroundColor: QUICK_FILTERS[key].color }}></span> {QUICK_FILTERS[key].label}
                </button>
              ))}
              <button type="button" onClick={() => toggleFilter('hidden_gems')} style={{ ...filterOptionStyle, ...(activeFilters.hidden_gems ? filterOptionActiveStyle : {}) }}>
                <Star size={16} fill={activeFilters.hidden_gems ? "#FFD700" : "none"} color="#B8860B" /> Gömda Pärlor
              </button>
            </div>
            <div style={modalActionsStyle}>
              <button onClick={selectAllFilters} style={secondaryModalBtnStyle}>Alla</button>
              <button onClick={clearAllFilters} style={secondaryModalBtnStyle}>Rensa</button>
              <button onClick={closeFilterModal} style={primaryModalBtnStyle}>Klar</button>
            </div>
          </div>
        </div>
      )}

      {/* --- CREATE POI MODAL --- */}
      {showCreateModal && (
        <div style={modalOverlayStyle} onClick={() => setShowCreateModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Spara ny plats</h2><button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none' }}><X /></button>
            </div>
            <p style={{ fontSize: '14px', color: '#667276', marginBottom: '8px' }}>Namn på platsen</p>
            <input type="text" value={newPoi.name} onChange={e => setNewPoi({...newPoi, name: e.target.value})} style={inputStyle} />
            <p style={{ fontSize: '14px', color: '#667276', marginBottom: '12px', marginTop: '15px' }}>Vad finns här?</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px', maxHeight: '180px', overflowY: 'auto', paddingRight: '5px' }}>
              {Object.keys(SERVICE_META_ALL).map(key => (
                <button key={key} onClick={() => toggleServiceInModal(key)} style={{ ...serviceToggleBtn, backgroundColor: newPoi.services[key] ? SERVICE_META_ALL[key].color : '#F0F0F0', color: newPoi.services[key] ? 'white' : '#666', border: newPoi.services[key] ? 'none' : '1px solid #DDD' }}>
                  {newPoi.services[key] && <Check size={14} style={{ marginRight: '4px' }} />} {SERVICE_META_ALL[key].label}
                </button>
              ))}
            </div>
            <button onClick={handleSavePoi} disabled={isSaving} style={saveBtnStyle}>
              {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Spara på kartan</>}
            </button>
          </div>
        </div>
      )}

      {/* --- NAVIGATION MODAL --- */}
      {navModalRendered && (
        <div style={{ ...modalOverlayStyle, opacity: navModalVisible ? 1 : 0, transition: 'opacity 0.4s ease' }} onClick={closeNavModal}>
          <div style={{ ...modalSheetStyle, transform: navModalVisible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)', padding: '20px 24px 40px 24px' }} onClick={e => e.stopPropagation()}>
            <div style={modalHandleStyle} />
            <h3 style={{ ...modalTitleStyle, textAlign: 'center', marginBottom: '10px' }}>Vill du åka till {selectedNavPoi?.name}?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => handleNavigate('google')} style={navOptionBtnStyle}><Navigation size={20} color="#4285F4" style={{ marginRight: '12px' }} /> <span style={{ flex: 1 }}>Google Maps</span></button>
              <button onClick={() => handleNavigate('waze')} style={navOptionBtnStyle}><Navigation size={20} color="#33CCFF" style={{ marginRight: '12px' }} /> <span style={{ flex: 1 }}>Waze</span></button>
            </div>
            <button onClick={closeNavModal} style={cancelBtnStyle}>Avbryt</button>
          </div>
        </div>
      )}
    </>
  );
}

// --- STYLES ---
const loadingStateStyle = { textAlign: 'center', marginTop: '100px', color: '#8B9798' };
const weatherCardStyle = { background: '#F7F4EE', border: '1px solid #E8E1D6', borderRadius: '20px', padding: '12px 16px', marginBottom: '14px' };
const weatherItemStyle = { display: 'flex', alignItems: 'center', gap: '5px' };
const mapContainerStyle = { height: '350px', width: '100%', borderRadius: '28px', overflow: 'hidden', marginBottom: '25px', position: 'relative', border: '5px solid #F9F7F2' };
const legendButtonStyle = { 
  position: 'absolute', 
  top: '12px', // Flyttad från bottom: 15px
  left: '50%', 
  transform: 'translateX(-50%)', 
  zIndex: 2000, 
  backgroundColor: 'rgba(255, 255, 255, 0.92)', 
  backdropFilter: 'blur(4px)', // Ger den snygga glaskänslan
  padding: '8px 16px', 
  borderRadius: '12px', // Ändrad från 999px till 12px för rektangulär look
  display: 'flex', 
  alignItems: 'center', 
  gap: '10px', 
  boxShadow: '0 4px 15px rgba(0,0,0,0.08)', 
  border: '1px solid #EEE7DB',
  cursor: 'pointer' 
};
const dot = { width: '10px', height: '10px', borderRadius: '50%' };
const centerMapBtnStyle = { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#FAF9F6', color: '#2F5D3A', border: '1px solid #E5E0D8', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' };
const summaryGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' };
const smallSectionStyle = { cursor: 'pointer' };
const sectionHeaderStyle = { fontSize: '10px', fontWeight: 'bold', color: '#98A4A5', marginBottom: '7px', display: 'flex', alignItems: 'flex-end', minHeight: '32px', gap: '5px', textTransform: 'uppercase' };
const miniCardStyle = { backgroundColor: '#FAF9F6', padding: '12px', borderRadius: '20px', minHeight: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '1px solid #EEE7DB' };
const miniTitleStyle = { margin: 0, fontSize: '13px', color: '#243137', whiteSpace: 'normal', lineHeight: '1.4', wordBreak: 'break-word' };
const shortcutTitleStyle = { fontSize: '16px', marginBottom: '15px', color: '#243137', fontWeight: 'bold' };
const shortcutGridStyle = { display: 'flex', gap: '15px' };
const actionBtnStyle = { flex: 1, backgroundColor: '#FAF9F6', border: '1px solid #EEE7DB', padding: '14px 10px', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', minHeight: '100px' };
const btnLabelStyleLong = { fontSize: '10px', fontWeight: 'bold', color: '#667276', textAlign: 'center' };
const btnLabelStyle = { fontSize: '11px', fontWeight: 'bold', color: '#667276', textAlign: 'center' };
const goButtonStyle = { width: '100%', padding: '10px', backgroundColor: '#2F5D3A', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '14px' };
const modalOverlayStyle = { position: 'fixed', inset: 0, zIndex: 3000, backgroundColor: 'rgba(24, 29, 26, 0.42)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' };
const modalSheetStyle = { width: '100%', maxWidth: '520px', backgroundColor: '#FAF9F6', borderTopLeftRadius: '26px', borderTopRightRadius: '26px', padding: '14px 18px 22px 18px', transition: 'transform 0.4s ease' };
const modalHandleStyle = { width: '46px', height: '5px', borderRadius: '999px', backgroundColor: '#D5D8D1', margin: '0 auto 14px auto' };
const modalTitleStyle = { margin: '0 0 16px 0', fontSize: '18px', color: '#243137', fontWeight: 'bold' };
const filterListStyle = { display: 'flex', flexDirection: 'column', gap: '10px' };
const filterOptionStyle = { width: '100%', border: '1px solid #E6DED1', backgroundColor: '#F7F4EE', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 'bold' };
const filterOptionActiveStyle = { border: '2px solid #2F5D3A', backgroundColor: '#EEF3EA' };
const filterDotStyle = { width: '12px', height: '12px', borderRadius: '50%' };
const modalActionsStyle = { display: 'flex', gap: '10px', marginTop: '18px' };
const primaryModalBtnStyle = { flex: 1.3, border: 'none', backgroundColor: '#2F6927', color: '#FFF', borderRadius: '16px', padding: '14px', fontSize: '14px', fontWeight: 'bold' };
const secondaryModalBtnStyle = { flex: 1, border: '1px solid #DDD6CA', backgroundColor: '#ECE9E1', borderRadius: '16px', padding: '14px', fontSize: '14px', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #ECE7DF', backgroundColor: '#FAF9F6', outline: 'none', marginBottom: '15px' };
const serviceToggleBtn = { padding: '8px 12px', borderRadius: '16px', border: 'none', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', cursor: 'pointer' };
const saveBtnStyle = { width: '100%', padding: '16px', backgroundColor: '#2F5D3A', color: 'white', border: 'none', borderRadius: '18px', fontWeight: 'bold' };
const navOptionBtnStyle = { width: '100%', padding: '16px', backgroundColor: 'white', border: '1px solid #E6DED1', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: 'bold', color: '#334247' };
const cancelBtnStyle = { width: '100%', padding: '14px', border: 'none', background: 'none', color: '#95A5A6', fontSize: '14px', marginTop: '10px', fontWeight: 'bold' };
const modalStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '28px', width: '90%', maxWidth: '400px', alignSelf: 'center', marginBottom: '100px' };

const shareMainBtnStyle = { width: '100%', padding: '16px', backgroundColor: '#2F5D3A', color: 'white', border: 'none', borderRadius: '16px', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' };
const shareSecondaryBtnStyle = { width: '100%', padding: '14px', backgroundColor: 'white', color: '#334247', border: '1px solid #E6DED1', borderRadius: '16px', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' };

export default DashboardView;
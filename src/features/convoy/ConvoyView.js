import React, { useState, useEffect, startTransition } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Trophy, ThumbsUp, ThumbsDown, Trash2, MapPin, Plus, Search, Loader2, X, Save, Navigation } from 'lucide-react';
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

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
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

function ConvoyView({ currentUser }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [mapCenter, setMapCenter] = useState([59.61, 16.54]);
  const [tempMarker, setTempMarker] = useState(null);
  
  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNavModal, setShowNavModal] = useState(false);
  const [modalDraft, setModalDraft] = useState({ name: '', lat: null, lng: null });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => { fetchProposals(); }, []);

  const fetchProposals = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('proposals').select('*').order('votes_up', { ascending: false });
    if (!error) setProposals(data);
    setLoading(false);
  };

  // --- UPPDATERAD REVERSE GEOCODING LOGIK ---
  const handleMapClick = async (latlng) => {
    setTempMarker(latlng);
    try {
      // Vi lägger till zoom=18 för att vara så specifika som möjligt
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      
      // PRIORITERINGSORDNING:
      // 1. Specifikt namn på platsen (t.ex. "Västerås gästhamn")
      // 2. Typ av verksamhet (t.ex. "Ställplats")
      // 3. Om inget av ovan finns, ta vägen som förut.
      const placeName = 
        data.name || 
        data.address.amenity || 
        data.address.tourism || 
        data.address.leisure ||
        data.address.road || 
        "Markerad plats";

      setModalDraft({ name: placeName, lat: latlng.lat, lng: latlng.lng });
    } catch (e) {
      setModalDraft({ name: 'Markerad plats', lat: latlng.lat, lng: latlng.lng });
    }
  };

  const handleSaveProposal = async () => {
    if (!modalDraft.name.trim()) return;
    setIsSaving(true); startTransition

    const { error } = await supabase.from('proposals').insert([{ 
      name: modalDraft.name.trim(), 
      votes_up: 1, 
      user_id: currentUser?.id,
      created_by_name: currentUser?.name || 'Anonym Buddy',
      latitude: modalDraft.lat,
      longitude: modalDraft.lng
    }]);

    if (!error) {
      setShowCreateModal(false);
      setTempMarker(null);
      setSearchQuery('');
      setModalDraft({ name: '', lat: null, lng: null });
      fetchProposals();
    } else {
      alert("Kunde inte publicera: " + error.message);
    }
    setIsSaving(false);
  };

  const openInApp = (type) => {
    const lat = modalDraft.lat || mapCenter[0];
    const lng = modalDraft.lng || mapCenter[1];
    const urls = {
      waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
      google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      apple: `http://maps.apple.com/?daddr=${lat},${lng}`
    };
    window.open(urls[type], '_blank');
    setShowNavModal(false);
  };

  const handleSearchChange = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length < 3) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json();
      setSearchResults(data);
    } finally { setIsSearching(false); }
  };

  const selectLocation = (result) => {
    const coords = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
    const shortName = result.display_name.split(',')[0];
    setMapCenter([coords.lat, coords.lng]);
    setTempMarker(coords);
    setModalDraft({ name: shortName, lat: coords.lat, lng: coords.lng });
    setSearchQuery(shortName);
    setSearchResults([]);
  };

  return (
    <div style={{ padding: '10px 20px 100px 20px' }}>
      
      {/* KARTA */}
      <div style={mapWrapperStyle}>
        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <ChangeView center={mapCenter} />
          <MapEvents onMapClick={handleMapClick} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {tempMarker && (
            <Marker position={tempMarker} icon={redIcon}>
              <Popup autoOpen>
                <div style={{ textAlign: 'center', minWidth: '160px', padding: '5px' }}>
                  <strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>{modalDraft.name}</strong>
                  <button onClick={() => setShowCreateModal(true)} style={popupActionBtn}>➕ Skapa reseförslag</button>
                  <button onClick={() => setShowNavModal(true)} style={{...popupActionBtn, backgroundColor: '#3498DB', marginTop: '8px'}}>🚐 Åk hit</button>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#243137', marginBottom: '15px' }}>Vart ska vi härnäst?</h2>

      {/* SÖK & MANUELL PLUS */}
      <div style={{ position: 'relative', marginBottom: '25px', display: 'flex', gap: '10px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} color="#98A4A5" style={{ position: 'absolute', left: '12px', top: '15px' }} />
          <input type="text" placeholder="Sök eller skriv förslag..." value={searchQuery} onChange={handleSearchChange} style={searchInputStyle} />
          {isSearching && <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: '12px', top: '16px' }} />}
        </div>
        <button onClick={() => { setModalDraft({...modalDraft, name: searchQuery}); setShowCreateModal(true); }} style={addBtnStyle}>
          <Plus color="white" />
        </button>

        {searchResults.length > 0 && (
          <div style={resultsDropdownStyle}>
            {searchResults.map((res) => (
              <div key={res.place_id} onClick={() => selectLocation(res)} style={resultItemStyle}>
                <MapPin size={14} style={{ marginRight: '8px' }} /> {res.display_name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LISTA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {proposals.map((p) => (
          <div key={p.id} style={proposalCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>{p.name}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#98A4A5' }}>Tips från {p.created_by_name}</p>
              </div>
              {p.user_id === currentUser?.id && (
                <button onClick={async () => { if(window.confirm("Ta bort?")) { await supabase.from('proposals').delete().eq('id', p.id); fetchProposals(); } }} style={deleteBtnStyle}><Trash2 size={18} /></button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button onClick={async () => { await supabase.from('proposals').update({ votes_up: (p.votes_up || 0) + 1 }).eq('id', p.id); fetchProposals(); }} style={voteUpBtn}><ThumbsUp size={18} /> {p.votes_up || 0}</button>
              <button onClick={async () => { await supabase.from('proposals').update({ votes_down: (p.votes_down || 0) + 1 }).eq('id', p.id); fetchProposals(); }} style={voteDownBtn}><ThumbsDown size={18} /> {p.votes_down || 0}</button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: SKAPA (Publicera) */}
      {showCreateModal && (
        <div style={modalOverlayStyle} onClick={() => setShowCreateModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Publicera tips</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none' }}><X /></button>
            </div>
            <input 
              type="text" 
              value={modalDraft.name} 
              onChange={(e) => setModalDraft({ ...modalDraft, name: e.target.value })} 
              style={{...searchInputStyle, paddingLeft: '15px'}}
              autoFocus
            />
            <button onClick={handleSaveProposal} disabled={isSaving} style={saveBtnStyle}>
              {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Bekräfta & Publicera</>}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: NAVIGERING */}
      {showNavModal && (
        <div style={modalOverlayStyle} onClick={() => setShowNavModal(false)}>
          <div style={modalSheetStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHandleStyle}></div>
            <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>Välj navigering till {modalDraft.name}</h3>
            <button onClick={() => openInApp('google')} style={navOptionBtnStyle}>Google Maps</button>
            <button onClick={() => openInApp('waze')} style={navOptionBtnStyle}>Waze</button>
            <button onClick={() => openInApp('apple')} style={navOptionBtnStyle}>Apple Maps</button>
            <button onClick={() => setShowNavModal(false)} style={{...navOptionBtnStyle, backgroundColor: '#EEE', border: 'none', marginTop: '10px', color: '#666'}}>Avbryt</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Styles ---
const mapWrapperStyle = { height: '350px', borderRadius: '28px', overflow: 'hidden', marginBottom: '20px', border: '5px solid #F9F7F2', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' };
const searchInputStyle = { width: '100%', padding: '14px 14px 14px 40px', borderRadius: '16px', border: '2px solid #ECE7DF', outline: 'none', backgroundColor: '#FAF9F6' };
const addBtnStyle = { backgroundColor: '#2F5D3A', border: 'none', borderRadius: '16px', width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const resultsDropdownStyle = { position: 'absolute', top: '55px', left: 0, right: 62, backgroundColor: 'white', zIndex: 1000, border: '1px solid #ECE7DF', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' };
const resultItemStyle = { padding: '12px', cursor: 'pointer', borderBottom: '1px solid #EEE', fontSize: '13px', display: 'flex', alignItems: 'center' };
const proposalCardStyle = { backgroundColor: '#FAF9F6', borderRadius: '24px', padding: '20px', border: '1px solid #EEE7DB', marginBottom: '10px' };
const popupActionBtn = { width: '100%', padding: '12px', backgroundColor: '#2F5D3A', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' };
const modalOverlayStyle = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' };
const modalStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '28px', width: '100%', maxWidth: '400px' };
const modalSheetStyle = { width: '100%', backgroundColor: 'white', padding: '20px 20px 40px 20px', borderTopLeftRadius: '25px', borderTopRightRadius: '25px', alignSelf: 'flex-end' };
const modalHandleStyle = { width: '40px', height: '5px', backgroundColor: '#DDD', borderRadius: '10px', margin: '0 auto 20px auto' };
const saveBtnStyle = { width: '100%', padding: '16px', backgroundColor: '#2F5D3A', color: 'white', border: 'none', borderRadius: '18px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' };
const navOptionBtnStyle = { width: '100%', padding: '16px', marginBottom: '10px', borderRadius: '14px', border: '1px solid #DDD', fontWeight: 'bold', fontSize: '16px' };
const voteUpBtn = { flex: 1, padding: '12px', borderRadius: '14px', border: 'none', backgroundColor: '#E7EFE3', color: '#2F5D3A', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '8px' };
const voteDownBtn = { flex: 1, padding: '12px', borderRadius: '14px', border: 'none', backgroundColor: '#FDECEC', color: '#C0392B', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '8px' };
const deleteBtnStyle = { background: '#FDECEC', border: 'none', borderRadius: '10px', padding: '8px', color: '#C0392B' };

export default ConvoyView;
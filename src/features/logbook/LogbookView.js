import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { ThumbsUp, ThumbsDown, Trash2, MapPin, Plus, Search, Loader2, X, Save, ArrowRightLeft } from 'lucide-react';
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
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
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
  const [mapCenter, setMapCenter] = useState([59.61, 16.54]);
  const [tempMarker, setTempMarker] = useState(null);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [modalDraft, setModalDraft] = useState({ name: '', lat: null, lng: null });
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchProposals(); }, []);

  const fetchProposals = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('proposals').select('*').order('votes_up', { ascending: false });
    if (!error) setProposals(data || []);
    setLoading(false);
  };

  const triggerAddFlow = (draftData) => {
    setModalDraft(draftData);
    if (proposals.length >= 5) {
      setShowReplaceModal(true);
      setShowCreateModal(false);
    } else {
      setShowCreateModal(true);
      setShowReplaceModal(false);
    }
  };

  const handleMapClick = async (latlng) => {
    setTempMarker(latlng);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      const placeName = data.name || data.address.road || "Markerad plats";
      setModalDraft({ name: placeName, lat: latlng.lat, lng: latlng.lng });
    } catch (e) {
      setModalDraft({ name: 'Markerad plats', lat: latlng.lat, lng: latlng.lng });
    }
  };

  // --- NY OCH SÄKER LOGIK: SKAPA NYTT ---
  const handleCreateNew = async () => {
    if (!modalDraft.name.trim() || isSaving) return;
    setIsSaving(true);

    try {
      // 1. Fråga databasen EXAKT hur många tips som finns just nu
      const { count, error: countError } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true });

      // 2. "FAIL CLOSED" - Om vi inte kan läsa antalet pga lagg/nätverk, avbryt!
      if (countError) {
        alert("Systemet kunde inte bekräfta plats i konvojen. Försök igen.");
        setIsSaving(false);
        return;
      }

      // 3. SPÄRR - Om det redan är 5 eller mer, blockera sparningen och byt modal!
      if (count >= 5) {
        alert("Gränsen på 5 tips är nådd! Byt till ersättningsläget.");
        await fetchProposals(); // Synka om lokala listan
        setShowCreateModal(false);
        setShowReplaceModal(true);
        setIsSaving(false);
        return;
      }

      // 4. ALLT OK - Nu vet vi säkert att det är < 5, dags att spara
      const { error: insertError } = await supabase.from('proposals').insert([{ 
        name: modalDraft.name.trim(), 
        votes_up: 1, 
        user_id: currentUser?.id,
        created_by_name: currentUser?.name || 'Anonym Buddy',
        latitude: modalDraft.lat,
        longitude: modalDraft.lng
      }]);

      if (!insertError) {
        closeAllAndRefresh();
      } else {
        alert("Kunde inte publicera: " + insertError.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // --- NY OCH SÄKER LOGIK: ERSÄTT ETT TIPS ---
  const handleReplace = async (oldId) => {
    if (!modalDraft.name.trim() || isSaving) return;
    setIsSaving(true);

    try {
      // 1. Radera den gamla först! Om detta misslyckas får vi INTE lägga till en ny.
      const { error: deleteError } = await supabase.from('proposals').delete().eq('id', oldId);
      
      if (deleteError) {
        alert("Kunde inte radera det gamla tipset. Avbryter.");
        setIsSaving(false);
        return; // AVBRYT SPARINGEN AV DET NYA TIPSET
      }

      // 2. När det gamla garanterat är raderat, spara det nya.
      const { error: insertError } = await supabase.from('proposals').insert([{ 
        name: modalDraft.name.trim(), 
        votes_up: 1, 
        user_id: currentUser?.id,
        created_by_name: currentUser?.name || 'Anonym Buddy',
        latitude: modalDraft.lat,
        longitude: modalDraft.lng
      }]);

      if (!insertError) {
        closeAllAndRefresh();
      } else {
        alert("Gamla tipset raderades, men nya kunde inte sparas: " + insertError.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Hjälpfunktion för att städa upp gränssnittet efter sparning
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
      <div style={mapWrapperStyle}>
        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <ChangeView center={mapCenter} />
          <MapEvents onMapClick={handleMapClick} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {tempMarker && (
            <Marker position={tempMarker} icon={redIcon}>
              <Popup autoOpen>
                <button onClick={() => triggerAddFlow(modalDraft)} style={popupActionBtn}>
                  ➕ {proposals.length >= 5 ? 'Ersätt ett tips' : 'Skapa reseförslag'}
                </button>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <div style={{ position: 'relative', marginBottom: '25px', display: 'flex', gap: '10px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} color="#98A4A5" style={{ position: 'absolute', left: '12px', top: '15px' }} />
          <input 
            type="text" 
            placeholder="Sök eller skriv förslag..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            style={searchInputStyle} 
          />
        </div>
        <button 
          onClick={() => triggerAddFlow({ name: searchQuery, lat: null, lng: null })} 
          style={addBtnStyle}
        >
          <Plus color="white" />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={countInfoStyle}>
          <span style={{ color: proposals.length >= 5 ? '#E74C3C' : '#98A4A5' }}>
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

      {/* MODAL: SKAPA NYTT (Kopplad till handleCreateNew) */}
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
              style={{ ...searchInputStyle, paddingLeft: '15px', marginBottom: '20px' }} 
              autoFocus 
            />
            <button onClick={handleCreateNew} disabled={isSaving} style={saveBtnStyle}>
              {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Bekräfta & Publicera</>}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ERSÄTT (Kopplad till handleReplace) */}
      {showReplaceModal && (
        <div style={modalOverlayStyle} onClick={() => setShowReplaceModal(false)}>
          <div style={modalSheetStyle} onClick={(e) => e.stopPropagation()}>
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
const mapWrapperStyle = { height: '350px', borderRadius: '28px', overflow: 'hidden', marginBottom: '20px', border: '5px solid #F9F7F2' };
const searchInputStyle = { width: '100%', padding: '14px 14px 14px 40px', borderRadius: '16px', border: '2px solid #ECE7DF', outline: 'none', backgroundColor: '#FAF9F6' };
const addBtnStyle = { backgroundColor: '#2F5D3A', border: 'none', borderRadius: '16px', width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const countInfoStyle = { fontSize: '11px', fontWeight: '800', color: '#98A4A5', textAlign: 'right', textTransform: 'uppercase', marginBottom: '5px' };
const proposalCardStyle = { backgroundColor: '#FAF9F6', borderRadius: '24px', padding: '20px', border: '1px solid #EEE7DB' };
const modalOverlayStyle = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 };
const modalStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '28px', width: '90%', maxWidth: '400px' };
const modalSheetStyle = { width: '100%', maxWidth: '500px', backgroundColor: '#FAF9F6', padding: '20px', borderTopLeftRadius: '30px', borderTopRightRadius: '30px', alignSelf: 'flex-end', boxShadow: '0 -10px 30px rgba(0,0,0,0.15)' };
const modalHandleStyle = { width: '40px', height: '5px', backgroundColor: '#DDD', borderRadius: '10px', margin: '0 auto 20px auto' };
const saveBtnStyle = { width: '100%', padding: '16px', backgroundColor: '#2F5D3A', color: 'white', border: 'none', borderRadius: '18px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '10px', cursor: 'pointer' };
const replaceOptionBtn = { width: '100%', padding: '16px', backgroundColor: 'white', border: '1px solid #EEE7DB', borderRadius: '16px', textAlign: 'left', fontWeight: '700', display: 'flex', alignItems: 'center', fontSize: '15px', color: '#243137', cursor: 'pointer' };
const cancelBtnStyle = { width: '100%', padding: '14px', border: 'none', background: 'none', color: '#95A5A6', marginTop: '10px', fontWeight: '600', cursor: 'pointer' };
const popupActionBtn = { width: '100%', padding: '12px', backgroundColor: '#2F5D3A', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' };
const voteUpBtn = { flex: 1, padding: '12px', borderRadius: '14px', border: 'none', backgroundColor: '#E7EFE3', color: '#2F5D3A', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '8px', cursor: 'pointer' };
const voteDownBtn = { flex: 1, padding: '12px', borderRadius: '14px', border: 'none', backgroundColor: '#FDECEC', color: '#C0392B', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '8px', cursor: 'pointer' };
const deleteBtnStyle = { background: 'none', border: 'none', color: '#98A4A5', padding: '5px', cursor: 'pointer' };

export default ConvoyView;
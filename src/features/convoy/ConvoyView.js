import React, { useState, useEffect } from 'react';
import { Users, ThumbsUp, ThumbsDown, UserPlus, MapPin, Trophy, Star, Plus } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

// Kart-komponenter
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix för Leaflet-ikoner
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => onMapClick(e.latlng),
  });
  return null;
}

function ConvoyView() {
  const [proposals, setProposals] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [selectedCoords, setSelectedCoords] = useState(null);

  const mapCenter = [59.61, 16.54]; // Västerås/Lillåudden som startpunkt

  const handleInvite = async () => {
    const shareData = {
      title: 'CamperBuddy',
      text: 'Häng med i Min Konvoj i CamperBuddy 🚐💨 Se vår rutt och loggbok här:',
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        alert('Länken kopierad till urklipp! Skicka den till dina vänner. 📋');
      }
    } catch (err) {
        console.log('Delning avbröts');
    }
  };

  const sortProposals = (list) => {
    return [...list].sort((a, b) => {
      const upA = a.votes_up || 0;
      const upB = b.votes_up || 0;
      if (upB !== upA) return upB - upA;
      return (a.votes_down || 0) - (b.votes_down || 0);
    });
  };

  const fetchProposals = async () => {
    const { data, error } = await supabase.from('proposals').select('*');
    if (!error && data) setProposals(sortProposals(data));
  };

  useEffect(() => {
    fetchProposals();
    const channel = supabase
      .channel('db-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proposals' },
        () => fetchProposals()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const handleMapClick = (latlng) => {
    setSelectedCoords(latlng);
    setShowAddModal(true);
  };

  const handleVote = async (id, type) => {
    const proposal = proposals.find((p) => p.id === id);
    if (!proposal) return;

    const isUpvote = type === 'up';
    const newVotesUp = isUpvote ? (proposal.votes_up || 0) + 1 : (proposal.votes_up || 0);
    const newVotesDown = !isUpvote ? (proposal.votes_down || 0) + 1 : (proposal.votes_down || 0);

    await supabase
      .from('proposals')
      .update({ votes_up: newVotesUp, votes_down: newVotesDown })
      .eq('id', id);
  };

  const handleAddProposal = async () => {
    if (newPlaceName.trim() === '' || !selectedCoords) return;

    const fakeWeather = ['☀️ 22°C', '⛅ 19°C', '🌧️ 14°C'][Math.floor(Math.random() * 3)];

    const { error } = await supabase.from('proposals').insert([
      {
        name: newPlaceName,
        weather: fakeWeather,
        votes_up: 0,
        votes_down: 0,
        lat: selectedCoords.lat,
        lng: selectedCoords.lng,
      },
    ]);

    if (!error) {
      setShowAddModal(false);
      setNewPlaceName('');
      setSelectedCoords(null);
    }
  };

  return (
    <div style={{ padding: '20px' }} className="animate-fade-in">
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#2D5A27',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Users size={28} /> Min Konvoj
        </h1>

        <button onClick={handleInvite} style={inviteBtnStyle}>
          <UserPlus size={16} /> Bjud in till Min Konvoj
        </button>
      </header>

      <div style={mapWrapperStyle}>
        <MapContainer center={mapCenter} zoom={11} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler onMapClick={handleMapClick} />

          {proposals.map(
            (prop) =>
              !Number.isNaN(parseFloat(prop.lat)) &&
              !Number.isNaN(parseFloat(prop.lng)) && (
                <Marker
                  key={prop.id}
                  position={[parseFloat(prop.lat), parseFloat(prop.lng)]}
                >
                  <Popup>
                    <strong>{prop.name}</strong>
                  </Popup>
                </Marker>
              )
          )}

          {selectedCoords && (
            <Marker position={[selectedCoords.lat, selectedCoords.lng]} opacity={0.6} />
          )}
        </MapContainer>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px',
        }}
      >
        <h2 style={{ fontSize: '18px', margin: 0 }}>Vad tipsar mina Buddies om?</h2>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            color: '#95A5A6',
            fontSize: '10px',
          }}
        >
          <Star size={12} /> POPULÄRAST FÖRST
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
        {proposals.map((prop, index) => {
          const isLeader = index === 0 && (prop.votes_up || 0) > 0;

          return (
            <div
              key={prop.id}
              style={{
                ...proposalCardStyle,
                border: isLeader ? '2px solid #F1C40F' : 'none',
              }}
            >
              {isLeader && (
                <div style={leaderBadgeStyle}>
                  <Trophy size={12} /> FAVORITEN JUST NU
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <span
                    style={{
                      fontWeight: 'bold',
                      fontSize: '16px',
                      color: '#2D3436',
                    }}
                  >
                    {prop.name}
                  </span>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#95A5A6',
                      marginTop: '2px',
                    }}
                  >
                    Totalt{' '}
                    <span style={{ fontWeight: 'bold', color: '#2D5A27' }}>
                      {prop.votes_up || 0}
                    </span>{' '}
                    som vill hit
                  </div>
                </div>

                <span style={weatherBadgeStyle}>{prop.weather}</span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handleVote(prop.id, 'up')} style={voteBtnStyle(true)}>
                  <ThumbsUp size={18} /> {prop.votes_up || 0}
                </button>
                <button onClick={() => handleVote(prop.id, 'down')} style={voteBtnStyle(false)}>
                  <ThumbsDown size={18} /> {prop.votes_down || 0}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={() => setShowAddModal(true)} style={primaryBtnStyle}>
        <Plus size={20} /> Lägg till ett förslag
      </button>

      {showAddModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <MapPin size={32} color="#2D5A27" />
            </div>

            <h2 style={{ textAlign: 'center', color: '#2D5A27', margin: '0 0 20px 0' }}>
              Spara plats
            </h2>

            <input
              type="text"
              placeholder="Namn på platsen"
              value={newPlaceName}
              onChange={(e) => setNewPlaceName(e.target.value)}
              style={inputStyle}
              autoFocus
            />

            <button onClick={handleAddProposal} style={primaryBtnStyle}>
              Spara förslag
            </button>

            <button
              onClick={() => {
                setShowAddModal(false);
                setSelectedCoords(null);
              }}
              style={cancelBtnStyle}
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- DESIGN ---
const mapWrapperStyle = {
  height: '220px',
  borderRadius: '20px',
  overflow: 'hidden',
  marginBottom: '25px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  border: '4px solid white',
};

const inviteBtnStyle = {
  backgroundColor: '#E8F5E9',
  padding: '8px 15px',
  borderRadius: '20px',
  color: '#2D5A27',
  fontSize: '14px',
  fontWeight: 'bold',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const proposalCardStyle = {
  backgroundColor: '#FFF',
  padding: '15px',
  borderRadius: '15px',
  boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
  position: 'relative',
};

const leaderBadgeStyle = {
  position: 'absolute',
  top: 0,
  right: 0,
  backgroundColor: '#F1C40F',
  color: '#FFF',
  padding: '2px 10px',
  fontSize: '10px',
  fontWeight: 'bold',
  borderBottomLeftRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
};

const weatherBadgeStyle = {
  fontSize: '14px',
  backgroundColor: '#F5F2ED',
  padding: '4px 8px',
  borderRadius: '10px',
};

const inputStyle = {
  width: '100%',
  padding: '15px',
  borderRadius: '10px',
  border: '2px solid #DCEBDE',
  fontSize: '16px',
  marginBottom: '20px',
};

const primaryBtnStyle = {
  backgroundColor: '#2D5A27',
  color: 'white',
  border: 'none',
  padding: '16px',
  borderRadius: '15px',
  fontSize: '16px',
  fontWeight: 'bold',
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '8px',
};

const voteBtnStyle = (isUp) => ({
  flex: 1,
  padding: '10px',
  border: 'none',
  borderRadius: '10px',
  backgroundColor: isUp ? '#E8F5E9' : '#FFEBEE',
  color: isUp ? '#2D5A27' : '#C62828',
  fontWeight: 'bold',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '6px',
});

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.7)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1100,
};

const modalStyle = {
  backgroundColor: '#FFF',
  padding: '30px',
  borderRadius: '25px',
  width: '85%',
  maxWidth: '350px',
};

const cancelBtnStyle = {
  width: '100%',
  padding: '15px 0 0 0',
  background: 'none',
  border: 'none',
  color: '#95A5A6',
  fontWeight: 'bold',
  marginTop: '10px',
};

export default ConvoyView;
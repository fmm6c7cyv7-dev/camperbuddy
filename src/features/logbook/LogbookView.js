import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  MapPin,
  Calendar,
  Trash2,
  Loader2,
  Pencil,
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

// --- HJÄLPFUNKTIONER ---
function formatEntryDate(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return String(value);
}

function LogbookView({ onOpenComposer, onEditEntry, refreshKey }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = async () => {
    setLoading(true);
    // Hämtar alla minnen sorterat på datum (senaste först)
    const { data, error } = await supabase
      .from('logbook')
      .select('*')
      .order('date', { ascending: false });

    if (!error && data) {
      setEntries(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, [refreshKey]);

  const handleDeleteEntry = async (entryId) => {
    const confirmed = window.confirm('Vill du radera detta minne för alltid?');
    if (!confirmed) return;

    const { error } = await supabase.from('logbook').delete().eq('id', entryId);
    if (!error) {
      fetchEntries();
    } else {
      alert("Kunde inte radera: " + error.message);
    }
  };

  if (loading) {
    return (
      <div style={loadingWrapStyle}>
        <Loader2 className="animate-spin" size={32} color="#2F5D3A" />
        <span style={{ color: '#98A4A5', fontWeight: '600', marginTop: '10px' }}>Hämtar dina äventyr...</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', paddingBottom: '120px' }} className="animate-fade-in">
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Min Resedagbok</h1>
          <p style={subtitleStyle}>{entries.length} sparade äventyr</p>
        </div>
        <div style={countBadgeStyle}>
          <BookOpen size={20} color="#2F5D3A" />
        </div>
      </header>

      <div style={entriesGridStyle}>
        {entries.length === 0 ? (
          <div style={emptyStateStyle}>
            <MapPin size={48} color="#ECE7DF" />
            <p>Loggboken är tom. Dags att skapa nya minnen längs vägen!</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} style={entryCardStyle}>
              {entry.image_url && (
                <div style={imageContainerStyle}>
                  <img src={entry.image_url} alt={entry.title} style={entryImageStyle} />
                </div>
              )}

              <div style={{ padding: '20px' }}>
                <div style={entryTopRowStyle}>
                  <h3 style={entryTitleStyle}>{entry.title || 'Utan titel'}</h3>
                  <div style={entryActionGroupStyle}>
                    <button 
                      onClick={() => onEditEntry(entry)} 
                      style={editBtnStyle}
                      aria-label="Redigera"
                    >
                      <Pencil size={14} style={{ marginRight: '6px' }} /> Redigera
                    </button>
                    <button 
                      onClick={() => handleDeleteEntry(entry.id)} 
                      style={deleteBtnStyle}
                      aria-label="Radera"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <p style={entryContentStyle}>{entry.content}</p>

                <div style={entryFooterStyle}>
                  <span style={infoItemStyle}>
                    <MapPin size={14} /> {entry.location || 'Okänd plats'}
                  </span>
                  <span style={infoItemStyle}>
                    <Calendar size={14} /> {formatEntryDate(entry.date)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <button onClick={onOpenComposer} style={floatingBtnStyle}>
        <Plus size={28} />
      </button>
    </div>
  );
}

// --- STYLES ---
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' };
const titleStyle = { fontSize: '26px', fontWeight: '800', color: '#243137', margin: 0 };
const subtitleStyle = { fontSize: '14px', color: '#98A4A5', margin: '4px 0 0 0' };
const countBadgeStyle = { backgroundColor: '#F0F4EF', padding: '12px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const loadingWrapStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' };
const emptyStateStyle = { textAlign: 'center', padding: '60px 20px', color: '#98A4A5', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', fontWeight: '500' };

const entriesGridStyle = { display: 'flex', flexDirection: 'column', gap: '24px' };
const entryCardStyle = { backgroundColor: '#FAF9F6', borderRadius: '28px', overflow: 'hidden', border: '1px solid #EEE7DB', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' };
const imageContainerStyle = { width: '100%', height: '220px', overflow: 'hidden' };
const entryImageStyle = { width: '100%', height: '100%', objectFit: 'cover' };
const entryTopRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' };
const entryTitleStyle = { margin: 0, fontSize: '19px', fontWeight: '700', color: '#243137' };
const entryActionGroupStyle = { display: 'flex', alignItems: 'center', gap: '10px' };

const entryContentStyle = { color: '#636E72', fontSize: '15px', lineHeight: '1.6', marginBottom: '20px', whiteSpace: 'pre-wrap' };
const entryFooterStyle = { display: 'flex', gap: '15px', borderTop: '1px solid #EEE7DB', paddingTop: '15px', flexWrap: 'wrap' };
const infoItemStyle = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#95A5A6', textTransform: 'uppercase', letterSpacing: '0.5px' };

const editBtnStyle = { border: '1px solid #DCE5DA', backgroundColor: '#EEF3EA', color: '#2F5D3A', borderRadius: '12px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: '800' };
const deleteBtnStyle = { border: 'none', background: 'none', color: '#E74C3C', cursor: 'pointer', padding: '4px' };

const floatingBtnStyle = {
  position: 'fixed', bottom: '100px', right: '25px', width: '64px', height: '64px',
  backgroundColor: '#2D5A27', color: 'white', border: 'none', borderRadius: '22px',
  boxShadow: '0 12px 30px rgba(45,90,39,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s'
};

export default LogbookView;
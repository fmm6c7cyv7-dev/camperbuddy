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

    const { data, error } = await supabase
      .from('logbook')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setEntries(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, [refreshKey]);

  const handleDeleteEntry = async (entryId) => {
    const confirmed = window.confirm('Radera minnet?');
    if (!confirmed) return;

    await supabase.from('logbook').delete().eq('id', entryId);
    fetchEntries();
  };

  if (loading) {
    return (
      <div style={loadingWrapStyle}>
        <Loader2 className="animate-spin" size={24} />
        <span>Laddar loggboken...</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', paddingBottom: '100px' }} className="animate-fade-in">
      <header style={headerStyle}>
        <h1 style={titleStyle}>
          <BookOpen size={28} />
          Loggboken
        </h1>
        <div style={countBadgeStyle}>{entries.length} minnen</div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {entries.map((entry) => (
          <div key={entry.id} style={entryCardStyle}>
            {entry.image_url && <img src={entry.image_url} alt="Minne" style={entryImageStyle} />}

            <div style={{ padding: '20px' }}>
              <div style={entryTopRowStyle}>
                <h3 style={entryTitleStyle}>{entry.title}</h3>

                <div style={entryActionGroupStyle}>
                  <button
                    onClick={() => onEditEntry(entry)}
                    style={editBtnStyle}
                    aria-label="Redigera minne"
                  >
                    <Pencil size={15} />
                    Redigera
                  </button>

                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    style={deleteBtnStyle}
                    aria-label="Radera minne"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <p style={entryContentStyle}>{entry.content}</p>

              <div style={entryFooterStyle}>
                <span style={infoItemStyle}>
                  <MapPin size={14} />
                  {entry.location}
                </span>

                <span style={infoItemStyle}>
                  <Calendar size={14} />
                  {formatEntryDate(entry.date)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={onOpenComposer} style={floatingBtnStyle}>
        <Plus size={24} />
        Nytt minne
      </button>
    </div>
  );
}

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '25px',
};

const titleStyle = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#2D5A27',
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const countBadgeStyle = {
  backgroundColor: '#E8F5E9',
  padding: '5px 12px',
  borderRadius: '15px',
  color: '#2D5A27',
  fontSize: '12px',
  fontWeight: 'bold',
};

const loadingWrapStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  color: '#636E72',
  padding: '40px 0',
};

const entryCardStyle = {
  backgroundColor: '#FFF',
  borderRadius: '25px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
  overflow: 'hidden',
  border: '1px solid #F0F0F0',
};

const entryImageStyle = {
  width: '100%',
  height: '220px',
  objectFit: 'cover',
};

const entryTopRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  alignItems: 'flex-start',
};

const entryActionGroupStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexShrink: 0,
};

const entryTitleStyle = {
  margin: '0 0 5px 0',
  fontSize: '18px',
};

const entryContentStyle = {
  color: '#636E72',
  marginBottom: '15px',
};

const entryFooterStyle = {
  display: 'flex',
  gap: '15px',
  borderTop: '1px solid #F5F2ED',
  paddingTop: '10px',
  flexWrap: 'wrap',
};

const infoItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  fontSize: '12px',
  color: '#95A5A6',
};

const editBtnStyle = {
  border: '1px solid #DCE5DA',
  backgroundColor: '#EEF3EA',
  color: '#2F5D3A',
  borderRadius: '999px',
  padding: '8px 12px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '12px',
  fontWeight: 'bold',
};

const deleteBtnStyle = {
  border: 'none',
  background: 'none',
  color: '#E74C3C',
  cursor: 'pointer',
  padding: '6px',
};

const floatingBtnStyle = {
  position: 'fixed',
  bottom: '90px',
  right: '20px',
  backgroundColor: '#2D5A27',
  color: 'white',
  border: 'none',
  padding: '15px 25px',
  borderRadius: '30px',
  fontWeight: 'bold',
  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  zIndex: 100,
  cursor: 'pointer',
};

export default LogbookView;
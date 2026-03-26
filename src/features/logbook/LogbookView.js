import React, { useState, useEffect, useCallback } from 'react';
import { Camera, MapPin, Calendar, Trash2, Loader2, Plus, X } from 'lucide-react'; // LADE TILL: 'X' för stängknappen
import { supabase } from '../../services/supabaseClient';

function LogbookView({ currentUser, onOpenComposer, refreshKey }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null); // LADE TILL: State för förstorad bild

  const fetchEntries = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('logbook')
        .select('*')
        .eq('buddy_id', currentUser.id) // Kopplat till din 'buddies' tabell
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      console.error("Logbook fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries, refreshKey]);

  const handleDelete = async (id) => {
    if (!window.confirm("Vill du radera detta minne?")) return;
    const { error } = await supabase.from('logbook').delete().eq('id', id);
    if (!error) setEntries(prev => prev.filter(e => e.id !== id));
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
      <Loader2 className="animate-spin" size={32} color="#2F5D3A" />
    </div>
  );

  return (
    <div style={{ padding: '20px', paddingBottom: '120px' }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#243137', margin: 0 }}>Min Loggbok</h1>
        <p style={{ color: '#98A4A5', fontSize: '14px' }}>Dina samlade äventyr ({entries.length} st)</p>
      </header>

      {entries.length === 0 ? (
        <div style={emptyStateStyle} onClick={onOpenComposer}>
          <div style={emptyIconCircle}><Camera size={32} color="#2F5D3A" /></div>
          <h3 style={{ margin: '10px 0 5px 0', color: '#243137' }}>Börja skriva din historia</h3>
          <p style={{ color: '#98A4A5', fontSize: '14px', margin: 0 }}>Tryck på plusset för att skapa ditt första minne.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {entries.map(entry => (
            <div key={entry.id} style={cardStyle}>
              {/* LADE TILL: onClick och cursor pointer på bilden */}
              {entry.image_url && (
                <img 
                  src={entry.image_url} 
                  style={{ ...imgStyle, cursor: 'zoom-in' }} 
                  alt="" 
                  onClick={() => setSelectedImage(entry.image_url)}
                />
              )}
              <div style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>{entry.title}</h3>
                  <button onClick={() => handleDelete(entry.id)} style={deleteBtn}><Trash2 size={16} /></button>
                </div>
                <p style={contentStyle}>{entry.content}</p>
                <div style={metaStyle}>
                  <span style={tagStyle}><MapPin size={12} /> {entry.location || 'Okänd plats'}</span>
                  <span style={tagStyle}><Calendar size={12} /> {new Date(entry.created_at).toLocaleDateString('sv-SE')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Den runda plus-knappen för att öppna loggboken */}
      <button onClick={onOpenComposer} style={fabStyle}>
        <Plus size={32} color="white" />
      </button>

      {/* LADE TILL: Modal för förstorad bild (Lightbox) */}
      {selectedImage && (
        <div style={lightboxOverlayStyle} onClick={() => setSelectedImage(null)}>
          <button style={lightboxCloseBtnStyle} onClick={() => setSelectedImage(null)}>
            <X size={32} color="white" />
          </button>
          <img 
            src={selectedImage} 
            style={lightboxImageStyle} 
            alt="Förstorad vy" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
}

// STYLING (Matchar din dashboard perfekt)
const cardStyle = { backgroundColor: '#FFF', borderRadius: '28px', overflow: 'hidden', border: '1px solid #EEE7DB', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' };
const imgStyle = { width: '100%', height: '200px', objectFit: 'cover' };
const contentStyle = { color: '#4A5568', fontSize: '15px', lineHeight: '1.5', margin: '12px 0' };
const metaStyle = { display: 'flex', gap: '12px', marginTop: '15px' };
const tagStyle = { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#98A4A5', fontWeight: '800', textTransform: 'uppercase' };
const deleteBtn = { border: 'none', background: '#FFF0F0', color: '#E74C3C', padding: '8px', borderRadius: '12px', cursor: 'pointer' };
const emptyStateStyle = { textAlign: 'center', padding: '60px 20px', backgroundColor: '#F0F4EF', borderRadius: '32px', marginTop: '20px', cursor: 'pointer' };
const emptyIconCircle = { width: '64px', height: '64px', backgroundColor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' };
const fabStyle = { position: 'fixed', bottom: '100px', right: '25px', width: '64px', height: '64px', backgroundColor: '#2F5D3A', borderRadius: '22px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 25px rgba(47,93,58,0.3)', cursor: 'pointer', zIndex: 100 };

// LADE TILL: Stilar för Lightbox
const lightboxOverlayStyle = { position: 'fixed', inset: 0, backgroundColor: 'rgba(23, 32, 38, 0.95)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', backdropFilter: 'blur(5px)' };
const lightboxImageStyle = { maxWidth: '100%', maxHeight: '85vh', borderRadius: '16px', objectFit: 'contain', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' };
const lightboxCloseBtnStyle = { position: 'absolute', top: '25px', right: '25px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };

export default LogbookView;
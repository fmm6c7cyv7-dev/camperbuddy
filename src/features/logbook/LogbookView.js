import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, MapPin, Calendar, Trash2, X, Save, Camera, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

function LogbookView() {
  const [entries, setEntries] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [newEntry, setNewEntry] = useState({
    title: '',
    content: '',
    location: '',
    image: null
  });

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('logbook')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setEntries(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleAddEntry = async () => {
    if (newEntry.title.trim() === '' || newEntry.content.trim() === '') return;
    setUploading(true);

    let uploadedImageUrl = null;

    if (newEntry.image) {
      const file = newEntry.image;
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logbook_images')
        .upload(filePath, file);

      if (!uploadError) {
        const { data } = supabase.storage.from('logbook_images').getPublicUrl(filePath);
        uploadedImageUrl = data.publicUrl;
      }
    }

    const today = new Date().toLocaleDateString('sv-SE');
    const { error } = await supabase
      .from('logbook')
      .insert([{ 
        title: newEntry.title, 
        content: newEntry.content, 
        location: newEntry.location || 'Okänd plats',
        date: today,
        image_url: uploadedImageUrl 
      }]);

    if (!error) {
      setShowAddModal(false);
      setNewEntry({ title: '', content: '', location: '', image: null });
      fetchEntries();
    }
    setUploading(false);
  };

  return (
    <div style={{ padding: '20px', paddingBottom: '100px' }} className="animate-fade-in">
      <header style={headerStyle}>
        <h1 style={titleStyle}><BookOpen size={28} /> Loggboken</h1>
        <div style={countBadgeStyle}>{entries.length} minnen</div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {entries.map((entry) => (
          <div key={entry.id} style={entryCardStyle}>
            {entry.image_url && <img src={entry.image_url} alt="Minne" style={entryImageStyle} />}
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={entryTitleStyle}>{entry.title}</h3>
                <button onClick={async () => {
                  if(window.confirm("Radera minnet?")) {
                    await supabase.from('logbook').delete().eq('id', entry.id);
                    fetchEntries();
                  }
                }} style={{ border: 'none', background: 'none', color: '#E74C3C' }}><Trash2 size={16} /></button>
              </div>
              <p style={entryContentStyle}>{entry.content}</p>
              <div style={entryFooterStyle}>
                <span style={infoItemStyle}><MapPin size={14} /> {entry.location}</span>
                <span style={infoItemStyle}><Calendar size={14} /> {entry.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => setShowAddModal(true)} style={floatingBtnStyle}><Plus size={24} /> Nytt minne</button>

      {showAddModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={{ margin: 0, color: '#2D5A27' }}>Skapa minne</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none' }}><X /></button>
            </div>

            <input type="text" placeholder="Rubrik" value={newEntry.title} onChange={(e) => setNewEntry({...newEntry, title: e.target.value})} style={inputStyle} />
            <input type="text" placeholder="Plats" value={newEntry.location} onChange={(e) => setNewEntry({...newEntry, location: e.target.value})} style={inputStyle} />
            <textarea placeholder="Vad hände idag?" value={newEntry.content} onChange={(e) => setNewEntry({...newEntry, content: e.target.value})} style={{ ...inputStyle, height: '80px' }} />

            {/* BILD-VAL: TVÅ KNAPPAR */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <label style={mediaBtnStyle}>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" // HÄR ÄR MAGIN: Öppnar kameran direkt
                  onChange={(e) => setNewEntry({...newEntry, image: e.target.files[0]})} 
                  style={{ display: 'none' }} 
                />
                <Camera size={20} /> Kamera
              </label>

              <label style={mediaBtnStyle}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setNewEntry({...newEntry, image: e.target.files[0]})} 
                  style={{ display: 'none' }} 
                />
                <ImageIcon size={20} /> Galleri
              </label>
            </div>

            {newEntry.image && (
              <div style={selectedFileBadge}>
                <Check size={16} /> Bild vald: {newEntry.image.name.substring(0, 10)}...
              </div>
            )}

            <button onClick={handleAddEntry} disabled={uploading} style={saveBtnStyle}>
              {uploading ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Spara minne</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- DESIGN (Uppdaterad med knappar för media) ---
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' };
const titleStyle = { fontSize: '24px', fontWeight: 'bold', color: '#2D5A27', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' };
const countBadgeStyle = { backgroundColor: '#E8F5E9', padding: '5px 12px', borderRadius: '15px', color: '#2D5A27', fontSize: '12px', fontWeight: 'bold' };
const entryCardStyle = { backgroundColor: '#FFF', borderRadius: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #F0F0F0' };
const entryImageStyle = { width: '100%', height: '220px', objectFit: 'cover' };
const entryTitleStyle = { margin: '0 0 5px 0', fontSize: '18px' };
const entryContentStyle = { color: '#636E72', marginBottom: '15px' };
const entryFooterStyle = { display: 'flex', gap: '15px', borderTop: '1px solid #F5F2ED', paddingTop: '10px' };
const infoItemStyle = { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#95A5A6' };
const floatingBtnStyle = { position: 'fixed', bottom: '90px', right: '20px', backgroundColor: '#2D5A27', color: 'white', border: 'none', padding: '15px 25px', borderRadius: '30px', fontWeight: 'bold', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 100 };
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' };
const modalStyle = { backgroundColor: '#FFF', padding: '25px', borderRadius: '25px', width: '100%', maxWidth: '400px' };
const modalHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #F5F2ED', marginBottom: '12px', fontSize: '16px', boxSizing: 'border-box' };
const mediaBtnStyle = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', backgroundColor: '#F5F2ED', borderRadius: '12px', cursor: 'pointer', color: '#636E72', fontWeight: 'bold', border: '1px solid #DCEBDE' };
const selectedFileBadge = { backgroundColor: '#E8F5E9', color: '#2D5A27', padding: '10px', borderRadius: '10px', fontSize: '12px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' };
const saveBtnStyle = { width: '100%', padding: '16px', backgroundColor: '#2D5A27', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' };

export default LogbookView;
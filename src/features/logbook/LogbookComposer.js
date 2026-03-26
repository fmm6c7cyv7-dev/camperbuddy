import React, { useState, useEffect } from 'react';
import { X, Camera, Save, Loader2, MapPin } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

function LogbookComposer({ isOpen, onClose, onSave, editingEntry, currentUser }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (editingEntry && isOpen) {
      setTitle(editingEntry.title || '');
      setContent(editingEntry.content || '');
      setLocation(editingEntry.location || '');
      setPreviewUrl(editingEntry.image_url || null);
    } else if (isOpen) {
      setTitle(''); setContent(''); setLocation(''); setImage(null); setPreviewUrl(null);
    }
  }, [editingEntry, isOpen]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1000; 
      const scale = MAX_WIDTH / img.width;
      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => setImage(blob), 'image/jpeg', 0.8);
    };
  };

  const handleSave = async () => {
    if (!title) return alert("Ge äventyret en titel!");
    setIsUploading(true);
    try {
      let imageUrl = previewUrl;
      if (image) {
        const path = `logs/${Date.now()}.jpg`;
        const { error: upError } = await supabase.storage.from('logbook-images').upload(path, image);
        if (upError) throw upError;
        const { data } = supabase.storage.from('logbook-images').getPublicUrl(path);
        imageUrl = data.publicUrl;
      }

      const payload = { 
        title, 
        content, 
        location, 
        image_url: imageUrl, 
        user_id: currentUser?.id,
        created_at: new Date().toISOString()
      };

      const { error } = editingEntry 
        ? await supabase.from('logbook').update(payload).eq('id', editingEntry.id)
        : await supabase.from('logbook').insert([payload]);

      if (error) throw error;
      onSave(); 
      onClose();
    } catch (err) { 
      alert("Fel vid sparande: " + err.message); 
    } finally { 
      setIsUploading(false); 
    }
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={handleBar} />
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>
            {editingEntry ? 'Redigera minne' : 'Nytt äventyr'}
          </h2>
          <button onClick={onClose} style={closeBtn}><X /></button>
        </div>

        <label style={uploadPlaceholder}>
          {previewUrl ? (
            <img src={previewUrl} style={previewImg} alt="Preview" />
          ) : (
            <div style={uploadContent}>
              <Camera size={40} color="#2F5D3A" />
              <span style={{ fontWeight: 'bold', color: '#2F5D3A' }}>Fånga ögonblicket</span>
            </div>
          )}
          <input type="file" hidden onChange={handleImageChange} accept="image/*" />
        </label>

        <div style={inputContainer}>
          <MapPin size={18} color="#98A4A5" />
          <input 
            placeholder="Var är ni?" 
            value={location} 
            onChange={e => setLocation(e.target.value)} 
            style={rawInput} 
          />
        </div>

        <input 
          placeholder="Titel på minnet" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          style={titleInput} 
        />

        <textarea 
          placeholder="Vad hände idag?" 
          value={content} 
          onChange={e => setContent(e.target.value)} 
          style={textArea} 
        />

        <button onClick={handleSave} disabled={isUploading} style={saveBtnStyle}>
          {isUploading ? <Loader2 className="animate-spin" /> : 'Spara i Loggboken'}
        </button>
      </div>
    </div>
  );
}

// STYLES (Anpassade för din snygga design)
const overlayStyle = { position: 'fixed', inset: 0, backgroundColor: 'rgba(36, 49, 55, 0.6)', zIndex: 3000, display: 'flex', alignItems: 'flex-end' };
const modalStyle = { width: '100%', backgroundColor: '#FAF9F6', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '24px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 -10px 40px rgba(0,0,0,0.1)' };
const handleBar = { width: '40px', height: '5px', backgroundColor: '#E0DDD7', borderRadius: '10px', margin: '0 auto 20px auto' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };
const closeBtn = { border: 'none', background: '#F0F4EF', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const uploadPlaceholder = { width: '100%', height: '220px', backgroundColor: '#F0F4EF', borderRadius: '24px', display: 'flex', border: '2px dashed #DCE5DA', cursor: 'pointer', overflow: 'hidden', marginBottom: '20px' };
const uploadContent = { margin: 'auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' };
const previewImg = { width: '100%', height: '100%', objectFit: 'cover' };
const inputContainer = { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0', borderBottom: '1px solid #EEE7DB', marginBottom: '15px' };
const rawInput = { border: 'none', background: 'none', fontSize: '16px', outline: 'none', width: '100%' };
const titleInput = { ...rawInput, fontSize: '20px', fontWeight: '700', marginBottom: '15px' };
const textArea = { width: '100%', minHeight: '120px', padding: '15px', borderRadius: '18px', border: '1px solid #EEE7DB', backgroundColor: 'white', fontSize: '16px', outline: 'none', resize: 'none' };
const saveBtnStyle = { width: '100%', padding: '18px', backgroundColor: '#2F5D3A', color: 'white', border: 'none', borderRadius: '20px', fontWeight: '800', fontSize: '16px', marginTop: '20px', boxShadow: '0 8px 20px rgba(47,93,58,0.2)', cursor: 'pointer' };

export default LogbookComposer;
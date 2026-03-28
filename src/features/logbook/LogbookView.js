import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, MapPin, Calendar, Trash2, Loader2, Plus, X, Pencil, Save, Image as ImageIcon } from 'lucide-react'; 
import { supabase } from '../../services/supabaseClient';

function LogbookView({ currentUser, onOpenComposer, refreshKey }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null); 
  
  // States för redigering
  const [editingEntry, setEditingEntry] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Nytt state för att hantera bildbyte i redigeringen
  const [tempImagePreview, setTempImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const fetchEntries = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('logbook')
        .select('*')
        .eq('buddy_id', currentUser.id) 
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

  // Öppna edit och nollställ bild-preview
  const openEdit = (entry) => {
    setEditingEntry(entry);
    setTempImagePreview(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Vill du radera detta minne?")) return;
    const { error } = await supabase.from('logbook').delete().eq('id', id);
    if (!error) setEntries(prev => prev.filter(e => e.id !== id));
  };

  // Hantera bildval (från bibliotek eller kamera)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImagePreview(reader.result); // Base64 för preview och uppladdning
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerPicker = (useCamera = false) => {
    if (fileInputRef.current) {
      if (useCamera) {
        fileInputRef.current.setAttribute("capture", "environment");
      } else {
        fileInputRef.current.removeAttribute("capture");
      }
      fileInputRef.current.click();
    }
  };

  const handleUpdate = async () => {
    if (!editingEntry.title.trim()) return;
    setIsUpdating(true);
    
    // Förbered data för uppdatering
    const updateData = {
      title: editingEntry.title,
      content: editingEntry.content
    };

    // Om vi har valt en ny bild, inkludera den (vi antar att image_url lagrar base64 eller länk)
    if (tempImagePreview) {
      updateData.image_url = tempImagePreview;
    }

    const { data, error } = await supabase
      .from('logbook')
      .update(updateData)
      .eq('id', editingEntry.id)
      .select()
      .single();

    if (!error) {
      setEntries(prev => prev.map(e => e.id === editingEntry.id ? data : e));
      setEditingEntry(null);
      setTempImagePreview(null);
    }
    setIsUpdating(false);
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
              <div style={cardTopRowStyle}>
                {entry.image_url && (
                  <img 
                    src={entry.image_url} 
                    style={imgThumbnailStyle} 
                    alt="" 
                    onClick={() => setSelectedImage(entry.image_url)}
                  />
                )}
                <div style={topRightAreaStyle}>
                  <div style={metaTopRowStyle}>
                    <span style={tagStyle}><MapPin size={10} /> {entry.location || 'Okänd plats'}</span>
                    <span style={tagStyle}><Calendar size={10} /> {new Date(entry.created_at).toLocaleDateString('sv-SE')}</span>
                  </div>
                  <div style={titleCenterWrapperStyle}>
                    <h3 style={entryTitleStyle}>{entry.title}</h3>
                  </div>
                  <div style={actionButtonsRow}>
                    <button onClick={() => openEdit(entry)} style={editBtn}><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(entry.id)} style={deleteBtn}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
              <div style={cardBottomHalfStyle}>
                <p style={contentStyle}>{entry.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Redigerings-Modal */}
      {editingEntry && (
        <div style={modalOverlayStyle} onClick={() => setEditingEntry(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#243137' }}>Redigera minne</h2>
              <button onClick={() => setEditingEntry(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
            </div>
            
            <p style={inputLabelStyle}>Rubrik</p>
            <input 
              style={inputStyle} 
              value={editingEntry.title} 
              onChange={e => setEditingEntry({...editingEntry, title: e.target.value})}
            />

            <p style={inputLabelStyle}>Vad hände idag?</p>
            <textarea 
              style={{ ...inputStyle, height: '100px', resize: 'none' }} 
              value={editingEntry.content} 
              onChange={e => setEditingEntry({...editingEntry, content: e.target.value})}
            />

            {/* SEKTION FÖR BILD-REDIGERING */}
            <p style={inputLabelStyle}>Bild</p>
            <div style={imageEditSectionStyle}>
              <div style={imageActionButtonsStyle}>
                <button onClick={() => triggerPicker(true)} style={imagePickerBtn}>
                  <Camera size={18} /> Kamera
                </button>
                <button onClick={() => triggerPicker(false)} style={imagePickerBtn}>
                  <ImageIcon size={18} /> Galleri
                </button>
              </div>
              
              {/* Förhandsvisning av antingen nyvald bild eller befintlig */}
              {(tempImagePreview || editingEntry.image_url) && (
                <div style={editPreviewContainer}>
                  <img 
                    src={tempImagePreview || editingEntry.image_url} 
                    style={editPreviewImg} 
                    alt="Preview" 
                  />
                  {tempImagePreview && (
                    <button onClick={() => setTempImagePreview(null)} style={removeImageBtn}>
                      Ångra bildval
                    </button>
                  )}
                </div>
              )}
            </div>

            <button onClick={handleUpdate} disabled={isUpdating} style={saveUpdateBtn}>
              {isUpdating ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Spara ändringar</>}
            </button>
          </div>
        </div>
      )}

      {/* Dold input för bildval */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileChange} 
      />

      <button onClick={onOpenComposer} style={fabStyle}>
        <Plus size={32} color="white" />
      </button>

      {selectedImage && (
        <div style={lightboxOverlayStyle} onClick={() => setSelectedImage(null)}>
          <button style={lightboxCloseBtnStyle} onClick={() => setSelectedImage(null)}>
            <X size={32} color="white" />
          </button>
          <img src={selectedImage} style={lightboxImageStyle} alt="Förstorad vy" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

// --- NYA/UPPDATERADE STYLES FÖR BILD-REDIGERING ---
const imageEditSectionStyle = { marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' };
const imageActionButtonsStyle = { display: 'flex', gap: '10px' };
const imagePickerBtn = { 
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
  padding: '10px', borderRadius: '12px', border: '2px dashed #ECE7DF', 
  background: '#F9F8F6', color: '#2F5D3A', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' 
};
const editPreviewContainer = { position: 'relative', marginTop: '5px' };
const editPreviewImg = { width: '100%', height: '120px', objectFit: 'cover', borderRadius: '14px', border: '1px solid #EEE' };
const removeImageBtn = { 
  position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(255,255,255,0.9)', 
  border: 'none', padding: '5px 10px', borderRadius: '8px', fontSize: '12px', color: '#E74C3C', 
  fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' 
};

// --- BEFINTLIG STYLING BEVARAD ---
const cardStyle = { backgroundColor: '#FFF', borderRadius: '28px', border: '1px solid #EEE7DB', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column' };
const cardTopRowStyle = { display: 'flex', height: '130px', borderBottom: '1px solid #F2EEE6' };
const imgThumbnailStyle = { width: '130px', height: '130px', objectFit: 'cover', cursor: 'zoom-in', flexShrink: 0 };
const topRightAreaStyle = { flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 15px', position: 'relative' };
const metaTopRowStyle = { display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '5px' };
const titleCenterWrapperStyle = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '15px' };
const entryTitleStyle = { margin: 0, fontSize: '17px', fontWeight: '800', color: '#172026', textAlign: 'center' };
const actionButtonsRow = { position: 'absolute', bottom: '8px', right: '12px', display: 'flex', gap: '8px' };
const cardBottomHalfStyle = { padding: '18px 20px' };
const contentStyle = { color: '#4A5568', fontSize: '15px', lineHeight: '1.6', margin: 0 };
const tagStyle = { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#98A4A5', fontWeight: '800', textTransform: 'uppercase' };
const deleteBtn = { border: 'none', background: '#FFF0F0', color: '#E74C3C', padding: '6px', borderRadius: '10px', cursor: 'pointer' };
const editBtn = { border: 'none', background: '#F0F7F2', color: '#2F5D3A', padding: '6px', borderRadius: '10px', cursor: 'pointer' };
const fabStyle = { position: 'fixed', bottom: '100px', right: '25px', width: '64px', height: '64px', backgroundColor: '#2F5D3A', borderRadius: '22px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 25px rgba(47,93,58,0.3)', cursor: 'pointer', zIndex: 100 };
const modalOverlayStyle = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 5000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' };
const modalStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '28px', width: '100%', maxWidth: '450px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' };
const inputLabelStyle = { fontSize: '13px', color: '#98A4A5', marginBottom: '6px', fontWeight: 'bold', textTransform: 'uppercase' };
const inputStyle = { width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #ECE7DF', marginBottom: '20px', outline: 'none', fontSize: '16px' };
const saveUpdateBtn = { width: '100%', padding: '16px', backgroundColor: '#2F5D3A', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' };
const emptyStateStyle = { textAlign: 'center', padding: '60px 20px', backgroundColor: '#F0F4EF', borderRadius: '32px', marginTop: '20px', cursor: 'pointer' };
const emptyIconCircle = { width: '64px', height: '64px', backgroundColor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' };
const lightboxOverlayStyle = { position: 'fixed', inset: 0, backgroundColor: 'rgba(23, 32, 38, 0.95)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', backdropFilter: 'blur(5px)' };
const lightboxImageStyle = { maxWidth: '100%', maxHeight: '85vh', borderRadius: '16px', objectFit: 'contain' };
const lightboxCloseBtnStyle = { position: 'absolute', top: '25px', right: '25px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer' };

export default LogbookView;
import React, { useEffect, useRef, useState } from 'react';
import './assets/styles/global.css';
import { supabase } from './services/supabaseClient';
import {
  Compass,
  Users,
  BookOpen,
  Eye,
  Trees,
  Sun,
  MapPin,
  Camera,
  ImageIcon,
  X,
  Save,
  Check,
  Loader2,
  LocateFixed,
  Star, 
  LogOut, 
} from 'lucide-react';

import DashboardView from './features/dashboard/DashboardView';
import ConvoyView from './features/convoy/ConvoyView';
import LogbookView from './features/logbook/LogbookView'; 
import LogbookComposer from './features/logbook/LogbookComposer'; 

const STOP_THRESHOLD_KMH = 2;
const STOP_DELAY_MS = 5000;
const ASSISTANT_ANIMATION_MS = 1500;
const DEFAULT_LOCATION_TEXT = 'Hämtar position...';

function CamperBuddyLogo() {
  return (
    <img
      src="/icons/header_logo_11.png"
      alt="CamperBuddy"
      style={headerLogoImageStyle}
    />
  );
}

// --- MODIFIERAD HEADER MED TEST-KNAPP ---
function GlobalHeader({ activeTab, currentUser, onLogout }) {
  const tabLabel =
    activeTab === 'home' ? 'Hem' : activeTab === 'convoy' ? 'Konvoj' : 'Logg';

  return (
    <header style={headerShellStyle}>
      <div style={headerInnerStyle}>
        <CamperBuddyLogo />

        <div style={headerRightStyle}>
          {/* TEST-KNAPP: Visas bara om vi är inloggade för att kunna hoppa tillbaka till onboarding */}
          {currentUser && (
            <button 
              onClick={onLogout}
              style={{ 
                background: 'none', 
                border: 'none', 
                marginRight: '10px', 
                color: '#95A5A6',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Logga ut (Endast för test)"
            >
              <LogOut size={18} />
            </button>
          )}
          
          <div style={headerPillStyle}>
            <MapPin size={15} color="#2F5D3A" />
            <span>{tabLabel}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [detectedLocation, setDetectedLocation] = useState(DEFAULT_LOCATION_TEXT);

  const [assistantMounted, setAssistantMounted] = useState(false);
  const [assistantVisible, setAssistantVisible] = useState(false);
  const [dismissedUntilMotion, setDismissedUntilMotion] = useState(false);

  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [composerVisible, setComposerVisible] = useState(false);
  const [composerUploading, setComposerUploading] = useState(false);
  const [composerLocating, setComposerLocating] = useState(false);
  const [logbookRefreshKey, setLogbookRefreshKey] = useState(0);

  const [pickerTarget, setPickerTarget] = useState('composer');

  const [currentUser, setCurrentUser] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');
  
  // --- NYA STATES FÖR PIN-KOD ---
  const [onboardingPin, setOnboardingPin] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const watchIdRef = useRef(null);
  const stopTimerRef = useRef(null);
  const assistantHideTimerRef = useRef(null);

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const emptyComposer = {
    id: null,
    title: '',
    content: '',
    location: '',
    date: new Date().toISOString().slice(0, 10),
    image: null,
    existingImageUrl: '',
    isGoldenStar: false, 
  };

  const [composerDraft, setComposerDraft] = useState(emptyComposer);

  useEffect(() => {
    const savedProfile = localStorage.getItem('camperbuddy_profile');
    if (savedProfile) {
      setCurrentUser(JSON.parse(savedProfile));
    } else {
      setShowOnboarding(true);
    }
  }, []);

  // --- FUNKTION FÖR ATT NOLLSTÄLLA (TEST) ---
  const handleLogout = () => {
    localStorage.removeItem('camperbuddy_profile');
    setCurrentUser(null);
    setOnboardingName('');
    setOnboardingPin('');
    setLoginError('');
    setShowOnboarding(true);
  };

  // --- UPPDATERAD INLOGGNINGSLOGIK MED PIN-KOD ---
  const saveUserProfile = async () => {
    const cleanName = onboardingName.replace(/\s+/g, ''); // Tar bort ALLA mellanslag
    const cleanPin = onboardingPin.trim();

    if (cleanName.length < 2) {
      setLoginError("Namnet måste vara minst 2 tecken.");
      return;
    }
    if (cleanPin.length !== 4) {
      setLoginError("PIN-koden måste vara 4 siffror.");
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      // 1. Kolla om namnet finns
      const { data: existingUser, error: searchError } = await supabase
        .from('buddies')
        .select('*')
        .ilike('username', cleanName)
        .maybeSingle();

      if (existingUser) {
        // Alias finns! Kolla om PIN matchar
        if (existingUser.pin === cleanPin) {
          const userProfile = { id: existingUser.id, name: existingUser.username };
          localStorage.setItem('camperbuddy_profile', JSON.stringify(userProfile));
          setCurrentUser(userProfile);
          setShowOnboarding(false);
        } else {
          setLoginError("Fel PIN-kod för detta alias.");
          setNeedsConfirmation(false);
        }
      } else {
        // Alias finns INTE. 
        // Om användaren inte har bekräftat än, visa frågan:
        if (!needsConfirmation) {
          setLoginError("Aliaset finns inte. Vill du skapa en ny buddy?");
          setNeedsConfirmation(true);
          setIsLoggingIn(false);
          return;
        }

        // Om de trycker igen (efter bekräftelse), skapa kontot:
        const { data: newUser, error: insertError } = await supabase
          .from('buddies')
          .insert([{ username: cleanName, pin: cleanPin }])
          .select()
          .single();

        if (insertError) {
          setLoginError("Kunde inte skapa profil. Försök igen.");
          setNeedsConfirmation(false);
          return;
        }

        const userProfile = { id: newUser.id, name: newUser.username };
        localStorage.setItem('camperbuddy_profile', JSON.stringify(userProfile));
        setCurrentUser(userProfile);
        setShowOnboarding(false);
      }
    } catch (err) {
      console.error(err);
      setLoginError("Ett oväntat fel uppstod.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // --- BEHÅLLER ALL DIN BEFINTLIGA LOGIK HÄRIFRÅN ---
  const resetComposer = () => {
    setComposerDraft({
      ...emptyComposer,
      date: new Date().toISOString().slice(0, 10),
    });
  };

  const normalizeDateForInput = (value) => {
    if (!value) return new Date().toISOString().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  };

  const resolveCurrentPlace = async () => {
    if (!navigator.geolocation) return 'Okänd plats';
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
    });
    const { latitude, longitude } = position.coords;
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`);
    const data = await res.json();
    const addr = data?.address || {};
    return addr.amenity || addr.tourism || addr.shop || addr.neighborhood || addr.road || addr.suburb || addr.village || addr.town || addr.city || 'Okänd plats';
  };

  const getGpsLocation = async () => {
    try {
      const place = await resolveCurrentPlace();
      setDetectedLocation(place);
    } catch (error) {
      setDetectedLocation('Okänd plats');
    }
  };

  const fillComposerWithCurrentLocation = async () => {
    setComposerLocating(true);
    try {
      if (detectedLocation && detectedLocation !== DEFAULT_LOCATION_TEXT && detectedLocation !== 'Okänd plats') {
        setComposerDraft((prev) => ({ ...prev, location: detectedLocation }));
        return;
      }
      const place = await resolveCurrentPlace();
      setComposerDraft((prev) => ({ ...prev, location: place }));
    } catch (error) {
      setComposerDraft((prev) => ({ ...prev, location: prev.location || 'Okänd plats' }));
    } finally {
      setComposerLocating(false);
    }
  };

  const openAssistantModal = () => {
    if (assistantHideTimerRef.current) {
      clearTimeout(assistantHideTimerRef.current);
      assistantHideTimerRef.current = null;
    }
    if (!assistantMounted) {
      setAssistantMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setAssistantVisible(true)));
    } else {
      setAssistantVisible(true);
    }
    getGpsLocation();
  };

  const closeAssistantModal = ({ dismissUntilMove = false } = {}) => {
    setAssistantVisible(false);
    if (dismissUntilMove) setDismissedUntilMotion(true);
    if (assistantHideTimerRef.current) clearTimeout(assistantHideTimerRef.current);
    assistantHideTimerRef.current = setTimeout(() => setAssistantMounted(false), ASSISTANT_ANIMATION_MS);
  };

  const simulateStop = () => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    setDismissedUntilMotion(false);
    openAssistantModal();
  };

  useEffect(() => {
    if (activeTab !== 'home') {
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      closeAssistantModal();
      return undefined;
    }
    if (!navigator.geolocation) return undefined;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const rawSpeed = pos?.coords?.speed;
        if (rawSpeed == null || !Number.isFinite(rawSpeed)) return;
        const speedKmh = rawSpeed * 3.6;
        if (speedKmh <= STOP_THRESHOLD_KMH) {
          if (!assistantMounted && !assistantVisible && !dismissedUntilMotion && !stopTimerRef.current) {
            stopTimerRef.current = setTimeout(() => {
              openAssistantModal();
              stopTimerRef.current = null;
            }, STOP_DELAY_MS);
          }
        } else {
          if (stopTimerRef.current) {
            clearTimeout(stopTimerRef.current);
            stopTimerRef.current = null;
          }
          if (dismissedUntilMotion) setDismissedUntilMotion(false);
          if (assistantMounted || assistantVisible) closeAssistantModal();
        }
      },
      (error) => console.error(error),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    };
  }, [activeTab, assistantMounted, assistantVisible, dismissedUntilMotion]);

  const openComposer = (draft = {}) => {
    setComposerDraft({
      ...emptyComposer,
      ...draft,
      date: normalizeDateForInput(draft.date),
      existingImageUrl: draft.existingImageUrl || '',
      isGoldenStar: draft.isGoldenStar || false, 
    });
    setComposerVisible(true);
  };

  const openEditComposer = (entry) => {
    openComposer({
      id: entry.id,
      title: entry.title || '',
      content: entry.content || '',
      location: entry.location || '',
      date: entry.date,
      image: null,
      existingImageUrl: entry.image_url || '',
      isGoldenStar: entry.is_golden_star || false, 
    });
  };

  const closeComposer = () => {
    setComposerVisible(false);
    setTimeout(() => resetComposer(), 150);
  };

  const handleAssistantToComposer = () => {
    const cleanLocation = detectedLocation && detectedLocation !== DEFAULT_LOCATION_TEXT && detectedLocation !== 'Okänd plats' ? detectedLocation : '';
    openComposer({
      title: cleanLocation ? `Stopp vid ${cleanLocation}` : '',
      location: cleanLocation,
      content: '',
      date: new Date().toISOString().slice(0, 10),
      image: null,
      existingImageUrl: '',
    });
    closeAssistantModal({ dismissUntilMove: true });
    setActiveTab('logbook');
  };

  const openDashboardPhotoFlow = () => {
    setPickerTarget('newComposerFromDashboard');
    setShowMediaPicker(true);
  };

  const openComposerFromLogbook = () => {
    setPickerTarget('composer');
    openComposer();
  };

  const closeMediaPicker = () => setShowMediaPicker(false);

  const handlePickedImage = (file) => {
    if (!file) return;
    if (pickerTarget === 'newComposerFromDashboard') {
      setShowMediaPicker(false);
      setActiveTab('logbook');
      openComposer({ image: file });
      return;
    }
    setComposerDraft((prev) => ({ ...prev, image: file }));
    setShowMediaPicker(false);
  };

  const handleCameraChange = (e) => {
    const file = e.target.files?.[0];
    handlePickedImage(file);
    e.target.value = '';
  };

  const handleGalleryChange = (e) => {
    const file = e.target.files?.[0];
    handlePickedImage(file);
    e.target.value = '';
  };

  const handleStarRating = async () => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      const { latitude, longitude } = position.coords;
      const userId = currentUser ? currentUser.id : "anonymous_buddy"; 
      const { data, error } = await supabase.rpc('handle_star_click', {
        user_id_val: userId,
        lat: latitude,
        lng: longitude
      });
      if (error) throw error;
      return data.status === 'already_official' || data.status === 'created' || data.status === 'updated';
    } catch (err) {
      return false;
    }
  };

  const handleSaveComposer = async () => {
    if (composerDraft.title.trim() === '' || composerDraft.content.trim() === '') return;
    setComposerUploading(true);
    
    try {
      if (composerDraft.isGoldenStar) await handleStarRating();
      
      let finalImageUrl = composerDraft.existingImageUrl || null;
      
      if (composerDraft.image) {
        const file = composerDraft.image;
        const fileExt = file.name?.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('logbook_images').upload(fileName, file);
        
        if (!uploadError) {
          const { data } = supabase.storage.from('logbook_images').getPublicUrl(fileName);
          finalImageUrl = data.publicUrl;
        }
      }
      
      const payload = {
        buddy_id: currentUser?.id || null, 
        title: composerDraft.title,
        content: composerDraft.content,
        location: composerDraft.location || 'Okänd plats',
        date: composerDraft.date || new Date().toISOString().slice(0, 10),
        image_url: finalImageUrl,
        is_golden_star: composerDraft.isGoldenStar, 
      };
      
      let error = null;
      
      if (composerDraft.id) {
        const result = await supabase.from('logbook').update(payload).eq('id', composerDraft.id);
        error = result.error;
      } else {
        const result = await supabase.from('logbook').insert([payload]);
        error = result.error;
      }
      
      if (!error) {
        closeComposer();
        setActiveTab('logbook');
        setLogbookRefreshKey((prev) => prev + 1);
      } else {
        console.error("Fel vid sparande till Supabase:", error);
      }
    } catch (error) {
      console.error("Oväntat fel i handleSaveComposer:", error);
    } finally {
      setComposerUploading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <DashboardView setActiveTab={setActiveTab} onOpenLogbookPhotoFlow={openDashboardPhotoFlow} currentUser={currentUser} />;
      case 'convoy': return <ConvoyView currentUser={currentUser} />;
      case 'logbook': return <LogbookView onOpenComposer={openComposerFromLogbook} onEditEntry={openEditComposer} refreshKey={logbookRefreshKey} currentUser={currentUser} />; 
      default: return <DashboardView setActiveTab={setActiveTab} onOpenLogbookPhotoFlow={openDashboardPhotoFlow} currentUser={currentUser} />;
    }
  };

  return (
    <div style={appShellStyle}>
      {/* --- MODIFIERAD ONBOARDING (ALIAS + PIN) --- */}
      {showOnboarding && (
        <div style={onboardingOverlayStyle}>
          <div style={{
            ...onboardingCardStyle,
            padding: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            width: '90%',
            maxWidth: '400px'
          }}>
            <div style={{
              backgroundColor: '#f8f9f8',
              padding: '40px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <img 
                src="/icons/icon-512.png" 
                alt="CamperBUDDY" 
                style={{ 
                  height: '140px', 
                  width: '140px', 
                  borderRadius: '30px',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.1)' 
                }} 
              />
            </div>

            <div style={{ padding: '30px 25px', textAlign: 'center' }}>
              <div style={{ marginBottom: '25px' }}>
                <p style={{ fontSize: '1.2rem', fontWeight: '700', color: '#334247', margin: '0' }}>
                  Vem är du bakom ratten?
                </p>
                <p style={{ fontSize: '0.85rem', color: '#667085', marginTop: '8px', lineHeight: '1.4' }}>
                  Välj ett alias och en 4-siffrig kod.
                </p>
              </div>

              {/* INPUT: ALIAS */}
              <input
                type="text"
                placeholder="Ditt Alias (t.ex. BodilBobil)"
                value={onboardingName}
                onChange={(e) => {
                  const val = e.target.value.replace(/\s+/g, '');
                  setOnboardingName(val);
                  if (typeof setNeedsConfirmation === 'function') {
                    setNeedsConfirmation(false);
                  }
                }}
                style={{
                  ...inputStyle,
                  width: '100%',
                  padding: '16px',
                  fontSize: '1rem',
                  borderRadius: '12px',
                  border: '2px solid #edf2f7',
                  textAlign: 'center',
                  marginBottom: '12px',
                  outline: 'none'
                }}
              />

              {/* INPUT: PIN-KOD */}
              <input
                type="tel"
                pattern="[0-9]*"
                maxLength="4"
                placeholder="4-siffrig PIN-kod"
                value={onboardingPin}
                onChange={(e) => setOnboardingPin(e.target.value.replace(/\D/g, ''))}
                style={{
                  ...inputStyle,
                  width: '100%',
                  padding: '16px',
                  fontSize: '1rem',
                  borderRadius: '12px',
                  border: '2px solid #edf2f7',
                  textAlign: 'center',
                  marginBottom: '20px',
                  outline: 'none',
                  letterSpacing: '8px'
                }}
              />
              
              {loginError && (
                <p style={{ color: '#E74C3C', fontSize: '13px', fontWeight: 'bold', marginBottom: '15px' }}>
                  {loginError}
                </p>
              )}

              <button
                onClick={saveUserProfile}
                style={{
                  ...primaryBtn,
                  backgroundColor: needsConfirmation ? '#4D8A57' : '#2F5D3A',
                  opacity: (onboardingName.trim() && onboardingPin.length === 4 && !isLoggingIn) ? 1 : 0.6,
                }}
                disabled={!onboardingName.trim() || onboardingPin.length !== 4 || isLoggingIn}
              >
                {isLoggingIn ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : needsConfirmation ? (
                  "Ja, skapa ny buddy! 🏕️" 
                ) : (
                  "Starta resan 🏕️"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- RESTEN AV APPEN --- */}
      <GlobalHeader 
        activeTab={activeTab} 
        currentUser={currentUser} 
        onLogout={handleLogout} 
      />

      <main style={mainContentStyle}>{renderContent()}</main>

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleCameraChange} style={{ display: 'none' }} />
      <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleGalleryChange} style={{ display: 'none' }} />

      {assistantMounted && (
        <div style={{ ...assistantOverlayStyle, opacity: assistantVisible ? 1 : 0, pointerEvents: assistantVisible ? 'auto' : 'none' }}>
          <div style={{ ...bottomSheetStyle, transform: assistantVisible ? 'translateY(0)' : 'translateY(150%)', opacity: assistantVisible ? 1 : 0.98 }}>
            <h2 style={assistantTitleStyle}>Härlig plats! 👋</h2>
            <p style={assistantLeadStyle}>Stannat vid <b>{detectedLocation}</b>?</p>
            <div style={infoRowStyle}>
              <div style={iconBox}><Eye size={22} color="#8B9798" /><span>Utsikt</span></div>
              <div style={iconBox}><Trees size={22} color="#8B9798" /><span>Natur</span></div>
              <div style={iconBox}><Sun size={22} color="#8B9798" /><span>Solnedgång</span></div>
            </div>
            <div style={{ display: 'flex', gap: '14px' }}>
              <button style={primaryBtn} onClick={handleAssistantToComposer}>Ja, spara 📸</button>
              <button style={secondaryBtn} onClick={() => closeAssistantModal({ dismissUntilMove: true })}>Nej tack</button>
            </div>
          </div>
        </div>
      )}

      {/* Media Picker & Composer Modals fortsätter härifrån... (oförändrat) */}
      {showMediaPicker && (
        <div style={modalOverlayStyle} onClick={closeMediaPicker}>
          <div style={actionSheetStyle} className="animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div style={sheetHandleStyle}></div>
            <div style={actionSheetHeaderStyle}>
              <h2 style={sheetTitleStyle}>Lägg till bild</h2>
              <button onClick={closeMediaPicker} style={iconOnlyBtnStyle}><X /></button>
            </div>
            <p style={actionSheetTextStyle}>Välj hur du vill skapa ditt nya minne.</p>
            <div style={sheetActionGridStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button type="button" onClick={() => cameraInputRef.current?.click()} style={sheetActionBtnStyle}>
                  <Camera size={22} /><span>Öppna kamera </span>
                </button>
                <span style={{ fontSize: '11px', color: '#95A5A6', textAlign: 'center', lineHeight: '1.3', padding: '0 10px' }}>
                  Obs: Bilden sparas säkert i din loggbok i en lägre kvalitet, vill du ha kvar din bild i hög upplösning rekomenderar camperBUDDY att ni använder telefonens egen kamera och väljer att hämta upp bilden från ditt " Bibliotek".
                </span>
              </div>
              
              <button type="button" onClick={() => galleryInputRef.current?.click()} style={{...sheetActionBtnStyle, marginTop: '8px'}}>
                <ImageIcon size={22} /><span>Välj från bibliotek</span>
              </button>
            </div>
            <button type="button" onClick={closeMediaPicker} style={sheetCancelBtnStyle}>Avbryt</button>
          </div>
        </div>
      )}

      {composerVisible && (
        <div style={modalOverlayStyle} onClick={closeComposer}>
          <div style={modalStyle} className="animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h2 style={sheetTitleStyle}>{composerDraft.id ? 'Redigera minne' : 'Skapa minne'}</h2>
              <button onClick={closeComposer} style={iconOnlyBtnStyle}><X /></button>
            </div>
            <input type="text" placeholder="Rubrik" value={composerDraft.title} onChange={(e) => setComposerDraft((prev) => ({ ...prev, title: e.target.value }))} style={inputStyle} />
            <input type="text" placeholder="Plats" value={composerDraft.location} onChange={(e) => setComposerDraft((prev) => ({ ...prev, location: e.target.value }))} style={inputStyle} />
            <button type="button" onClick={fillComposerWithCurrentLocation} disabled={composerLocating} style={locationBtnStyle}>
              {composerLocating ? <><Loader2 className="animate-spin" size={16} />Hämtar position...</> : <><LocateFixed size={16} />Använd min position</>}
            </button>
            <button type="button" onClick={() => setComposerDraft(prev => ({ ...prev, isGoldenStar: !prev.isGoldenStar }))}
              style={{
                ...locationBtnStyle,
                backgroundColor: composerDraft.isGoldenStar ? '#FFD700' : '#FBFAF7',
                borderColor: composerDraft.isGoldenStar ? '#E6C200' : '#ECE7DF',
                color: composerDraft.isGoldenStar ? '#5C4D00' : '#667276',
                marginBottom: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              <Star size={18} fill={composerDraft.isGoldenStar ? "#5C4D00" : "none"} />
              {composerDraft.isGoldenStar ? 'Markerad som Guldstjärna!' : 'Tipsa Buddies om denna plats?'}
            </button>
            <input type="date" value={composerDraft.date} onChange={(e) => setComposerDraft((prev) => ({ ...prev, date: e.target.value }))} style={inputStyle} />
            <textarea placeholder="Vad hände idag?" value={composerDraft.content} onChange={(e) => setComposerDraft((prev) => ({ ...prev, content: e.target.value }))} style={{ ...inputStyle, height: '96px', resize: 'none' }} />
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button type="button" onClick={() => { setPickerTarget('composer'); cameraInputRef.current?.click(); }} style={mediaBtnStyle}><Camera size={20} />Kamera</button>
              <button type="button" onClick={() => { setPickerTarget('composer'); galleryInputRef.current?.click(); }} style={mediaBtnStyle}><ImageIcon size={20} />Galleri</button>
            </div>
            {composerDraft.image && <div style={selectedFileBadge}><Check size={16} />Ny bild vald: {composerDraft.image.name.length > 24 ? `${composerDraft.image.name.slice(0, 24)}...` : composerDraft.image.name}</div>}
            {!composerDraft.image && composerDraft.existingImageUrl && <div style={selectedFileBadge}><Check size={16} />Befintlig bild kommer att behållas</div>}
            <button onClick={handleSaveComposer} disabled={composerUploading} style={saveBtnStyle}>{composerUploading ? <Loader2 className="animate-spin" /> : <><Save size={20} />{composerDraft.id ? 'Spara ändringar' : 'Spara minne'}</>}</button>
          </div>
        </div>
      )}

      <nav style={navStyle}>
        <button onClick={() => setActiveTab('home')} style={navItem(activeTab === 'home')}><Compass /><span>Hem</span></button>
        <button onClick={() => setActiveTab('convoy')} style={navItem(activeTab === 'convoy')}><Users /><span>Konvoj</span></button>
        <button onClick={() => setActiveTab('logbook')} style={navItem(activeTab === 'logbook')}><BookOpen /><span>Logg</span></button>
      </nav>

      {/* HÄR LÄGGER VI TILL DEN NYA MODALEN */}
      <LogbookComposer 
        isOpen={composerVisible}
        onClose={() => setComposerVisible(false)}
        onSave={() => setLogbookRefreshKey(prev => prev + 1)}
        currentUser={currentUser}
      />

    </div>
  );
}

// --- STYLES --- 
const appShellStyle = { backgroundColor: '#F5F2ED', minHeight: '100vh' };
const onboardingOverlayStyle = { position: 'fixed', inset: 0, backgroundColor: 'rgba(245, 242, 237, 0.98)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' };
const onboardingCardStyle = { backgroundColor: '#FAF9F6', borderRadius: '34px', width: '100%', maxWidth: '450px', boxShadow: '0 24px 60px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column' };
const headerLogoImageStyle = { height: '64px', width: 'auto', display: 'block', objectFit: 'contain' };
const mainContentStyle = { paddingTop: '90px', paddingBottom: '96px' };
const headerShellStyle = { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 4000, backgroundColor: 'rgba(248,247,243,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 1px 0 rgba(47,93,58,0.04)' };
const headerInnerStyle = { width: '100%', maxWidth: '1180px', margin: '0 auto', minHeight: '74px', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', boxSizing: 'border-box' };
const headerRightStyle = { display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 };
const headerPillStyle = { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '999px', background: '#ECE9E1', color: '#2F5D3A', fontSize: '13px', fontWeight: 700, border: '1px solid rgba(47,93,58,0.06)' };
const simulateStopBtnStyle = { position: 'fixed', left: '50%', bottom: '116px', transform: 'translateX(-50%)', backgroundColor: 'rgba(47, 93, 58, 0.12)', color: 'rgba(47, 93, 58, 0.82)', border: '1px solid rgba(47, 93, 58, 0.18)', padding: '10px 18px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.01em', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', boxShadow: '0 8px 20px rgba(0,0,0,0.05)', zIndex: 1700, cursor: 'pointer' };
const assistantOverlayStyle = { position: 'fixed', inset: 0, backgroundColor: 'rgba(17, 22, 19, 0.68)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', zIndex: 5000, padding: '20px 20px calc(96px + env(safe-area-inset-bottom)) 20px', transition: `opacity ${ASSISTANT_ANIMATION_MS}ms ease-in-out` };
const bottomSheetStyle = { backgroundColor: '#FAF9F6', padding: '34px 32px 28px 32px', borderRadius: '34px', width: '100%', maxWidth: '850px', boxShadow: '0 24px 60px rgba(0,0,0,0.18)', transition: `transform ${ASSISTANT_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${ASSISTANT_ANIMATION_MS}ms ease-in-out` };
const assistantTitleStyle = { margin: 0, color: '#2F5D3A', fontSize: '28px', fontWeight: 800, lineHeight: 1.1 };
const assistantLeadStyle = { margin: '28px 0 24px 0', color: '#657174', fontSize: '22px', lineHeight: 1.35 };
const infoRowStyle = { display: 'flex', justifyContent: 'space-around', margin: '0 0 26px 0', padding: '24px 0', borderTop: '1px solid #E3E1DB', borderBottom: '1px solid #E3E1DB' };
const iconBox = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: '#8B9798', fontSize: '16px', fontWeight: 500 };
const primaryBtn = { backgroundColor: '#2F5D3A', color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 700, fontSize: '18px', cursor: 'pointer' };
const secondaryBtn = { flex: 1, backgroundColor: '#EAE5DD', color: '#7C8A8D', border: 'none', borderRadius: '28px', fontWeight: 500, fontSize: '22px', cursor: 'pointer' };
const modalOverlayStyle = { position: 'fixed', inset: 0, backgroundColor: 'rgba(24, 29, 26, 0.56)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 5000, padding: '20px' };
const modalStyle = { backgroundColor: '#FAF9F6', padding: '26px', borderRadius: '28px', width: '100%', maxWidth: '430px', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' };
const inputStyle = { width: '100%', padding: '14px 14px', borderRadius: '14px', border: '2px solid #ECE7DF', marginBottom: '12px', fontSize: '16px', boxSizing: 'border-box', backgroundColor: '#FBFAF7', color: '#172026' };
const iconOnlyBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#172026' };
const locationBtnStyle = { width: '100%', marginTop: '-2px', marginBottom: '12px', padding: '12px 14px', borderRadius: '14px', border: '1px solid #DCE5DA', backgroundColor: '#EEF3EA', color: '#2F5D3A', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' };
const mediaBtnStyle = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px', backgroundColor: '#ECE9E1', borderRadius: '14px', cursor: 'pointer', color: '#667276', fontWeight: 'bold', border: '1px solid #DDD7CC' };
const saveBtnStyle = { width: '100%', padding: '16px', backgroundColor: '#2F5D3A', color: 'white', border: 'none', borderRadius: '18px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', cursor: 'pointer' };
const actionSheetStyle = { width: '100%', maxWidth: '430px', backgroundColor: '#FAF9F6', borderRadius: '28px', padding: '14px 18px 18px 18px', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' };
const sheetHandleStyle = { width: '48px', height: '5px', borderRadius: '999px', backgroundColor: '#D9DDD6', margin: '0 auto 16px auto' };
const actionSheetHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' };
const actionSheetTextStyle = { margin: '0 0 16px 0', color: '#667276', fontSize: '14px', lineHeight: '1.5' };
const sheetActionGridStyle = { display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '14px' };
const sheetActionBtnStyle = { width: '100%', border: '1px solid #DDD7CC', backgroundColor: '#ECE9E1', color: '#2F5D3A', borderRadius: '16px', padding: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' };
const sheetCancelBtnStyle = { width: '100%', border: 'none', backgroundColor: '#1C2730', color: '#FFF', borderRadius: '16px', padding: '15px', fontWeight: 'bold', cursor: 'pointer' };
const navStyle = { position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(248,247,243,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 calc(20px + env(safe-area-inset-bottom)) 0', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)', zIndex: 1900 };
const navItem = (active) => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', color: active ? '#2F5D3A' : '#95A5A6', fontSize: '10px', fontWeight: active ? 700 : 500 });
const sheetTitleStyle = { margin: 0, fontSize: '18px', color: '#172026' };
const modalHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };
const selectedFileBadge = { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', backgroundColor: '#EEF3EA', color: '#2F5D3A', borderRadius: '12px', fontSize: '13px', fontWeight: 600, marginBottom: '16px' };

export default App;
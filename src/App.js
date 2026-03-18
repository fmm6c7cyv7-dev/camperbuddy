import React, { useState } from 'react';
import './assets/styles/global.css';
import { Compass, Zap, MapPin, Camera, Users, BookOpen, Sun, Map, Share2, X } from 'lucide-react';

// Våra rena "rum"
import ConvoyView from './features/convoy/ConvoyView';
import LogbookView from './features/logbook/LogbookView'; // NY IMPORT

function App() {
  const [showAssistant, setShowAssistant] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  const stats = [
    { label: 'Km idag', value: '124', icon: <Compass size={24} color="#D35400" /> },
    { label: 'Körtid', value: '2h 15m', icon: <Zap size={24} color="#D35400" /> },
    { label: 'Stopp', value: '3', icon: <MapPin size={24} color="#D35400" /> },
  ];

  const renderContent = () => {
    if (activeTab === 'home') {
      return (
        <div style={{ padding: '20px' }} className="animate-fade-in">
          <header style={{ marginBottom: '30px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#2D5A27' }}>Hej Buddy! 🚐</h1>
            <p style={{ color: '#636E72' }}>Solen går ner om 3 timmar. Letar vi nattplats?</p>
          </header>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '30px' }}>
            {stats.map((stat, i) => (
              <div key={i} style={{ backgroundColor: '#FFF', padding: '15px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <div style={{ marginBottom: '5px', display: 'flex', justifyContent: 'center' }}>{stat.icon}</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{stat.value}</div>
                <div style={{ fontSize: '10px', color: '#95A5A6', textTransform: 'uppercase' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <section>
            <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Vad vill du göra nu?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <button style={actionButtonStyle}>
                <Camera size={24} style={{ marginBottom: '8px' }} />
                <span>Fota & Logga</span>
              </button>
              <button onClick={() => setActiveTab('convoy')} style={actionButtonStyle}>
                <Users size={24} style={{ marginBottom: '8px' }} />
                <span>Min Konvoj</span>
              </button>
            </div>
          </section>
        </div>
      );
    } 
    else if (activeTab === 'convoy') {
      return <ConvoyView />; 
    } 
    else if (activeTab === 'logbook') {
      return <LogbookView />; // MYCKET RENARE NU!
    }
  };

  return (
    <div style={{ backgroundColor: '#F5F2ED', minHeight: '100vh', fontFamily: 'sans-serif', color: '#2D3436', position: 'relative', overflow: 'hidden', paddingBottom: '80px' }}>
      
      {renderContent()}

      {activeTab === 'home' && (
        <button onClick={() => setShowAssistant(true)} style={{ position: 'fixed', bottom: '100px', right: '20px', backgroundColor: '#D35400', color: 'white', border: 'none', padding: '15px', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', zIndex: 10 }}>
          🛑 Stopp
        </button>
      )}

      {/* Assistenten (Nu med Ikoner!) */}
      <div style={{ ...overlayStyle, opacity: showAssistant ? 1 : 0, pointerEvents: showAssistant ? 'auto' : 'none' }}>
        <div style={{ ...bottomSheetStyle, transform: showAssistant ? 'translateY(0)' : 'translateY(100%)' }}>
          <h2 style={{ fontSize: '22px', color: '#2D5A27', marginBottom: '5px', marginTop: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={24} /> Härlig plats!
          </h2>
          <p style={{ color: '#636E72', marginBottom: '25px', lineHeight: '1.5' }}>
            Jag känner att vi har stannat. Det är 18°C och soligt just nu. Vill du spara platsen i loggboken?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button style={primaryBtnStyle}><Sun size={20} /> Logga väder & plats</button>
            <button style={secondaryBtnStyle}><Camera size={20} /> Lägg till ett foto</button>
            <button style={secondaryBtnStyle}><Share2 size={20} /> Dela med Konvojen</button>
          </div>
          <button onClick={() => setShowAssistant(false)} style={cancelBtnStyle}>
             Nej, vi ska bara sträcka på benen <X size={16} style={{marginLeft: '4px'}}/>
          </button>
        </div>
      </div>

      <nav style={navBarStyle}>
        <button onClick={() => setActiveTab('home')} style={activeTab === 'home' ? activeNavItemStyle : navItemStyle}>
          <Compass size={ activeTab === 'home' ? 28 : 24 } color={ activeTab === 'home' ? '#2D5A27' : '#95A5A6'} style={{ transition: 'all 0.2s' }} />
          <span style={{ fontSize: '10px', marginTop: '4px', fontWeight: activeTab === 'home' ? 'bold' : 'normal', color: activeTab === 'home' ? '#2D5A27' : '#95A5A6' }}>Hem</span>
        </button>
        <button onClick={() => setActiveTab('convoy')} style={activeTab === 'convoy' ? activeNavItemStyle : navItemStyle}>
          <Users size={ activeTab === 'convoy' ? 28 : 24 } color={ activeTab === 'convoy' ? '#2D5A27' : '#95A5A6'} style={{ transition: 'all 0.2s' }} />
          <span style={{ fontSize: '10px', marginTop: '4px', fontWeight: activeTab === 'convoy' ? 'bold' : 'normal', color: activeTab === 'convoy' ? '#2D5A27' : '#95A5A6' }}>Konvoj</span>
        </button>
        <button onClick={() => setActiveTab('logbook')} style={activeTab === 'logbook' ? activeNavItemStyle : navItemStyle}>
          <BookOpen size={ activeTab === 'logbook' ? 28 : 24 } color={ activeTab === 'logbook' ? '#2D5A27' : '#95A5A6'} style={{ transition: 'all 0.2s' }} />
          <span style={{ fontSize: '10px', marginTop: '4px', fontWeight: activeTab === 'logbook' ? 'bold' : 'normal', color: activeTab === 'logbook' ? '#2D5A27' : '#95A5A6' }}>Loggbok</span>
        </button>
      </nav>
      
    </div>
  );
}

// --- DESIGNMALLAR ---
const actionButtonStyle = { backgroundColor: '#2D5A27', color: 'white', border: 'none', padding: '20px', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'transform 0.1s' };
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', zIndex: 1000, transition: 'opacity 0.5s ease-out' };
const bottomSheetStyle = { backgroundColor: '#FFF', padding: '30px 20px', borderTopLeftRadius: '30px', borderTopRightRadius: '30px', boxShadow: '0 -5px 20px rgba(0,0,0,0.1)', transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)' };
const primaryBtnStyle = { backgroundColor: '#2D5A27', color: 'white', border: 'none', padding: '16px', borderRadius: '15px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' };
const secondaryBtnStyle = { backgroundColor: '#F5F2ED', color: '#2D3436', border: 'none', padding: '16px', borderRadius: '15px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' };
const cancelBtnStyle = { width: '100%', padding: '20px 0 10px 0', backgroundColor: 'transparent', border: 'none', color: '#95A5A6', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const navBarStyle = { position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px 0', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)', zIndex: 100 };
const navItemStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '5px 10px' };
const activeNavItemStyle = { ...navItemStyle };

export default App;
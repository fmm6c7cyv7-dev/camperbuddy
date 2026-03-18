import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Home, MapPin, BookOpen, Star, Plus, Camera, ChevronRight, Trophy, Clock } from 'lucide-react';

function DashboardView({ setActiveTab }) {
  const [topProposal, setTopProposal] = useState(null);
  const [latestEntry, setLatestEntry] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    // 1. Hämta vinnaren från Konvojen
    const { data: propsData } = await supabase.from('proposals').select('*');
    if (propsData && propsData.length > 0) {
      const sorted = [...propsData].sort((a, b) => (b.votes_up || 0) - (a.votes_up || 0));
      setTopProposal(sorted[0]);
    }
    // 2. Hämta senaste loggboken
    const { data: logData } = await supabase.from('logbook').select('*').order('created_at', { ascending: false }).limit(1);
    if (logData && logData.length > 0) setLatestEntry(logData[0]);
    setLoading(false);
  };

  useEffect(() => { fetchDashboardData(); }, []);

  if (loading) return <div style={{textAlign:'center', marginTop:'50px', color:'#95A5A6'}}>Laddar...</div>;

  return (
    <div style={{ padding: '20px', paddingBottom: '100px' }} className="animate-fade-in">
      <header style={{ marginBottom: '25px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#2D5A27', margin: 0 }}>Hej på vägen! 👋</h1>
      </header>

      {/* KONVOJ-KORT */}
      <div style={sectionStyle} onClick={() => setActiveTab('convoy')}>
        <div style={sectionHeaderStyle}><Trophy size={16} color="#F1C40F" /> LEDARE JUST NU</div>
        <div style={cardStyle}>
          {topProposal ? (
            <div style={{display:'flex', justifyContent:'space-between'}}>
              <div><h3 style={{margin:0}}>{topProposal.name}</h3><span style={{color:'#2D5A27', fontSize:'12px'}}>👍 {topProposal.votes_up} röster</span></div>
              <div style={badgeStyle}>{topProposal.weather}</div>
            </div>
          ) : <p>Inga förslag än</p>}
        </div>
      </div>

      {/* LOGGBOKS-KORT */}
      <div style={sectionStyle} onClick={() => setActiveTab('logbook')}>
        <div style={sectionHeaderStyle}><Clock size={16} color="#3498DB" /> SENASTE MINNET</div>
        <div style={cardStyle}>
          {latestEntry ? (
            <div>
              {latestEntry.image_url && <img src={latestEntry.image_url} style={{width:'100%', height:'120px', objectFit:'cover', borderRadius:'10px', marginBottom:'10px'}} alt="minne" />}
              <h3 style={{margin:0}}>{latestEntry.title}</h3>
            </div>
          ) : <p>Inga minnen än</p>}
        </div>
      </div>

      {/* SNABBKNAPPAR */}
      <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
        <button style={actionBtnStyle} onClick={() => setActiveTab('convoy')}><Plus color="#2D5A27" /><span>Ny plats</span></button>
        <button style={actionBtnStyle} onClick={() => setActiveTab('logbook')}><Camera color="#3498DB" /><span>Nytt minne</span></button>
      </div>
    </div>
  );
}

const sectionStyle = { marginBottom: '20px', cursor: 'pointer' };
const sectionHeaderStyle = { fontSize: '12px', fontWeight: 'bold', color: '#95A5A6', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' };
const cardStyle = { backgroundColor: '#FFF', padding: '15px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };
const badgeStyle = { backgroundColor: '#F5F2ED', padding: '4px 8px', borderRadius: '10px', fontSize: '12px' };
const actionBtnStyle = { flex: 1, backgroundColor: '#FFF', border: 'none', padding: '15px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' };

export default DashboardView;
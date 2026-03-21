import React from 'react';
import { BookOpen, Compass, Users } from 'lucide-react';

const TAB_META = {
  home: { label: 'Hem', Icon: Compass },
  convoy: { label: 'Konvoj', Icon: Users },
  logbook: { label: 'Logg', Icon: BookOpen },
};

function CamperBuddyLogo() {
  return (
    <div style={logoWrapStyle}>
      <div style={badgeStyle}>
        <svg
          width="42"
          height="42"
          viewBox="0 0 42 42"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="21" cy="21" r="20" fill="#E3EBDD" />
          <circle cx="21" cy="21" r="19.25" stroke="#C8D7C2" strokeWidth="1.5" />
          <path
            d="M11.5 24.3V18.9C11.5 17.6 12.55 16.55 13.85 16.55H21.7C23.15 16.55 24.4 17.05 25.4 18.05L27.25 19.9H30.1C31.43 19.9 32.5 20.97 32.5 22.3V24.3"
            stroke="#2F5D3A"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11.5 24.3H32.5"
            stroke="#2F5D3A"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="16.3" cy="25.9" r="2.4" stroke="#2F5D3A" strokeWidth="2" />
          <circle cx="27.7" cy="25.9" r="2.4" stroke="#2F5D3A" strokeWidth="2" />
          <path
            d="M15.2 14.2H22.1"
            stroke="#7C9A78"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M28.9 12.4C28.9 14.45 26.1 17.2 26.1 17.2C26.1 17.2 23.3 14.45 23.3 12.4C23.3 10.85 24.55 9.6 26.1 9.6C27.65 9.6 28.9 10.85 28.9 12.4Z"
            fill="#D8C9AE"
            stroke="#2F5D3A"
            strokeWidth="1.5"
          />
          <circle cx="26.1" cy="12.35" r="0.95" fill="#2F5D3A" />
        </svg>
      </div>

      <div style={wordmarkStyle}>
        <div style={wordmarkTopStyle}>camper</div>
        <div style={wordmarkBottomStyle}>BUDDY</div>
      </div>
    </div>
  );
}

function AppHeader({ activeTab = 'home' }) {
  const currentTab = TAB_META[activeTab] || TAB_META.home;
  const CurrentIcon = currentTab.Icon;

  return (
    <header style={headerShellStyle}>
      <div style={headerInnerStyle}>
        <CamperBuddyLogo />

        <div style={sectionPillStyle}>
          <CurrentIcon size={15} strokeWidth={2.2} />
          <span>{currentTab.label}</span>
        </div>
      </div>
    </header>
  );
}

const headerShellStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 2400,
  padding: '12px 14px 10px',
  background:
    'linear-gradient(180deg, rgba(245,242,237,0.96) 0%, rgba(245,242,237,0.90) 70%, rgba(245,242,237,0.00) 100%)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
};

const headerInnerStyle = {
  maxWidth: '920px',
  margin: '0 auto',
  minHeight: '68px',
  borderRadius: '24px',
  padding: '12px 14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '14px',
  background: 'rgba(255,255,255,0.68)',
  border: '1px solid rgba(47,93,58,0.08)',
  boxShadow: '0 8px 24px rgba(34, 52, 37, 0.08)',
};

const logoWrapStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  minWidth: 0,
};

const badgeStyle = {
  width: '48px',
  height: '48px',
  display: 'grid',
  placeItems: 'center',
  borderRadius: '16px',
  background: 'linear-gradient(180deg, #F6F4EF 0%, #ECE6DC 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75)',
  flexShrink: 0,
};

const wordmarkStyle = {
  display: 'flex',
  flexDirection: 'column',
  lineHeight: 1,
  minWidth: 0,
};

const wordmarkTopStyle = {
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#6F8970',
};

const wordmarkBottomStyle = {
  fontSize: '22px',
  fontWeight: 800,
  letterSpacing: '0.04em',
  color: '#2F5D3A',
};

const sectionPillStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexShrink: 0,
  padding: '10px 14px',
  borderRadius: '999px',
  background: '#EEF4EA',
  color: '#2F5D3A',
  fontSize: '13px',
  fontWeight: 700,
  border: '1px solid rgba(47,93,58,0.08)',
};

export default AppHeader;
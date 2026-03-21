import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Trophy,
  Clock,
  Camera,
  Navigation,
  Map as MapIcon,
  Sun,
  Sunrise,
  Sunset,
  Cloud,
} from 'lucide-react';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createPoiIcon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

const singleServiceIcons = {
  parking: createPoiIcon('green'),
  graywater: createPoiIcon('grey'),
  blackwater: createPoiIcon('black'),
  freshwater: createPoiIcon('blue'),
  default: createPoiIcon('gold'),
};

const SERVICE_META = {
  parking: { label: 'Parkering / Sova', color: '#4D8A57' },
  graywater: { label: 'Gråvatten', color: '#7E8A8A' },
  blackwater: { label: 'Svartvatten / Latrin', color: '#36424A' },
  freshwater: { label: 'Färskvatten', color: '#4D93C7' },
};

function normalizePoiCategory(rawCategory) {
  const category = String(rawCategory || 'default').trim().toLowerCase();

  const categoryMap = {
    parking: 'parking',
    parkering: 'parking',
    ställplats: 'parking',
    stallplats: 'parking',
    overnight: 'parking',
    sleep: 'parking',
    sova: 'parking',
    graywater: 'graywater',
    greywater: 'graywater',
    gråvatten: 'graywater',
    gravatten: 'graywater',
    markbrunn: 'graywater',
    blackwater: 'blackwater',
    svartvatten: 'blackwater',
    latrin: 'blackwater',
    cassette: 'blackwater',
    kassett: 'blackwater',
    toilet: 'blackwater',
    wc: 'blackwater',
    waste: 'blackwater',
    freshwater: 'freshwater',
    freshwater_fill: 'freshwater',
    water: 'freshwater',
    vatten: 'freshwater',
    dricksvatten: 'freshwater',
    färskvatten: 'freshwater',
    farskvatten: 'freshwater',
  };

  return categoryMap[category] || category;
}

function buildMultiServiceIcon(serviceKeys) {
  const dots = serviceKeys
    .map(
      (key) => `
        <span
          style="
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: ${SERVICE_META[key]?.color || '#D3B98A'};
            border: 1px solid rgba(255,255,255,0.9);
            box-sizing: border-box;
            display: inline-block;
          "
        ></span>
      `
    )
    .join('');

  const html = `
    <div style="position: relative; width: 34px; height: 44px;">
      <div
        style="
          position: absolute;
          top: 0;
          left: 1px;
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 12%;
          transform: rotate(-45deg);
          background: #ffffff;
          border: 2px solid #47525d;
          box-shadow: 0 3px 8px rgba(0,0,0,0.28);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        "
      >
        <div
          style="
            transform: rotate(45deg);
            display: flex;
            flex-wrap: wrap;
            gap: 2px;
            align-items: center;
            justify-content: center;
            max-width: 18px;
          "
        >
          ${dots}
        </div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: '',
    iconSize: [34, 44],
    iconAnchor: [17, 42],
    popupAnchor: [0, -36],
  });
}

function buildTextBlob(poi) {
  return [poi?.name || '', poi?.category || '', poi?.address || '', poi?.description || '']
    .join(' | ')
    .toLowerCase();
}

function textSuggestsParking(text) {
  return [
    'ställplats',
    'stallplats',
    'parkering',
    'sovplats',
    'vid ställplats',
    'vid stallplats',
    'overnight',
    'husbilsplats',
  ].some((term) => text.includes(term));
}

function textSuggestsGraywater(text) {
  return [
    'markbrunn',
    'gråvatten',
    'gravatten',
    'fast tank',
    'gråvatten tömning',
    'gråvattentömning',
  ].some((term) => text.includes(term));
}

function textSuggestsBlackwater(text) {
  return [
    'kassett',
    'kassettömning',
    'latrin',
    'kemtoa',
    'svartvatten',
    'toatömning',
    'wc-kassett',
  ].some((term) => text.includes(term));
}

function textSuggestsFreshwater(text) {
  return [
    'dricksvatten',
    'färskvatten',
    'farskvatten',
    'vatten',
    'vattenpost',
    'fyllning vatten',
  ].some((term) => text.includes(term));
}

function getPoiServiceFlags(poi, normalizedCategory) {
  const text = buildTextBlob(poi);

  return {
    parking:
      poi?.has_parking === true ||
      normalizedCategory === 'parking' ||
      textSuggestsParking(text),
    graywater:
      poi?.has_graywater === true ||
      normalizedCategory === 'graywater' ||
      textSuggestsGraywater(text),
    blackwater:
      poi?.has_blackwater === true ||
      normalizedCategory === 'blackwater' ||
      textSuggestsBlackwater(text),
    freshwater:
      poi?.has_freshwater === true ||
      normalizedCategory === 'freshwater' ||
      textSuggestsFreshwater(text),
  };
}

function DashboardView({ setActiveTab, onOpenLogbookPhotoFlow }) {
  const [topProposal, setTopProposal] = useState(null);
  const [latestEntry, setLatestEntry] = useState(null);
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [activeFilters, setActiveFilters] = useState({
    parking: true,
    graywater: true,
    blackwater: true,
    freshwater: true,
  });

  const [weather, setWeather] = useState({
    temp: '--',
    sunrise: '--:--',
    sunset: '--:--',
    icon: <Sun size={18} color="#D8A826" />,
  });

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      const { data: propsData } = await supabase.from('proposals').select('*');
      if (propsData?.length > 0) {
        setTopProposal(
          [...propsData].sort((a, b) => (b.votes_up || 0) - (a.votes_up || 0))[0]
        );
      }

      const { data: logData } = await supabase
        .from('logbook')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (logData?.length > 0) {
        setLatestEntry(logData[0]);
      }

      const { data: poiData } = await supabase.from('pois').select('*').limit(500);
      setPois(Array.isArray(poiData) ? poiData : []);

      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=59.61&longitude=16.54&current=temperature_2m,weather_code&daily=sunrise,sunset&timezone=auto'
      );
      const data = await res.json();
      const timeConfig = { hour: '2-digit', minute: '2-digit' };

      setWeather({
        temp: Math.round(data?.current?.temperature_2m ?? 0),
        sunrise: data?.daily?.sunrise?.[0]
          ? new Date(data.daily.sunrise[0]).toLocaleTimeString('sv-SE', timeConfig)
          : '--:--',
        sunset: data?.daily?.sunset?.[0]
          ? new Date(data.daily.sunset[0]).toLocaleTimeString('sv-SE', timeConfig)
          : '--:--',
        icon:
          (data?.current?.weather_code ?? 0) > 3 ? (
            <Cloud size={18} color="#8D9998" />
          ) : (
            <Sun size={18} color="#D8A826" />
          ),
      });
    } catch (error) {
      console.error('Fel i dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const validPois = useMemo(() => {
    return pois
      .map((poi) => {
        const lat = Number(poi?.latitude);
        const lng = Number(poi?.longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const normalizedCategory = normalizePoiCategory(poi?.category);
        const serviceFlags = getPoiServiceFlags(poi, normalizedCategory);

        return {
          ...poi,
          lat,
          lng,
          normalizedCategory,
          serviceFlags,
        };
      })
      .filter(Boolean);
  }, [pois]);

  const selectedFilterKeys = useMemo(() => {
    return Object.entries(activeFilters)
      .filter(([, isActive]) => isActive)
      .map(([key]) => key);
  }, [activeFilters]);

  const filteredPois = useMemo(() => {
    if (selectedFilterKeys.length === 0) return [];
    return validPois.filter((poi) =>
      selectedFilterKeys.some((key) => poi.serviceFlags[key])
    );
  }, [validPois, selectedFilterKeys]);

  const toggleFilter = (key) => {
    setActiveFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAllFilters = () => {
    setActiveFilters({
      parking: true,
      graywater: true,
      blackwater: true,
      freshwater: true,
    });
  };

  const clearAllFilters = () => {
    setActiveFilters({
      parking: false,
      graywater: false,
      blackwater: false,
      freshwater: false,
    });
  };

  const getMarkerIconForPoi = (poi) => {
    const matchingServices = selectedFilterKeys.filter((key) => poi.serviceFlags[key]);

    if (matchingServices.length === 1) {
      return singleServiceIcons[matchingServices[0]] || singleServiceIcons.default;
    }

    if (matchingServices.length > 1) {
      return buildMultiServiceIcon(matchingServices);
    }

    const fallbackServices = Object.entries(poi.serviceFlags)
      .filter(([, value]) => value)
      .map(([key]) => key);

    if (fallbackServices.length === 1) {
      return singleServiceIcons[fallbackServices[0]] || singleServiceIcons.default;
    }

    if (fallbackServices.length > 1) {
      return buildMultiServiceIcon(fallbackServices);
    }

    return singleServiceIcons.default;
  };

  const getServiceEntries = (poi) => {
    return Object.entries(poi.serviceFlags)
      .filter(([, value]) => value)
      .map(([key]) => ({
        key,
        label: SERVICE_META[key]?.label || key,
        color: SERVICE_META[key]?.color || '#D3B98A',
      }));
  };

  if (loading) {
    return (
      <div style={loadingStateStyle}>
        Startar systemet...
      </div>
    );
  }

  return (
    <>
      <div style={{ padding: '10px 20px 100px 20px' }} className="animate-fade-in">
        <div style={weatherCardStyle}>
          <div style={weatherRowStyle}>
            <div style={weatherItemStyle}>
              {weather.icon} <b>{weather.temp}°C</b>
            </div>
            <div style={weatherItemStyle}>
              <Sunrise size={14} color="#CF651F" /> {weather.sunrise}
            </div>
            <div style={weatherItemStyle}>
              <Sunset size={14} color="#2F5D3A" /> {weather.sunset}
            </div>
          </div>
        </div>

        <div style={mapContainerStyle}>
          <MapContainer
            center={[59.61, 16.54]}
            zoom={11}
            style={{ height: '100%', width: '100%', borderRadius: '22px' }}
            zoomControl={false}
          >
            {/* ELLER för Satellitkarta (Hybrid) */}
{/* För vanlig karta (Roadmap) */}
<TileLayer 
  url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
  subdomains={['mt0','mt1','mt2','mt3']}
  attribution="&copy; Google Maps"
/>

            {filteredPois.map((poi) => (
              <Marker
                key={poi.id}
                position={[poi.lat, poi.lng]}
                icon={getMarkerIconForPoi(poi)}
              >
                <Popup>
                  <div style={{ minWidth: '170px' }}>
                    <strong style={{ color: '#2F5D3A', fontSize: '14px' }}>
                      {poi.name || 'Namnlös plats'}
                    </strong>

                    <hr
                      style={{
                        margin: '8px 0',
                        border: '0',
                        borderTop: '1px solid #E6E2D9',
                      }}
                    />

                    <p
                      style={{
                        fontSize: '11px',
                        margin: '0 0 10px 0',
                        color: '#667276',
                        lineHeight: '1.4',
                      }}
                    >
                      {poi.description || poi.address || 'Ingen beskrivning'}
                    </p>

                    <div style={popupServicesWrapStyle}>
                      {getServiceEntries(poi).map((service) => (
                        <div key={service.key} style={popupServiceRowStyle}>
                          <span
                            style={{
                              ...popupServiceDotStyle,
                              backgroundColor: service.color,
                            }}
                          ></span>
                          <span>{service.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          <div
            style={legendButtonStyle}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowFilterModal(true);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            role="button"
            tabIndex={0}
            aria-label="Öppna filter för POIs"
          >
            <div style={legendItem}>
              <span style={{ ...dot, backgroundColor: '#4D8A57' }}></span> Parkering / Sova
            </div>
            <div style={legendItem}>
              <span style={{ ...dot, backgroundColor: '#7E8A8A' }}></span> Gråvatten
            </div>
            <div style={legendItem}>
              <span style={{ ...dot, backgroundColor: '#36424A' }}></span> Svartvatten
            </div>
            <div style={legendItem}>
              <span style={{ ...dot, backgroundColor: '#4D93C7' }}></span> Färskvatten
            </div>
          </div>
        </div>

        <div style={summaryGridStyle}>
          <div style={smallSectionStyle} onClick={() => setActiveTab('convoy')}>
            <div style={sectionHeaderStyle}>
              <Trophy size={14} color="#D8A826" /> MIN KONVOJ VILL ÅKA HIT
            </div>
            <div style={miniCardStyle}>
              <h4 style={miniTitleStyle}>{topProposal?.name || 'Ingen rutt'}</h4>
            </div>
          </div>

          <div style={smallSectionStyle} onClick={() => setActiveTab('logbook')}>
            <div style={sectionHeaderStyle}>
              <Clock size={14} color="#4D93C7" /> LOGGBOKEN
            </div>
            <div style={miniCardStyle}>
              <h4 style={miniTitleStyle}>{latestEntry?.location || 'Inga minnen'}</h4>
            </div>
          </div>
        </div>

        <h3 style={shortcutTitleStyle}>Genvägar</h3>

        <div style={shortcutGridStyle}>
          <button style={actionBtnStyle} onClick={() => setActiveTab('convoy')}>
            <MapIcon size={24} color="#2F5D3A" />
            <span style={btnLabelStyleLong}>Vad tipsar mina Buddies om?</span>
          </button>

          <button style={actionBtnStyle} onClick={onOpenLogbookPhotoFlow}>
            <Camera size={24} color="#4D93C7" />
            <span style={btnLabelStyle}>Ta en bild till Loggboken</span>
          </button>

          <button style={actionBtnStyle} onClick={() => alert('Sökfunktion kommer!')}>
            <Navigation size={24} color="#CF651F" />
            <span style={btnLabelStyle}>Hitta</span>
          </button>
        </div>
      </div>

      {showFilterModal && (
        <div style={modalOverlayStyle} onClick={() => setShowFilterModal(false)}>
          <div style={modalSheetStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHandleStyle}></div>

            <h3 style={modalTitleStyle}>Filtrera POIs</h3>
            <p style={modalTextStyle}>Välj vilka tjänster som ska visas på kartan.</p>

            <div style={filterListStyle}>
              <button
                type="button"
                onClick={() => toggleFilter('parking')}
                style={{
                  ...filterOptionStyle,
                  ...(activeFilters.parking ? filterOptionActiveStyle : {}),
                }}
              >
                <span style={{ ...filterDotStyle, backgroundColor: '#4D8A57' }}></span>
                Parkering / Sova
              </button>

              <button
                type="button"
                onClick={() => toggleFilter('graywater')}
                style={{
                  ...filterOptionStyle,
                  ...(activeFilters.graywater ? filterOptionActiveStyle : {}),
                }}
              >
                <span style={{ ...filterDotStyle, backgroundColor: '#7E8A8A' }}></span>
                Gråvatten
              </button>

              <button
                type="button"
                onClick={() => toggleFilter('blackwater')}
                style={{
                  ...filterOptionStyle,
                  ...(activeFilters.blackwater ? filterOptionActiveStyle : {}),
                }}
              >
                <span style={{ ...filterDotStyle, backgroundColor: '#36424A' }}></span>
                Svartvatten
              </button>

              <button
                type="button"
                onClick={() => toggleFilter('freshwater')}
                style={{
                  ...filterOptionStyle,
                  ...(activeFilters.freshwater ? filterOptionActiveStyle : {}),
                }}
              >
                <span style={{ ...filterDotStyle, backgroundColor: '#4D93C7' }}></span>
                Färskvatten
              </button>
            </div>

            <div style={modalActionsStyle}>
              <button type="button" onClick={clearAllFilters} style={secondaryModalBtnStyle}>
                Rensa
              </button>

              <button type="button" onClick={selectAllFilters} style={secondaryModalBtnStyle}>
                Alla
              </button>

              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                style={primaryModalBtnStyle}
              >
                Klar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const loadingStateStyle = {
  textAlign: 'center',
  marginTop: '50px',
  color: '#8B9798',
};

const weatherCardStyle = {
  background: '#F7F4EE',
  border: '1px solid #E8E1D6',
  borderRadius: '20px',
  padding: '12px 16px',
  boxShadow: '0 8px 22px rgba(0,0,0,0.04)',
  marginBottom: '14px',
};

const weatherRowStyle = {
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '18px',
  color: '#667276',
  fontSize: '13px',
  flexWrap: 'wrap',
};

const weatherItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
};

const mapContainerStyle = {
  height: '280px',
  width: '100%',
  borderRadius: '28px',
  overflow: 'hidden',
  marginBottom: '25px',
  position: 'relative',
  boxShadow: '0 10px 26px rgba(0,0,0,0.08)',
  border: '5px solid #F9F7F2',
};

const legendButtonStyle = {
  position: 'absolute',
  bottom: '15px',
  left: '15px',
  zIndex: 2000,
  backgroundColor: 'rgba(250,249,246,0.96)',
  padding: '12px 14px',
  borderRadius: '18px',
  fontSize: '11px',
  display: 'flex',
  flexDirection: 'column',
  gap: '7px',
  boxShadow: '0 6px 18px rgba(0,0,0,0.10)',
  cursor: 'pointer',
  textAlign: 'left',
  pointerEvents: 'auto',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
  border: '1px solid #E5DED2',
};

const legendItem = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontWeight: 'bold',
  color: '#334247',
};

const dot = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
};

const summaryGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '15px',
  marginBottom: '25px',
};

const smallSectionStyle = {
  cursor: 'pointer',
};

const sectionHeaderStyle = {
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#98A4A5',
  marginBottom: '7px',
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const miniCardStyle = {
  backgroundColor: '#FAF9F6',
  padding: '14px 14px',
  borderRadius: '20px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
  minHeight: '44px',
  display: 'flex',
  alignItems: 'center',
  border: '1px solid #EEE7DB',
};

const miniTitleStyle = {
  margin: 0,
  fontSize: '14px',
  color: '#243137',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const shortcutTitleStyle = {
  fontSize: '16px',
  marginBottom: '15px',
  color: '#243137',
};

const shortcutGridStyle = {
  display: 'flex',
  gap: '15px',
};

const actionBtnStyle = {
  flex: 1,
  backgroundColor: '#FAF9F6',
  border: '1px solid #EEE7DB',
  padding: '18px 15px',
  borderRadius: '24px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  cursor: 'pointer',
  minHeight: '112px',
};

const btnLabelStyle = {
  fontSize: '12px',
  fontWeight: 'bold',
  color: '#667276',
  textAlign: 'center',
  lineHeight: '1.35',
};

const btnLabelStyleLong = {
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#667276',
  textAlign: 'center',
  lineHeight: '1.35',
};

const popupServicesWrapStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  marginTop: '2px',
};

const popupServiceRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#334247',
  lineHeight: '1.3',
};

const popupServiceDotStyle = {
  width: '9px',
  height: '9px',
  borderRadius: '50%',
  flexShrink: 0,
};

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 3000,
  backgroundColor: 'rgba(24, 29, 26, 0.42)',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
};

const modalSheetStyle = {
  width: '100%',
  maxWidth: '520px',
  backgroundColor: '#FAF9F6',
  borderTopLeftRadius: '26px',
  borderTopRightRadius: '26px',
  padding: '14px 18px 22px 18px',
  boxShadow: '0 -8px 30px rgba(0,0,0,0.18)',
};

const modalHandleStyle = {
  width: '46px',
  height: '5px',
  borderRadius: '999px',
  backgroundColor: '#D5D8D1',
  margin: '0 auto 14px auto',
};

const modalTitleStyle = {
  margin: '0 0 6px 0',
  fontSize: '18px',
  color: '#243137',
};

const modalTextStyle = {
  margin: '0 0 16px 0',
  fontSize: '13px',
  color: '#667276',
  lineHeight: '1.5',
};

const filterListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const filterOptionStyle = {
  width: '100%',
  border: '1px solid #E6DED1',
  backgroundColor: '#F7F4EE',
  borderRadius: '16px',
  padding: '14px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#334247',
  cursor: 'pointer',
};

const filterOptionActiveStyle = {
  border: '2px solid #2F5D3A',
  backgroundColor: '#EEF3EA',
};

const filterDotStyle = {
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  flexShrink: 0,
};

const modalActionsStyle = {
  display: 'flex',
  gap: '10px',
  marginTop: '18px',
};

const secondaryModalBtnStyle = {
  flex: 1,
  border: '1px solid #DDD6CA',
  backgroundColor: '#ECE9E1',
  color: '#4E5A5D',
  borderRadius: '16px',
  padding: '14px 14px',
  fontSize: '14px',
  fontWeight: 'bold',
  cursor: 'pointer',
};

const primaryModalBtnStyle = {
  flex: 1.3,
  border: 'none',
  backgroundColor: '#2F6927',
  color: '#FFF',
  borderRadius: '16px',
  padding: '14px 14px',
  fontSize: '14px',
  fontWeight: 'bold',
  cursor: 'pointer',
};

export default DashboardView;
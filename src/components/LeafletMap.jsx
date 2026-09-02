import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip, GeoJSON, ZoomControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useWardGeoJSON } from '../lib/useWardGeoJSON'
import { RISK_BANDS, COLORS } from '../lib/theme'

const PUNE_CENTER = [18.53, 73.86]

function FitToWards({ wards }) {
  const map = useMap()
  useEffect(() => {
    if (!wards || wards.length === 0) return
    if (wards.length === 1) {
      map.setView(wards[0].coordinates, 13)
      return
    }
    const bounds = L.latLngBounds(wards.map((w) => w.coordinates))
    map.fitBounds(bounds, { padding: [48, 48] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wards.map((w) => w.id).join(',')])
  return null
}

const iconCache = new Map()
function wardIcon(band, selected) {
  const key = `${band}-${selected ? '1' : '0'}`
  if (iconCache.has(key)) return iconCache.get(key)
  const color = RISK_BANDS[band]?.color ?? COLORS.slateSoft
  const pulse = band === 'High' ? `<span class="ab-pulse" style="background:${color}"></span>` : ''
  const icon = L.divIcon({
    className: '',
    html: `<span class="ab-marker${selected ? ' ab-marker--selected' : ''}" style="color:${color}">${pulse}<span class="ab-dot" style="background:${color}"></span></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -12],
  })
  iconCache.set(key, icon)
  return icon
}

const boundaryStyle = {
  color: COLORS.navyLine,
  weight: 1,
  opacity: 0.5,
  fillColor: COLORS.mist,
  fillOpacity: 0.25,
}

/**
 * Shared map shell for the Citizen and Dispatch apps. Ward markers are
 * plotted at the exact lat/lon in aerobin_data.json and colour-coded by
 * risk band; the admin-ward GeoJSON is a subtle city-context layer only
 * (see useWardGeoJSON for why it isn't highlighted per-ward).
 */
export function LeafletMap({
  wards,
  selectedWardId,
  onSelectWard,
  renderPopup,
  renderTooltip,
  legend = true,
  className = '',
  scrollWheelZoom = true,
}) {
  const geo = useWardGeoJSON()

  const legendItems = useMemo(
    () => [
      { band: 'High', label: 'High risk (≥ 70)' },
      { band: 'Medium', label: 'Medium (40–69)' },
      { band: 'Low', label: 'Low (< 40)' },
    ],
    []
  )

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={PUNE_CENTER}
        zoom={12}
        zoomControl={false}
        scrollWheelZoom={scrollWheelZoom}
        className="h-full w-full"
        style={{ background: '#e6e9e8' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />

        {geo.status === 'ready' && (
          <GeoJSON data={geo.data} style={boundaryStyle} interactive={false} />
        )}

        {wards.map((ward) => (
          <Marker
            key={ward.id}
            position={ward.coordinates}
            icon={wardIcon(ward.band, ward.id === selectedWardId)}
            eventHandlers={{ click: () => onSelectWard?.(ward.id) }}
          >
            {renderPopup && <Popup minWidth={260} maxWidth={320}>{renderPopup(ward)}</Popup>}
            {renderTooltip && (
              <Tooltip direction="top" offset={[0, -14]} opacity={1}>
                {renderTooltip(ward)}
              </Tooltip>
            )}
          </Marker>
        ))}

        <FitToWards wards={wards} />
      </MapContainer>

      {geo.status === 'error' && (
        <div className="absolute left-3 top-3 z-[500] max-w-xs rounded-lg bg-white px-3 py-2 text-xs text-slate shadow">
          Ward boundary layer couldn't load ({geo.error}). Markers are still shown using their
          own coordinates.
        </div>
      )}

      {legend && (
        <div className="absolute bottom-3 left-3 z-[500] rounded-xl bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
          <ul className="flex flex-col gap-1">
            {legendItems.map((item) => (
              <li key={item.band} className="flex items-center gap-2 text-xs font-medium text-navy">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: RISK_BANDS[item.band].color }}
                  aria-hidden
                />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

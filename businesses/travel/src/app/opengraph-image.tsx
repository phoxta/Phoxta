import { ImageResponse } from 'next/og'

export const alt = 'Soar - Book stays, flights, cars & experiences'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0EA5E9 0%, #0369A1 100%)',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32" fill="none">
          <path d="M27 6L5 14.5l6.5 3.2L24 9.5 14 19.5v6L17.5 21l5 2.5L27 6Z" fill="#fff" />
        </svg>
        <div style={{ fontSize: 96, fontWeight: 700, marginTop: 24 }}>Soar</div>
        <div style={{ fontSize: 36, marginTop: 16, opacity: 0.9 }}>
          Book stays, flights, cars & experiences
        </div>
      </div>
    ),
    size
  )
}

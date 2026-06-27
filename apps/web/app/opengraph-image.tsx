import { ImageResponse } from 'next/og';
import { logoBase64 } from './logo-base64';

export const runtime = 'edge';

export const alt = 'Selixes - Sovereign AI Reliability & Cost Gateway';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'radial-gradient(circle at center, #1e1b4b 0%, #030712 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '80px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Subtle glowing dots decoration */}
        <div
          style={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '150px',
            height: '150px',
            background: 'rgba(99, 102, 241, 0.15)',
            borderRadius: '50%',
            filter: 'blur(50px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            right: '10%',
            width: '200px',
            height: '200px',
            background: 'rgba(139, 92, 246, 0.12)',
            borderRadius: '50%',
            filter: 'blur(60px)',
          }}
        />

        {/* Sovereign Badge Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            padding: '8px 20px',
            borderRadius: '999px',
            marginBottom: '30px',
          }}
        >
          <img src={logoBase64} width="20" height="20" alt="Selixes Icon" />
          <span
            style={{
              fontSize: '14px',
              fontWeight: 'bold',
              letterSpacing: '0.1em',
              color: '#c7d2fe',
              textTransform: 'uppercase',
            }}
          >
            Sovereign AI Infrastructure Layer
          </span>
        </div>

        {/* Brand Name */}
        <h1
          style={{
            fontSize: '84px',
            fontWeight: 900,
            color: '#ffffff',
            margin: '0 0 20px 0',
            letterSpacing: '-0.04em',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <img src={logoBase64} width="96" height="96" alt="Selixes Logo" />
          <span>Selixes</span>
        </h1>

        {/* Subtitle / Tagline */}
        <p
          style={{
            fontSize: '28px',
            color: '#94a3b8',
            maxWidth: '850px',
            textAlign: 'center',
            lineHeight: 1.5,
            margin: '0 0 40px 0',
          }}
        >
          Neutral reliability gateway proxy for AI-native workloads. Dynamic provider failovers, recursive loop protection, and 100% data sovereignty.
        </p>

        {/* Telemetry Stats Bar */}
        <div
          style={{
            display: 'flex',
            gap: '40px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '30px',
            width: '100%',
            justifyContent: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#818cf8', fontSize: '14px', textTransform: 'uppercase', fontWeight: 'bold' }}>Failover Speed</span>
            <span style={{ color: '#ffffff', fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>&lt; 15ms</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#818cf8', fontSize: '14px', textTransform: 'uppercase', fontWeight: 'bold' }}>Reasoning Budget</span>
            <span style={{ color: '#ffffff', fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>Autonomic Capping</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#818cf8', fontSize: '14px', textTransform: 'uppercase', fontWeight: 'bold' }}>Data Sovereignty</span>
            <span style={{ color: '#ffffff', fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>100% Private VPC</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

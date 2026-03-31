/**
 * DownloadToast.jsx
 *
 * Global floating toast that shows all active / completed / failed report
 * downloads. Mounts once at the app root and persists across navigation.
 * Subscribes to reportDownloadManager — receives updates whenever any
 * download's status changes.
 */
import { useState, useEffect } from 'react';
import reportDownloadManager from '../services/reportDownloadManager';

const STATUS_CFG = {
  active: {
    icon:  null,          
    bg:    '#1F4E79',
    bar:   '#2E75B6',
    label: 'Generating…',
  },
  done: {
    icon:  '✓',
    bg:    '#14532d',
    bar:   '#22c55e',
    label: 'Ready — saved to Downloads',
  },
  failed: {
    icon:  '✕',
    bg:    '#7f1d1d',
    bar:   '#ef4444',
    label: null,          
  },
};

function Toast({ item, onDismiss }) {
  const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.active;

  return (
    <div
      style={{
        background:   cfg.bg,
        borderRadius: 10,
        padding:      '10px 14px',
        marginBottom: 8,
        minWidth:     280,
        maxWidth:     360,
        boxShadow:    '0 4px 16px rgba(0,0,0,0.3)',
        display:      'flex',
        alignItems:   'center',
        gap:          10,
        color:        '#fff',
        fontSize:     13,
        fontFamily:   'Tahoma, sans-serif',
        position:     'relative',
        overflow:     'hidden',
      }}
    >
      {/* Status icon / spinner */}
      <div style={{ flexShrink: 0, width: 20, textAlign: 'center' }}>
        {item.status === 'active' ? (
          <span
            style={{
              display:      'inline-block',
              width:        14,
              height:       14,
              border:       '2px solid rgba(255,255,255,0.4)',
              borderTop:    '2px solid #fff',
              borderRadius: '50%',
              animation:    'rdm-spin 0.7s linear infinite',
            }}
          />
        ) : (
          <span style={{ fontWeight: 700 }}>{cfg.icon}</span>
        )}
      </div>

      {/* Text */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            fontWeight:   600,
            whiteSpace:   'nowrap',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.label}
        </div>
        <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>
          {item.status === 'failed'
            ? item.error
            : cfg.label}
        </div>
      </div>

      {/* Dismiss button (always visible) */}
      <button
        onClick={() => onDismiss(item.key)}
        style={{
          background:   'none',
          border:       'none',
          color:        'rgba(255,255,255,0.6)',
          cursor:       'pointer',
          fontSize:     16,
          lineHeight:   1,
          padding:      '0 2px',
          flexShrink:   0,
        }}
        title="Dismiss"
      >
        ×
      </button>

      {/* Animated bottom bar for active state */}
      {item.status === 'active' && (
        <div
          style={{
            position:   'absolute',
            bottom:     0,
            left:       0,
            height:     3,
            background: cfg.bar,
            animation:  'rdm-bar 1.8s ease-in-out infinite',
          }}
        />
      )}
    </div>
  );
}

export default function DownloadToast() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const handler = (snapshot) => setItems([...snapshot]);
    reportDownloadManager.subscribe(handler);
    return () => reportDownloadManager.unsubscribe(handler);
  }, []);

  if (items.length === 0) return null;

  return (
    <>
      {/* Keyframe injection (once) */}
      <style>{`
        @keyframes rdm-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes rdm-bar {
          0%   { width: 10%; opacity: 1; }
          50%  { width: 80%; opacity: 0.9; }
          100% { width: 10%; opacity: 1; }
        }
      `}</style>

      {/* Toast stack — fixed bottom-right */}
      <div
        style={{
          position:  'fixed',
          bottom:    24,
          right:     24,
          zIndex:    9999,
          display:   'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          pointerEvents: 'none',  // let clicks through except on toasts
        }}
      >
        {items.map((item) => (
          <div key={item.key} style={{ pointerEvents: 'auto' }}>
            <Toast item={item} onDismiss={(k) => reportDownloadManager.dismiss(k)} />
          </div>
        ))}
      </div>
    </>
  );
}

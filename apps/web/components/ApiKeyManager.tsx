'use client';

import { useState, useEffect } from 'react';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  status: string;
  createdAt: string;
}

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [newKeyRevealed, setNewKeyRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/keys`, {
        headers: {
          'Authorization': 'Bearer bypass-token-selixes',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch API keys');
      const data = await res.json();
      setKeys(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading keys.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    if (!keyName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer bypass-token-selixes',
        },
        body: JSON.stringify({ name: keyName }),
      });
      if (!res.ok) throw new Error('Failed to generate key');
      const data = await res.json();
      setNewKeyRevealed(data.key);
      setKeyName('');
      fetchKeys();
    } catch (err: any) {
      setError(err.message || 'Failed to create key.');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevokeKey(id: string) {
    if (!confirm('Are you sure you want to revoke this API key? Any applications currently using it will be blocked immediately.')) return;
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/keys/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer bypass-token-selixes',
        },
      });
      if (!res.ok) throw new Error('Failed to revoke API key');
      fetchKeys();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke key.');
    }
  }

  function handleCopy() {
    if (!newKeyRevealed) return;
    navigator.clipboard.writeText(newKeyRevealed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function maskKey(keyStr: string) {
    if (!keyStr) return '';
    const last4 = keyStr.substring(keyStr.length - 4);
    return `selixes_live_••••••••••••${last4}`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
      
      {/* Management Card */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--bg-border)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div className="mobile-flex-col mobile-gap-1" style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--bg-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Selixes Gateways Keys</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Create and manage keys to authenticate with your outage-proof gateway endpoints.
            </p>
          </div>
        </div>

        {error && (
          <div style={{
            margin: '1rem 1.5rem 0',
            padding: '0.75rem 1rem',
            background: 'var(--danger-bg)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '8px',
            color: 'var(--danger)',
            fontSize: '0.8125rem'
          }}>
            {error}
          </div>
        )}

        <div style={{ padding: '1.5rem' }}>
          {/* Key Creation Form */}
          <form onSubmit={handleCreateKey} className="mobile-flex-col" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="e.g. Production Web Client"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              disabled={creating}
              style={{
                flex: 1,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--bg-border)',
                borderRadius: '8px',
                padding: '0.625rem 1rem',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--bg-border)'}
            />
            <button
              type="submit"
              disabled={creating || !keyName.trim()}
              className="btn-primary"
              style={{
                fontSize: '0.8125rem',
                padding: '0.625rem 1.25rem',
                opacity: (creating || !keyName.trim()) ? 0.6 : 1,
                cursor: (creating || !keyName.trim()) ? 'not-allowed' : 'pointer'
              }}
            >
              {creating ? 'Generating…' : 'Generate API Key'}
            </button>
          </form>

          {/* Key list */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="skeleton" style={{ height: '50px', width: '100%' }} />
              <div className="skeleton" style={{ height: '50px', width: '100%' }} />
            </div>
          ) : keys.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              border: '1px dashed var(--bg-border)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem'
            }}>
              No active API keys found. Generate a key above to start securing your gateway endpoints.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--bg-border)', borderRadius: '8px', overflow: 'hidden' }}>
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="mobile-flex-col mobile-gap-1"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.875rem 1.25rem',
                    borderBottom: '1px solid var(--bg-border-muted)',
                    background: 'var(--bg-surface)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{key.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <code style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {maskKey(key.key)}
                      </code>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: 'var(--success)',
                        background: 'var(--success-bg)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                      }}>
                        {key.status}
                      </span>
                    </div>
                  </div>
                  <div className="mobile-flex-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Created {new Date(key.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleRevokeKey(key.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--danger)',
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--danger-bg)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Key Reveal Modal */}
      {newKeyRevealed && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '1.5rem'
        }}>
          <div className="glass fade-up" style={{
            width: '100%',
            maxWidth: '520px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--bg-border)',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 50px var(--accent-glow)'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
              🔑 Your Selixes Gateway Key
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--warning)', background: 'var(--warning-bg)', border: '1px solid rgba(245,158,11,0.2)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              <strong>Important:</strong> Copy this API key now. For security purposes, we only display it once. You will not be able to retrieve it again.
            </p>

            <div style={{
              display: 'flex',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--bg-border)',
              borderRadius: '8px',
              overflow: 'hidden',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <code style={{
                flex: 1,
                fontSize: '0.8125rem',
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                padding: '0.75rem 1rem',
                overflowX: 'auto',
                whiteSpace: 'nowrap'
              }}>
                {newKeyRevealed}
              </code>
              <button
                onClick={handleCopy}
                style={{
                  background: copied ? 'var(--success)' : 'var(--accent)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  flexShrink: 0
                }}
              >
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setNewKeyRevealed(null)}
                className="btn-ghost"
                style={{ fontSize: '0.8125rem', padding: '0.5rem 1.5rem' }}
              >
                Close & Proceed
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

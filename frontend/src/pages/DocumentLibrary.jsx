import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Link } from 'react-router-dom';
import { generateThumbnail } from '../utils/thumbnailGenerator.js';
import PixelSnow from './PixelSnow.jsx';

export default function DocumentLibrary() {
  const [docs, setDocs] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [title, setTitle] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [tab, setTab] = useState('all'); // 'all' | 'public' | 'private'
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(currentTheme);

    const observer = new MutationObserver(() => {
      const updatedTheme = document.documentElement.getAttribute('data-theme') || 'light';
      setTheme(updatedTheme);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  const isDark = theme === 'dark';
  const snowColor = isDark ? '#ffffff' : '#38293F';

  const [bgDisabled, setBgDisabled] = useState(() => localStorage.getItem('disableBgAnimation') === 'true');

  useEffect(() => {
    const handleToggle = () => {
      setBgDisabled(localStorage.getItem('disableBgAnimation') === 'true');
    };
    window.addEventListener('bgAnimationToggled', handleToggle);
    return () => window.removeEventListener('bgAnimationToggled', handleToggle);
  }, []);

  const loadDocuments = () => {
    api
      .get('/api/public/documents')
      .then(res => {
        const data = res?.data;
        setDocs(Array.isArray(data) ? data : []);
      })
      .catch(() => setDocs([]));
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    let result = docs;

    // Filter by tab
    if (tab === 'public') {
      result = result.filter(d => !d.isPrivate);
    } else if (tab === 'private') {
      result = result.filter(d => d.isPrivate);
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => d.title.toLowerCase().includes(q));
    }

    setFilteredDocs(result);
  }, [docs, tab, searchQuery]);

  const createDoc = async (e) => {
    e.preventDefault();
    if (!title.trim() || !user) return;
    setCreating(true);
    try {
      // Create empty editor content structure (json blocks format) for BlockNote
      const defaultContent = JSON.stringify([{ type: 'paragraph', content: '' }]);
      
      // Generate initial blank thumbnail preview
      const initialThumbnail = await generateThumbnail(defaultContent);
      
      const res = await api.post('/api/documents', { 
        title: title.trim(), 
        isPrivate 
      });
      
      const newDoc = res?.data;
      if (newDoc && newDoc._id) {
        // Upload thumbnail
        await api.post(`/api/documents/${newDoc._id}/content`, {
          content: defaultContent,
          thumbnail: initialThumbnail || ''
        });
        
        newDoc.thumbnail = initialThumbnail;
        setDocs(prev => [newDoc, ...prev]);
      }
      
      setTitle('');
      setIsPrivate(false);
    } catch (err) {
      console.error('Error creating document:', err);
    } finally {
      setCreating(false);
    }
  };

  const requestAccess = async (id) => {
    if (!user) return;
    try {
      const res = await api.post(`/api/documents/${id}/request-access`);
      const status = res.data?.status;
      if (status === 'requested') {
        setFeedback(prev => ({ ...prev, [id]: 'Access requested' }));
      } else if (status === 'already-requested') {
        setFeedback(prev => ({ ...prev, [id]: 'Already requested' }));
      } else if (status === 'already-collaborator') {
        setFeedback(prev => ({ ...prev, [id]: 'You have access' }));
      }
    } catch {
      setFeedback(prev => ({ ...prev, [id]: 'Failed' }));
    }
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', minHeight: 'calc(100vh - 72px)', width: '100%' }}>
      {!bgDisabled && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <PixelSnow
            color={snowColor}
            flakeSize={0.01}
            minFlakeSize={1.25}
            pixelResolution={180}
            speed={1.0}
            density={0.15}
            direction={125}
            brightness={1}
            variant="snowflake"
          />
        </div>
      )}

      <div className="container library fade-in" style={{ position: 'relative', zIndex: 1 }}>
      <div className="lib-hero glass">
        <div className="lib-art" aria-hidden="true">
          <div className="shape s1" />
          <div className="shape s2" />
          <div className="shape s3" />
        </div>
        <div className="lib-copy">
          <h2>Workspace Library</h2>
          <p className="item-meta" style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
            Create, collaborate, and manage your structured docs in real-time.
          </p>
        </div>
      </div>

      {/* Toolbar: Live Search + Tabs */}
      <div className="lib-toolbar">
        <div className="lib-search-wrapper">
          <svg className="lib-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            className="lib-search-input" 
            placeholder="Search documents by title..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="tabs" style={{ display: 'inline-flex', margin: 0 }}>
          <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
            All Docs
          </button>
          <button className={`tab ${tab === 'public' ? 'active' : ''}`} onClick={() => setTab('public')}>
            Public
          </button>
          {user && (
            <button className={`tab ${tab === 'private' ? 'active' : ''}`} onClick={() => setTab('private')}>
              Private
            </button>
          )}
        </div>
      </div>

      {/* New Document creation block */}
      {user ? (
        <div className="card glass mb-24 slide-up" style={{ padding: '1.25rem 1.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>Create New Document</h3>
          <form className="form-row" onSubmit={createDoc} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input 
              className="input" 
              placeholder="What's the title of the new document?" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              style={{ flex: 1, minWidth: '240px', padding: '0.55rem 0.75rem' }}
              required
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label className="form-row" style={{ margin: 0, gap: '0.375rem', cursor: 'pointer', userSelect: 'none', fontSize: '0.875rem', fontWeight: '500' }}>
                <input 
                  type="checkbox" 
                  checked={isPrivate} 
                  onChange={e => setIsPrivate(e.target.checked)}
                  style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                />
                <span>Keep Private</span>
              </label>
            </div>
            <button type="submit" className="btn btn-primary" disabled={creating || !title.trim()}>
              {creating ? 'Creating...' : 'Create Document'}
            </button>
          </form>
        </div>
      ) : (
        <div className="card mb-24" style={{ textAlign: 'center', background: 'var(--bg-secondary)', border: 'none', padding: '1.25rem' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Please <Link to="/login" style={{ fontWeight: '600', color: 'var(--accent)' }}>login</Link> to create and collaborate on documents.
          </p>
        </div>
      )}

      {/* Docs Grid */}
      {filteredDocs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border)' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>No documents found matching this criteria.</p>
        </div>
      ) : (
        <div className="cards-grid slide-up">
          {filteredDocs.map(d => {
            const hasAccess = user && (d.owner?.id === user._id || d.collaborators?.some(c => c.id === user._id));
            return (
              <div className="doc-card" key={d._id}>
                <div className="doc-thumb">
                  {d.thumbnail ? (
                    <img src={d.thumbnail} alt={d.title} className="doc-thumb-img" />
                  ) : (
                    <div className="gradient-thumb-placeholder">
                      <span className="gradient-thumb-icon">📄</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', padding: '0 0.5rem', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '90%' }}>
                        {d.title}
                      </span>
                    </div>
                  )}
                  {d.isPrivate && (
                    <span 
                      className="badge" 
                      style={{ 
                        position: 'absolute', 
                        top: '0.75rem', 
                        right: '0.75rem', 
                        background: 'var(--accent)', 
                        fontSize: '0.7rem' 
                      }}
                    >
                      Private
                    </span>
                  )}
                </div>
                
                <div className="doc-info" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontFamily: 'var(--font-serif)' }}>
                    <Link to={`/doc/${d._id}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>{d.title}</Link>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: 'auto' }}>
                    <span className="item-meta" style={{ fontSize: '0.75rem' }}>
                      Owner: <strong>{d.owner ? d.owner.name : 'Unknown'}</strong>
                    </span>
                    <span className="item-meta" style={{ fontSize: '0.725rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>{d.collaborators && d.collaborators.length > 0 ? `${d.collaborators.length} collaborators` : 'No collaborators'}</span>
                      <span>{new Date(d.updatedAt).toLocaleDateString()}</span>
                    </span>
                  </div>
                </div>
                
                <div className="doc-actions" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <Link className="btn btn-sm btn-outline" to={`/doc/${d._id}/versions`} style={{ flex: 1, justifyContent: 'center' }}>
                    History
                  </Link>
                  {user ? (
                    hasAccess ? (
                      <Link className="btn btn-sm btn-primary" to={`/doc/${d._id}`} style={{ flex: 1, justifyContent: 'center' }}>
                        Edit
                      </Link>
                    ) : (
                      <button 
                        className="btn btn-sm btn-accent" 
                        onClick={() => requestAccess(d._id)}
                        disabled={feedback[d._id] !== undefined}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        {feedback[d._id] || 'Request Access'}
                      </button>
                    )
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
  );
}

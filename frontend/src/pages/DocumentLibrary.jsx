import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Link } from 'react-router-dom';
import { generateThumbnail } from '../utils/thumbnailGenerator.js';

export default function DocumentLibrary() {
  const [docs, setDocs] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [title, setTitle] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [tab, setTab] = useState('all'); // 'all' | 'public' | 'private'
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState({});
  const { user } = useAuth();

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
    if (tab === 'all') {
      setFilteredDocs(docs);
    } else if (tab === 'public') {
      setFilteredDocs(docs.filter(d => !d.isPrivate));
    } else if (tab === 'private') {
      // Users only see private documents they own or collaborate on
      setFilteredDocs(docs.filter(d => d.isPrivate));
    }
  }, [docs, tab]);

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
    <div className="library fade-in">
      <div className="lib-hero glass">
        <div className="lib-art" aria-hidden="true">
          <div className="shape s1" />
          <div className="shape s2" />
          <div className="shape s3" />
        </div>
        <div className="lib-copy">
          <h2>Workspace Library</h2>
          <p className="item-meta" style={{ fontSize: '0.9375rem' }}>Create and collaborate on structured documents in real-time.</p>
        </div>
      </div>

      <div className="tabs" style={{ display: 'inline-flex', marginBottom: '2rem' }}>
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

      {user ? (
        <div className="card glass mb-32 slide-up" style={{ padding: '1.5rem 2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontFamily: 'var(--font-serif)' }}>New Document</h3>
          <form className="form-row" onSubmit={createDoc} style={{ alignItems: 'center' }}>
            <input 
              className="input" 
              placeholder="Enter document title…" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              style={{ flex: 1, minWidth: '200px' }}
              required
            />
            <label className="label form-row" style={{ margin: 0, gap: '0.5rem', userSelect: 'none', cursor: 'pointer' }}>
              <input 
                className="checkbox" 
                type="checkbox" 
                checked={isPrivate} 
                onChange={e => setIsPrivate(e.target.checked)} 
              />
              <span>Keep Private</span>
            </label>
            <button type="submit" className="btn btn-primary" disabled={creating || !title.trim()}>
              {creating ? 'Creating…' : 'Create'}
            </button>
          </form>
        </div>
      ) : (
        <div className="card mb-32" style={{ textAlign: 'center', background: 'var(--bg-secondary)', border: 'none' }}>
          <p style={{ margin: 0 }}>
            Please <Link to="/login" style={{ fontWeight: '600' }}>login</Link> to create collaborative documents.
          </p>
        </div>
      )}

      {filteredDocs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>No documents found matching this criteria.</p>
        </div>
      ) : (
        <div className="cards-grid slide-up">
          {filteredDocs.map(d => (
            <div className="doc-card" key={d._id}>
              <div className="doc-thumb">
                {d.thumbnail ? (
                  <img src={d.thumbnail} alt={d.title} className="doc-thumb-img" />
                ) : (
                  <div className="doc-thumb-placeholder">📄</div>
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
              
              <div className="doc-info">
                <h3>
                  <Link to={`/doc/${d._id}`}>{d.title}</Link>
                </h3>
                <div className="item-meta" style={{ marginTop: 'auto' }}>
                  {d.owner ? `By: ${d.owner.name}` : 'Unknown'}
                  {d.collaborators && d.collaborators.length > 0 ? ` · ${d.collaborators.length} collaborators` : ''}
                </div>
              </div>
              
              <div className="doc-actions">
                <Link className="btn btn-sm btn-outline" to={`/doc/${d._id}/versions`} style={{ flex: 1 }}>
                  History
                </Link>
                {user && (
                  <button 
                    className="btn btn-sm btn-accent" 
                    onClick={() => requestAccess(d._id)}
                    disabled={feedback[d._id] !== undefined}
                    style={{ flex: 1 }}
                  >
                    {feedback[d._id] || 'Request Access'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

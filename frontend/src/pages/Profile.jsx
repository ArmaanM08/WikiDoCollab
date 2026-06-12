import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [pending, setPending] = useState([]);
  const [nameEdit, setNameEdit] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    setNameEdit(user.displayName || '');
    
    // Fetch documents
    api.get('/api/documents')
      .then(res => {
        const arr = Array.isArray(res.data) ? res.data : [];
        setDocs(arr);
      })
      .catch(() => { setDocs([]); });
    
    // Fetch pending requests
    api.get('/api/requests')
      .then(res => {
        const requests = Array.isArray(res.data) ? res.data : [];
        setPending(requests);
      })
      .catch(() => { setPending([]); });
  }, [user]);

  const decide = async (docId, userId, approve) => {
    try {
      await api.post(`/api/documents/${docId}/approve`, { userId, approve });
      // Remove from pending list immediately
      setPending(prev => prev.filter(p => !(p.docId === docId && p.requester._id === userId)));
    } catch (error) {
      console.error('Error processing request:', error);
    }
  };

  const saveDisplayName = async (e) => {
    e.preventDefault();
    if (!nameEdit.trim()) return;
    setSavingName(true);
    setFeedbackMsg('');
    try {
      const res = await api.patch('/api/auth/profile', { displayName: nameEdit.trim() });
      setUser(res.data);
      setFeedbackMsg('Display name updated successfully!');
    } catch {
      setFeedbackMsg('Failed to update name.');
    } finally {
      setSavingName(false);
    }
  };

  const deleteDoc = async (docId) => {
    const ok = window.confirm('Are you sure you want to delete this document? All version histories and access permissions will be permanently removed.');
    if (!ok) return;
    try {
      await api.delete(`/api/documents/${docId}`);
      setDocs(prev => prev.filter(d => d._id !== docId));
      setPending(prev => prev.filter(p => p.docId !== docId));
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  if (!user) {
    return (
      <div style={{ maxWidth: '480px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="card glass">
          <p style={{ marginBottom: '1.5rem' }}>Please log in to access your profile.</p>
          <button className="btn btn-primary" onClick={() => navigate('/login')}>Log In</button>
        </div>
      </div>
    );
  }

  const myPrivateDocs = docs.filter(d => d.isPrivate);
  const myPublicDocs = docs.filter(d => !d.isPrivate);

  return (
    <div className="profile fade-in">
      <div className="profile-header">
        <button className="btn btn-outline" onClick={() => navigate('/library')}>
          ← Back to Library
        </button>
        <button className="btn btn-danger" onClick={() => { logout(); navigate('/'); }}>
          Logout
        </button>
      </div>

      <div className="grid-2 mt-32 slide-up">
        {/* Left Column: Account Details & Requests */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card glass">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontFamily: 'var(--font-serif)' }}>Profile Settings</h2>
            
            <form onSubmit={saveDisplayName}>
              <div className="form-group">
                <label className="label">Display Name</label>
                <div className="form-row" style={{ display: 'flex', gap: '0.75rem' }}>
                  <input 
                    className="input" 
                    value={nameEdit} 
                    onChange={e => setNameEdit(e.target.value)} 
                    placeholder="Your full name"
                    style={{ flex: 1 }}
                    required
                  />
                  <button type="submit" className="btn btn-primary" disabled={savingName || !nameEdit.trim()}>
                    {savingName ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </form>

            {feedbackMsg && (
              <p style={{ 
                fontSize: '0.8125rem', 
                color: feedbackMsg.includes('successfully') ? 'var(--success)' : 'var(--danger)',
                fontWeight: '500',
                marginTop: '-0.5rem',
                marginBottom: '1rem'
              }}>
                {feedbackMsg}
              </p>
            )}

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
              <p className="item-meta">Email: <strong>{user.email}</strong></p>
              <p className="item-meta" style={{ marginTop: '0.5rem' }}>
                Member since: {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Collaborative access requests */}
          {pending.length > 0 ? (
            <div className="card glass" style={{ borderLeft: '4px solid var(--accent)' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-serif)' }}>
                <span>Access Requests</span>
                <span className="badge">{pending.length}</span>
              </h3>
              <ul className="list">
                {pending.map((req, idx) => (
                  <li className="list-item" key={idx} style={{ padding: '1rem 0', flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div className="w-full">
                      <strong>{req.requester.displayName || req.requester.email}</strong>
                      <span className="item-meta"> requested access to </span>
                      <Link to={`/doc/${req.docId}`} style={{ color: 'var(--accent)', fontWeight: '600' }}>
                        {req.title}
                      </Link>
                      {req.requestedAt && (
                        <div className="item-meta" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                          {new Date(req.requestedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="form-row" style={{ gap: '0.5rem' }}>
                      <button 
                        className="btn btn-accent btn-sm" 
                        onClick={() => decide(req.docId, req.requester._id, true)}
                      >
                        Approve
                      </button>
                      <button 
                        className="btn btn-outline btn-sm" 
                        onClick={() => decide(req.docId, req.requester._id, false)}
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="card" style={{ borderStyle: 'dashed', textAlign: 'center', background: 'transparent' }}>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>No pending collaboration requests.</p>
            </div>
          )}
        </div>

        {/* Right Column: User Documents Management */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card glass">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontFamily: 'var(--font-serif)' }}>My Documents</h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Private ({myPrivateDocs.length})</h3>
              {myPrivateDocs.length > 0 ? (
                <ul className="list" style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  {myPrivateDocs.map(d => (
                    <li className="list-item" key={d._id} style={{ padding: '0.75rem 1rem' }}>
                      <Link to={`/doc/${d._id}`} style={{ fontWeight: '500' }}>{d.title}</Link>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteDoc(d._id)}>Delete</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="item-meta">No private documents.</p>
              )}
            </div>

            <div>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Public ({myPublicDocs.length})</h3>
              {myPublicDocs.length > 0 ? (
                <ul className="list" style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  {myPublicDocs.map(d => (
                    <li className="list-item" key={d._id} style={{ padding: '0.75rem 1rem' }}>
                      <Link to={`/doc/${d._id}`} style={{ fontWeight: '500' }}>{d.title}</Link>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteDoc(d._id)}>Delete</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="item-meta">No public documents.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

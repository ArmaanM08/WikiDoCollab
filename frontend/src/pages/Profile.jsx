import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [pending, setPending] = useState([]);
  const [nameEdit, setNameEdit] = useState('');
  const [savingName, setSavingName] = useState(false);

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

  if (!user) return <p className="card">Please login to view your profile.</p>;

  const saveDisplayName = async () => {
    try {
      setSavingName(true);
      const res = await api.patch('/api/auth/profile', { displayName: nameEdit });
      setUser(res.data);
    } catch {} finally { setSavingName(false); }
  };

  const deleteDoc = async (docId) => {
    const ok = window.confirm('Delete this document? This action cannot be undone.');
    if (!ok) return;
    try {
      await api.delete(`/api/documents/${docId}`);
      setDocs(prev => prev.filter(d => d._id !== docId));
      setPending(prev => prev.filter(p => p.docId !== docId));
    } catch {}
  };

  return (
    <div className="profile fade-in">
      <div className="profile-header">
        <button className="btn" onClick={() => navigate('/library')}>← Back to Library</button>
        <button className="btn btn-primary" onClick={() => { logout(); navigate('/'); }}>Logout</button>
      </div>
      <div className="card-glass mt-32 slide-up">
        <h2>Profile</h2>
        
        {/* Pending Requests Section */}
        {pending.length > 0 && (
          <div className="card mt-24" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <h3 style={{ marginBottom: '1rem' }}>
              Collaboration Requests 
              <span className="badge" style={{ 
                marginLeft: '0.75rem', 
                padding: '0.25rem 0.75rem', 
                background: 'var(--accent)', 
                color: 'white', 
                borderRadius: '12px', 
                fontSize: '0.875rem',
                fontWeight: '600'
              }}>
                {pending.length}
              </span>
            </h3>
            <ul className="list">
              {pending.map((req, idx) => (
                <li className="list-item" key={idx} style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                  <div className="w-full">
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>{req.requester.displayName || req.requester.email}</strong>
                      <span className="item-meta"> wants to collaborate on </span>
                      <Link to={`/doc/${req.docId}`} style={{ color: 'var(--accent)', fontWeight: '500' }}>
                        {req.title}
                      </Link>
                    </div>
                    {req.requestedAt && (
                      <div className="item-meta" style={{ fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
                        Requested {new Date(req.requestedAt).toLocaleString()}
                      </div>
                    )}
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
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid-2 mt-24">
          <div>
            <h3>Account</h3>
            <div className="section">
              <label className="label">Display Name</label>
              <div className="form-row">
                <input className="input" value={nameEdit} onChange={e => setNameEdit(e.target.value)} placeholder="Your name" />
                <button className="btn btn-primary" onClick={saveDisplayName} disabled={savingName}>{savingName ? 'Saving…' : 'Save'}</button>
              </div>
              <p className="item-meta mt-8">Email: {user.email}</p>
              <p className="item-meta">Date joined: {new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div>
            <h3>Documents</h3>
            <div className="grid-2 mt-8">
              <div>
                <h4>Private Docs</h4>
                <ul className="list card mt-8">
                  {docs.filter(d => d.isPrivate).map(d => (
                    <li className="list-item" key={d._id}>
                      <div className="w-full">
                        <Link to={`/doc/${d._id}`}>{d.title}</Link>
                      </div>
                      {(d.ownerId === user._id || (d.ownerId && d.ownerId._id === user._id)) && (
                        <button className="btn btn-danger" onClick={() => deleteDoc(d._id)}>Delete</button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>Public Docs</h4>
                <ul className="list card mt-8">
                  {docs.filter(d => !d.isPrivate).map(d => (
                    <li className="list-item" key={d._id}>
                      <div className="w-full">
                        <Link to={`/doc/${d._id}`}>{d.title}</Link>
                      </div>
                      {(d.ownerId === user._id || (d.ownerId && d.ownerId._id === user._id)) && (
                        <button className="btn btn-danger" onClick={() => deleteDoc(d._id)}>Delete</button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

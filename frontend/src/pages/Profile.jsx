import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [docs, setDocs] = useState([]);
  const [pending, setPending] = useState([]);
  const [nameEdit, setNameEdit] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!user) return;
    setNameEdit(user.displayName || '');
    api.get('/api/documents')
      .then(res => {
        const arr = Array.isArray(res.data) ? res.data : [];
        setDocs(arr);
        const mine = arr.filter(d => d.ownerId === user._id || (d.ownerId && d.ownerId._id === user._id));
        const pend = [];
        for (const d of mine) {
          (d.collaborationRequests || []).forEach(r => { if (r.status === 'pending') pend.push({ docId: d._id, ...r }); });
        }
        setPending(pend);
      })
      .catch(() => { setDocs([]); setPending([]); });
  }, [user]);

  const decide = async (docId, userId, approve) => {
    try {
      await api.post(`/api/documents/${docId}/approve`, { userId, approve });
      setPending(prev => prev.filter(p => !(p.docId === docId && p.userId === userId)));
    } catch {}
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
    <div>
      <h2>Profile</h2>
      <div className="card mt-16">
        <h3>Account</h3>
        <div className="section">
          <label className="label">Display Name</label>
          <div className="form-row">
            <input className="input" value={nameEdit} onChange={e => setNameEdit(e.target.value)} placeholder="Your name" />
            <button className="btn btn-primary" onClick={saveDisplayName} disabled={savingName}>{savingName ? 'Saving…' : 'Save'}</button>
          </div>
          <p className="item-meta mt-8">Email: {user.email}</p>
        </div>
      </div>
      <div className="section">
        <h3>Your Documents</h3>
        <ul className="list card mt-8">
          {docs.map(d => (
            <li className="list-item" key={d._id}>
              <div className="w-full">
                <Link to={`/doc/${d._id}`}>{d.title}</Link>
                {' '}· <Link to={`/doc/${d._id}/versions`}>versions</Link>
              </div>
              {(d.ownerId === user._id || (d.ownerId && d.ownerId._id === user._id)) && (
                <button className="btn btn-danger" onClick={() => deleteDoc(d._id)}>Delete</button>
              )}
            </li>
          ))}
        </ul>
      </div>
      {pending.length > 0 && (
        <div className="section">
          <h3>Pending Collaboration Requests</h3>
          <ul className="list card mt-8">
            {pending.map(p => (
              <li className="list-item" key={`${p.docId}:${p.userId}`}>
                <div className="w-full">
                  Request from {p.userId} on doc {p.docId}
                </div>
                <button className="btn btn-primary" onClick={() => decide(p.docId, p.userId, true)}>Approve</button>
                <button className="btn" onClick={() => decide(p.docId, p.userId, false)}>Reject</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

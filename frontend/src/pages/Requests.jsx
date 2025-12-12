import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Requests() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get('/api/requests');
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const decide = async (docId, userId, approve) => {
    try {
      await api.post(`/api/documents/${docId}/approve`, { userId, approve });
      setItems(prev => prev.filter(x => !(x.docId === docId && x.requester?._id === userId)));
    } catch {}
  };

  if (loading) return <p className="card">Loading...</p>;

  return (
    <div>
      <h2>Requests</h2>
      {items.length === 0 ? (
        <p className="card mt-16">No pending collaboration requests.</p>
      ) : (
        <ul className="list card mt-16">
          {items.map(r => (
            <li className="list-item" key={`${r.docId}:${r.requester?._id}`}>
              <div className="w-full">
                <div><strong>{r.requester?.displayName || 'Unknown'}</strong> <span className="item-meta">({r.requester?.email})</span></div>
                <div className="item-meta">Requested for: {r.title}</div>
              </div>
              <button className="btn btn-primary" onClick={() => decide(r.docId, r.requester?._id, true)}>Approve</button>
              <button className="btn" onClick={() => decide(r.docId, r.requester?._id, false)}>Reject</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

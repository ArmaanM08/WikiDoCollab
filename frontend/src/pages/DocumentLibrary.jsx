import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Link } from 'react-router-dom';

export default function DocumentLibrary() {
  const [docs, setDocs] = useState([]);
  const [title, setTitle] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    api
      .get('/api/public/documents')
      .then(res => {
        const data = res?.data;
        setDocs(Array.isArray(data) ? data : []);
      })
      .catch(() => setDocs([]));
  }, []);

  const createDoc = async () => {
    try {
      if (!user) return; // must login to create
      const res = await api.post('/api/documents', { title, isPrivate });
      const doc = res?.data;
      setDocs(prev => (doc && doc._id ? [doc, ...(Array.isArray(prev) ? prev : [])] : Array.isArray(prev) ? prev : []));
      setTitle('');
    } catch {
      // keep existing list if creation fails
    }
  };

  const requestAccess = async (id) => {
    if (!user) return; // require login to request
    try {
      await api.post(`/api/documents/${id}/request-access`);
      // minimal feedback could be added
    } catch {}
  };

  return (
    <div>
      <h2>Documents</h2>
      {user ? (
        <div className="card mt-16">
          <div className="form-row">
            <input className="input" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
            <label className="label form-row">
              <input className="checkbox" type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
              <span className="ml-8">Private</span>
            </label>
            <button className="btn btn-primary" onClick={createDoc}>Create</button>
          </div>
        </div>
      ) : (
        <p className="mt-16">Login to create a document.</p>
      )}
      <ul className="list mt-16 card">
        {docs.map(d => (
          <li className="list-item" key={d._id}>
            <div className="w-full">
              <div>
                <Link to={`/doc/${d._id}`}>{d.title}</Link>
                {' '}· <Link to={`/doc/${d._id}/versions`}>versions</Link>
              </div>
              {d.owner && (
                <div className="item-meta">
                  owner: {d.owner.name} · collaborators: {d.collaborators ? d.collaborators.length : 0}
                </div>
              )}
            </div>
            {user && (
              <button className="btn" onClick={() => requestAccess(d._id)}>request access</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

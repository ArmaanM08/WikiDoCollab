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
    <div className="library fade-in">
      <div className="lib-hero glass">
        <div className="lib-art" aria-hidden>
          <div className="shape s1" />
          <div className="shape s2" />
          <div className="shape s3" />
        </div>
        <div className="lib-copy">
          <h2>World Docs</h2>
          <p className="item-meta">Create, organize and collaborate with everyone.</p>
        </div>
      </div>

      {user ? (
        <div className="card-glass mt-32 slide-up">
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

      <div className="cards-grid mt-32">
        {docs.map(d => (
          <div className="doc-card" key={d._id}>
            <div className="doc-thumb" />
            <div className="doc-info">
              <h3><Link to={`/doc/${d._id}`}>{d.title}</Link></h3>
              <div className="item-meta">
                {d.owner ? `owner: ${d.owner.name}` : ''}
                {d.collaborators ? ` · collaborators: ${d.collaborators.length}` : ''}
              </div>
            </div>
            <div className="doc-actions">
              <Link className="btn" to={`/doc/${d._id}/versions`}>Versions</Link>
              {user && <button className="btn" onClick={() => requestAccess(d._id)}>Request Access</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

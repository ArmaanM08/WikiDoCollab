import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useParams } from 'react-router-dom';

export default function VersionHistory() {
  const { id } = useParams();
  const [versions, setVersions] = useState([]);

  useEffect(() => {
    api.get(`/api/documents/${id}/versions`)
      .then(res => setVersions(res.data)).catch(() => setVersions([]));
  }, [id]);

  return (
    <div>
      <h2>Version History</h2>
      <ul className="list card mt-16">
        {versions.map(v => (
          <li className="list-item" key={v._id}>
            <div className="w-full">
              {new Date(v.createdAt).toLocaleString()} — <span className="item-meta">{v.message || 'Snapshot'}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

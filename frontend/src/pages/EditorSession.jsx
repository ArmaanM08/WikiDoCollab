import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { generateThumbnail } from '../utils/thumbnailGenerator.js';

export default function EditorSession() {
  const { id } = useParams();
  const socketRef = useRef(null);
  const { user } = useAuth();
  const [saveMsg, setSaveMsg] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [connected, setConnected] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    api.get(`/api/documents/${id}/capability`).then(res => setCanEdit(!!res.data?.canEdit)).catch(() => setCanEdit(false));
    api.get(`/api/documents/${id}/content`).then(res => setText(res.data?.content || '')).catch(() => setText(''));
  }, [id]);

  useEffect(() => {
    const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5112';
    const socket = io(socketUrl, { auth: { token } });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.emit('join-document', { docId: id });
    socket.on('doc-content', ({ content }) => {
      if (typeof content === 'string') setText(content);
    });
    return () => socket.disconnect();
  }, [id]);

  const saveDocument = async () => {
    try {
      // Persist current content so it's restored on next load
      await api.post(`/api/documents/${id}/content`, { content: text });
      const snapshotBase64 = btoa(unescape(encodeURIComponent(text)));
      await api.post(`/api/documents/${id}/versions`, { message: saveMsg || 'Manual save', snapshot: snapshotBase64 });
      
      // Generate thumbnail for the document
      await generateThumbnail(text, id);
      
      setSaveMsg('');
    } catch (e) {
      // minimal: could show error state
    }
  };

  const Toolbar = () => (
    <div className="toolbar">
      <span className="status">{connected ? 'Online' : 'Offline'}</span>
    </div>
  );

  const download = async (type) => {
    const url = `/api/documents/${id}/export/${type}`;
    const res = await api.get(url, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `document-${id}.${type}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const onChange = (value) => {
    setText(value);
    socketRef.current?.emit('doc-ops', { docId: id, content: value });
  };

  return (
    <div>
      <h2>Editor</h2>
      <Toolbar />
      <textarea
        className="textarea editor-textarea"
        value={text}
        onChange={e => onChange(e.target.value)}
        rows={16}
        readOnly={!canEdit}
      />
      <div className="mt-8 flex gap-8 align-center">
        {canEdit && (
          <>
            <input
              className="input"
              placeholder="save message (optional)"
              value={saveMsg}
              onChange={e => setSaveMsg(e.target.value)}
            />
            <button className="btn btn-primary" onClick={saveDocument}>Save</button>
          </>
        )}
        <button className="btn" onClick={() => download('pdf')}>Download PDF</button>
        <button className="btn" onClick={() => download('docx')}>Download DOCX</button>
      </div>
    </div>
  );
}

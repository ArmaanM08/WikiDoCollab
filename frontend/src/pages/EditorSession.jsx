import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api, getSocketURL } from '../api.js';
import { useAuth } from '../auth.jsx';
import { generateThumbnail } from '../utils/thumbnailGenerator.js';

// BlockNote Imports
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

function RichTextEditor({ initialContent, onChange, readOnly, editorInstanceRef, theme }) {
  const editor = useCreateBlockNote({
    initialContent: initialContent || undefined
  });

  useEffect(() => {
    editorInstanceRef.current = editor;
    return () => {
      editorInstanceRef.current = null;
    };
  }, [editor, editorInstanceRef]);

  useEffect(() => {
    if (!editor) return;
    const unsub = editor.onChange(() => {
      onChange(editor);
    });
    return () => unsub();
  }, [editor, onChange]);

  return (
    <div className="editor-wrapper">
      <BlockNoteView 
        editor={editor} 
        editable={!readOnly} 
        theme={theme}
      />
    </div>
  );
}

export default function EditorSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const { user } = useAuth();
  const [saveMsg, setSaveMsg] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [connected, setConnected] = useState(false);
  const [initialContent, setInitialContent] = useState('loading');
  const [latestContent, setLatestContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [editorTheme, setEditorTheme] = useState(
    document.documentElement.getAttribute('data-theme') || 'light'
  );

  const isProgrammaticUpdate = useRef(false);
  const editorInstanceRef = useRef(null);

  // Sync theme changes with MutationObserver
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const val = document.documentElement.getAttribute('data-theme') || 'light';
      setEditorTheme(val);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Fetch capabilities and document content
  useEffect(() => {
    api.get(`/api/documents/${id}/capability`)
      .then(res => setCanEdit(!!res.data?.canEdit))
      .catch(() => setCanEdit(false));

    api.get(`/api/documents/${id}/content`)
      .then(res => {
        const raw = res.data?.content || '';
        try {
          // Check if content is already stored as JSON blocks
          const parsed = JSON.parse(raw);
          setInitialContent(parsed);
          setLatestContent(raw);
        } catch {
          // If content is plain text (backward compatibility), wrap in a paragraph block structure
          const fallbackBlocks = [{ type: 'paragraph', content: raw }];
          setInitialContent(fallbackBlocks);
          setLatestContent(JSON.stringify(fallbackBlocks));
        }
      })
      .catch(() => {
        setInitialContent([]);
        setLatestContent(JSON.stringify([]));
      });
  }, [id]);

  // Connect socket.io for real-time collaboration
  useEffect(() => {
    const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
    const socketUrl = getSocketURL();
    const socket = io(socketUrl, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.emit('join-document', { docId: id });

    // Handle incoming content updates from other users
    socket.on('doc-content', ({ content }) => {
      if (typeof content === 'string' && editorInstanceRef.current) {
        try {
          const newBlocks = JSON.parse(content);
          const currentJson = JSON.stringify(editorInstanceRef.current.document);
          if (content !== currentJson) {
            isProgrammaticUpdate.current = true;
            editorInstanceRef.current.replaceBlocks(editorInstanceRef.current.document, newBlocks);
            isProgrammaticUpdate.current = false;
            setLatestContent(content);
          }
        } catch (e) {
          // Ignore JSON errors during edits
        }
      }
    });

    return () => socket.disconnect();
  }, [id]);

  // Handle local changes from the BlockNote editor
  const handleEditorChange = (editor) => {
    if (isProgrammaticUpdate.current) return;
    const jsonStr = JSON.stringify(editor.document);
    setLatestContent(jsonStr);
    socketRef.current?.emit('doc-ops', { docId: id, content: jsonStr });
  };

  const saveDocument = async () => {
    if (!latestContent) return;
    setSaving(true);
    setFeedback('');
    try {
      // Generate base64 thumbnail of the document canvas
      const thumbnailData = await generateThumbnail(latestContent);
      
      // Update document content & thumbnail in DB
      await api.post(`/api/documents/${id}/content`, { 
        content: latestContent,
        thumbnail: thumbnailData || ''
      });
      
      // Create version snapshot
      const snapshotBase64 = btoa(unescape(encodeURIComponent(latestContent)));
      await api.post(`/api/documents/${id}/versions`, { 
        message: saveMsg.trim() || 'Manual save', 
        snapshot: snapshotBase64 
      });
      
      setSaveMsg('');
      setFeedback('Document and thumbnail saved successfully!');
      setTimeout(() => setFeedback(''), 4000);
    } catch (e) {
      setFeedback('Failed to save document.');
      setTimeout(() => setFeedback(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  const download = async (type) => {
    try {
      const url = `/api/documents/${id}/export/${type}`;
      const res = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `document-${id}.${type}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert(`Failed to export document as ${type.toUpperCase()}.`);
    }
  };

  return (
    <div className="fade-in">
      <div className="editor-header">
        <button className="back-btn" onClick={() => navigate('/library')} title="Back to Library">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Library
        </button>
        <h2>Editor Session</h2>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span className={`status-badge ${connected ? 'online' : 'offline'}`}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
            {connected ? 'Syncing Live' : 'Offline'}
          </span>
        </div>
      </div>

      {initialContent === 'loading' ? (
        <div className="card glass" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading rich text editor workspace…</p>
        </div>
      ) : (
        <RichTextEditor 
          initialContent={initialContent} 
          onChange={handleEditorChange} 
          readOnly={!canEdit} 
          editorInstanceRef={editorInstanceRef}
          theme={editorTheme}
        />
      )}

      <div className="mt-24 flex gap-12 align-center" style={{ flexWrap: 'wrap' }}>
        {canEdit && (
          <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '300px' }}>
            <input
              className="input"
              placeholder="Commit message (optional)"
              value={saveMsg}
              onChange={e => setSaveMsg(e.target.value)}
              style={{ flex: 1 }}
              disabled={saving}
            />
            <button className="btn btn-primary" onClick={saveDocument} disabled={saving}>
              {saving ? 'Saving Commit…' : 'Save Commit'}
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={() => download('pdf')}>Download PDF</button>
          <button className="btn btn-outline" onClick={() => download('docx')}>Download DOCX</button>
          <button className="btn btn-outline" onClick={() => download('html')}>Download HTML</button>
        </div>
      </div>

      {feedback && (
        <div style={{ 
          fontSize: '0.875rem', 
          color: feedback.includes('success') ? 'var(--success)' : 'var(--danger)',
          marginTop: '1.25rem',
          fontWeight: '600'
        }}>
          {feedback}
        </div>
      )}
    </div>
  );
}

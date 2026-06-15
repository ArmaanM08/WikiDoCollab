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
  const [metadata, setMetadata] = useState(null);
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(true);

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

  const loadMetadata = () => {
    api.get(`/api/documents/${id}/capability`)
      .then(res => {
        setCanEdit(!!res.data?.canEdit);
        setMetadata(res.data);
      })
      .catch(() => {
        setCanEdit(false);
        setMetadata(null);
      });
  };

  const loadVersions = () => {
    setVersionsLoading(true);
    api.get(`/api/documents/${id}/versions`)
      .then(res => {
        setVersions(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => setVersions([]))
      .finally(() => setVersionsLoading(false));
  };

  // Fetch capabilities, metadata, commits and document content
  useEffect(() => {
    loadMetadata();
    loadVersions();

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
      loadVersions();
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
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0, fontSize: '1.5rem', fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>
          <span>{metadata?.title || 'Editor Session'}</span>
          {metadata?.isPrivate && <span className="badge" style={{ background: 'var(--accent)' }}>Private</span>}
        </h2>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span className={`status-badge ${connected ? 'online' : 'offline'}`}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
            {connected ? 'Syncing Live' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="editor-grid">
        {/* Left Column: Owner, Collaborators, Commit History */}
        <div className="editor-left-col">
          <div className="card glass" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem', fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>Access & Collaborators</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <span className="item-meta" style={{ fontSize: '0.75rem', fontWeight: '500' }}>Document Owner</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <div className="collab-user-avatar" style={{ background: 'var(--primary)', color: 'var(--bg)' }}>
                    {(metadata?.owner?.displayName || metadata?.owner?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                    {metadata?.owner?.displayName || metadata?.owner?.email || 'Loading...'}
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                <span className="item-meta" style={{ fontSize: '0.75rem', fontWeight: '500' }}>Collaborators ({metadata?.collaborators?.length || 0})</span>
                {metadata?.collaborators && metadata.collaborators.length > 0 ? (
                  <div className="collab-badge-list">
                    {metadata.collaborators.map(c => {
                      const name = c.displayName || c.email;
                      const initial = name.charAt(0).toUpperCase();
                      return (
                        <div key={c._id} className="collab-user-badge" title={c.email}>
                          <div className="collab-user-avatar">{initial}</div>
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100px' }}>
                            {c.displayName || c.email.split('@')[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="item-meta" style={{ fontStyle: 'italic', marginTop: '0.25rem' }}>No collaborators yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="card glass" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem', fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>Version History</h3>
            {versionsLoading ? (
              <p className="item-meta" style={{ fontStyle: 'italic' }}>Loading commit timeline...</p>
            ) : versions.length === 0 ? (
              <p className="item-meta" style={{ fontStyle: 'italic' }}>No version commits found.</p>
            ) : (
              <div className="editor-commit-history">
                <ul className="timeline-mini">
                  {versions.map(v => (
                    <li key={v._id} className="timeline-mini-item">
                      <div className="timeline-mini-msg">{v.message || 'Saved snapshot'}</div>
                      <div className="timeline-mini-meta">
                        {v.authorId?.displayName || v.authorId?.email || 'System'} · {new Date(v.createdAt).toLocaleDateString()}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Center Column: Editor */}
        <div className="editor-main-col">
          {initialContent === 'loading' ? (
            <div className="card glass" style={{ minHeight: '650px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
        </div>

        {/* Right Column: Commit Save Input & Actions */}
        <div className="editor-right-col">
          {canEdit && (
            <div className="card glass" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>Commit Changes</h3>
              <p className="item-meta" style={{ marginBottom: '1rem', lineHeight: '1.4' }}>
                Write an optional message and commit to save a new milestone to history.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <textarea
                  className="input"
                  placeholder="Describe your edits (optional)..."
                  value={saveMsg}
                  onChange={e => setSaveMsg(e.target.value)}
                  style={{ minHeight: '90px', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.875rem' }}
                  disabled={saving}
                />
                <button className="btn btn-primary" onClick={saveDocument} disabled={saving} style={{ width: '100%' }}>
                  {saving ? 'Committing Snapshot...' : 'Commit Version'}
                </button>
              </div>
            </div>
          )}

          <div className="card glass" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>Exports</h3>
            <p className="item-meta" style={{ marginBottom: '1rem', lineHeight: '1.4' }}>
              Export this document to the following formats:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => download('pdf')} style={{ width: '100%', justifyContent: 'center' }}>
                Download PDF
              </button>
              <button className="btn btn-outline" onClick={() => download('docx')} style={{ width: '100%', justifyContent: 'center' }}>
                Download DOCX
              </button>
              <button className="btn btn-outline" onClick={() => download('html')} style={{ width: '100%', justifyContent: 'center' }}>
                Download HTML
              </button>
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div style={{ 
          fontSize: '0.875rem', 
          color: feedback.includes('success') ? 'var(--success)' : 'var(--danger)',
          marginTop: '1.5rem',
          fontWeight: '600',
          textAlign: 'center'
        }}>
          {feedback}
        </div>
      )}
    </div>
  );
}

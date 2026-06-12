import express from 'express';
import Document from '../models/Document.js';
import Version from '../models/Version.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import htmlToDocx from 'html-to-docx';
import puppeteer from 'puppeteer';

const router = express.Router();

async function authz(req, res, next) {
  const doc = await Document.findById(req.params.id).select('isPrivate ownerId collaboratorIds');
  if (!doc) return res.status(404).json({ error: 'Not found' });
  if (doc.isPrivate) {
    const uid = req.user?._id?.toString();
    const ok = uid && (doc.ownerId?.toString() === uid || (doc.collaboratorIds || []).some(id => id.toString() === uid));
    if (!ok) return res.status(403).json({ error: 'Forbidden' });
  }
  req._docMeta = doc;
  next();
}

function inlineToHtml(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(item => {
      let text = item.text || '';
      text = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
      
      const styles = item.styles || {};
      if (styles.bold) text = `<strong>${text}</strong>`;
      if (styles.italic) text = `<em>${text}</em>`;
      if (styles.underline) text = `<u>${text}</u>`;
      if (styles.strikethrough) text = `<s>${text}</s>`;
      if (styles.code) text = `<code>${text}</code>`;
      return text;
    }).join('');
  }
  return '';
}

function blocksToHtml(blocks) {
  if (!Array.isArray(blocks)) return '';
  return blocks.map(block => {
    const contentHtml = inlineToHtml(block.content);
    let html = '';
    
    switch (block.type) {
      case 'heading':
        const level = block.props?.level || 1;
        html = `<h${level}>${contentHtml}</h${level}>`;
        break;
      case 'bulletListItem':
        html = `<li>${contentHtml}</li>`;
        break;
      case 'numberedListItem':
        html = `<li>${contentHtml}</li>`;
        break;
      case 'checkListItem':
        const checked = block.props?.checked ? 'checked' : '';
        html = `<div><input type="checkbox" ${checked} disabled /> ${contentHtml}</div>`;
        break;
      case 'codeBlock':
        html = `<pre><code>${contentHtml}</code></pre>`;
        break;
      default: // paragraph
        html = `<p>${contentHtml}</p>`;
    }
    
    if (block.children && block.children.length > 0) {
      const childHtml = blocksToHtml(block.children);
      if (block.type === 'bulletListItem') {
        html = `<li>${contentHtml}<ul>${childHtml}</ul></li>`;
      } else if (block.type === 'numberedListItem') {
        html = `<li>${contentHtml}<ol>${childHtml}</ol></li>`;
      } else {
        html = `${html}<div style="margin-left: 20px;">${childHtml}</div>`;
      }
    }
    
    return html;
  }).join('\n');
}

async function latestHtml(documentId) {
  const doc = await Document.findById(documentId).select('content');
  const rawContent = doc?.content || '';
  
  let htmlBody = '';
  try {
    const blocks = JSON.parse(rawContent);
    htmlBody = blocksToHtml(blocks);
  } catch (e) {
    // If not JSON, treat as plain text
    htmlBody = rawContent
      .split('\n')
      .map(line => line.trim() ? `<p>${line}</p>` : '<br>')
      .join('');
  }
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a; padding: 40px; }
    h1, h2, h3 { color: #111; margin-top: 24px; margin-bottom: 12px; }
    p { margin-bottom: 16px; }
    ul, ol { margin-bottom: 16px; padding-left: 24px; }
    li { margin-bottom: 8px; }
    pre { background: #f4f4f4; padding: 16px; border-radius: 4px; overflow-x: auto; }
    code { font-family: monospace; background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
  </style>
</head>
<body>
  ${htmlBody}
</body>
</html>`;
}

router.get('/:id/export/html', optionalAuth, authz, async (req, res) => {
  const html = await latestHtml(req.params.id);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

router.get('/:id/export/docx', optionalAuth, authz, async (req, res) => {
  const html = await latestHtml(req.params.id);
  const buffer = await htmlToDocx(html);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="document-${req.params.id}.docx"`);
  res.send(Buffer.from(buffer));
});

router.get('/:id/export/pdf', optionalAuth, authz, async (req, res) => {
  const html = await latestHtml(req.params.id);
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'A4' });
  await browser.close();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="document-${req.params.id}.pdf"`);
  res.send(pdf);
});

export default router;

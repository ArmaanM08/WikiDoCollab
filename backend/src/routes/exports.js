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

async function latestHtml(documentId) {
  const v = await Version.findOne({ documentId }).sort({ createdAt: -1 });
  if (!v?.snapshot) return '<html><body><div></div></body></html>';
  try {
    const html = Buffer.from(v.snapshot).toString('utf-8');
    return html;
  } catch {
    return '<html><body><div></div></body></html>';
  }
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

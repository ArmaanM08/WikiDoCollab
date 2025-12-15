import html2canvas from 'html2canvas';

/**
 * Generates a thumbnail image from document content
 * @param {string} content - The document text content
 * @param {string} docId - The document ID for caching
 * @returns {Promise<string>} - Base64 data URL of the thumbnail
 */
export async function generateThumbnail(content, docId) {
  try {
    // Create a hidden container to render the document content
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: -10000px;
      left: -10000px;
      width: 800px;
      padding: 60px;
      background: white;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      font-size: 16px;
      line-height: 1.6;
      overflow: hidden;
      box-sizing: border-box;
    `;
    
    // Get first 500 characters for preview
    const previewContent = content.slice(0, 500);
    
    // Convert line breaks to proper HTML
    const formattedContent = previewContent
      .split('\n')
      .map(line => line.trim() ? `<p style="margin: 0 0 12px 0;">${line}</p>` : '<br>')
      .join('');
    
    container.innerHTML = formattedContent || '<p style="color: #94a3b8; font-style: italic;">Empty document</p>';
    
    document.body.appendChild(container);
    
    // Capture as canvas
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 0.5, // Reduce scale for smaller file size
      logging: false,
      width: 800,
      height: 600,
      windowWidth: 800,
      windowHeight: 600
    });
    
    // Convert to smaller thumbnail (400x300)
    const thumbnailCanvas = document.createElement('canvas');
    thumbnailCanvas.width = 400;
    thumbnailCanvas.height = 300;
    const ctx = thumbnailCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, 400, 300);
    
    // Convert to base64
    const dataUrl = thumbnailCanvas.toDataURL('image/jpeg', 0.7);
    
    // Cleanup
    document.body.removeChild(container);
    
    // Cache in localStorage
    try {
      localStorage.setItem(`thumbnail_${docId}`, dataUrl);
    } catch (e) {
      console.warn('Failed to cache thumbnail:', e);
    }
    
    return dataUrl;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return null;
  }
}

/**
 * Get cached thumbnail from localStorage
 * @param {string} docId - The document ID
 * @returns {string|null} - Base64 data URL or null if not cached
 */
export function getCachedThumbnail(docId) {
  try {
    return localStorage.getItem(`thumbnail_${docId}`);
  } catch (e) {
    return null;
  }
}

/**
 * Clear thumbnail cache for a document
 * @param {string} docId - The document ID
 */
export function clearThumbnailCache(docId) {
  try {
    localStorage.removeItem(`thumbnail_${docId}`);
  } catch (e) {
    console.warn('Failed to clear thumbnail cache:', e);
  }
}

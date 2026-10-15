/* ==========================================================================
   MEDICINE REMINDER & HEALTH TRACKER - PRESCRIPTION & REPORT VAULT
   ========================================================================== */

import { store } from './store.js';
import { showToast } from './reminders.js';

export function initPrescriptionsView() {
  renderDocuments();
  setupDocumentUpload();
}

export function renderDocuments() {
  const container = document.getElementById('documents-grid');
  if (!container) return;

  const state = store.getState();
  const docs = state.documents || [];

  if (docs.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px; color:var(--text-muted); grid-column:1/-1;">
        <div style="font-size:2.5rem; margin-bottom:8px;">📁</div>
        <h4>Digital Health Vault is Empty</h4>
        <p style="font-size:0.9rem;">Upload prescriptions, blood tests, and doctor notes for safekeeping.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = docs.map(doc => {
    return `
      <div class="doc-card" id="doc-${doc.id}">
        <div class="doc-thumb" onclick="window.previewDocument('${doc.id}')" style="cursor:pointer;">
          <img src="${doc.url}" alt="${doc.title}" class="doc-thumb-img" onerror="this.src='https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80'" />
          <span style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.65); color:#fff; font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:var(--radius-pill);">
            ${doc.category}
          </span>
        </div>

        <div class="doc-details">
          <h4 style="font-size:1.05rem; line-height:1.3;">${doc.title}</h4>
          <div style="font-size:0.8rem; color:var(--text-muted);">
            👨‍⚕️ ${doc.doctor}
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted);">
            📅 ${doc.date}
          </div>
          ${doc.notes ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">${doc.notes}</div>` : ''}

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:10px; border-top:1px solid var(--border-light);">
            <button class="btn btn-sm btn-primary" onclick="window.previewDocument('${doc.id}')">
              🔍 View Full
            </button>
            <button class="btn btn-sm btn-ghost text-danger" onclick="window.deleteDocument('${doc.id}')">
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.previewDocument = function(docId) {
  const state = store.getState();
  const doc = state.documents.find(d => d.id === docId);
  if (!doc) return;

  const modal = document.getElementById('document-preview-modal');
  if (!modal) return;

  document.getElementById('doc-preview-title').textContent = doc.title;
  document.getElementById('doc-preview-doctor').textContent = `Prescribed / Issued by: ${doc.doctor} on ${doc.date}`;
  document.getElementById('doc-preview-notes').textContent = doc.notes || 'No extra clinical notes.';
  
  const img = document.getElementById('doc-preview-image');
  if (img) img.src = doc.url;

  modal.classList.add('active');
};

window.deleteDocument = function(docId) {
  if (!confirm('Are you sure you want to delete this document from your vault?')) return;
  const state = store.getState();
  state.documents = state.documents.filter(d => d.id !== docId);
  store.saveState();
  renderDocuments();
  showToast('Document removed from vault.', 'info');
};

function setupDocumentUpload() {
  const fileInput = document.getElementById('vault-file-input');
  const dropzone = document.getElementById('vault-dropzone');
  const form = document.getElementById('upload-doc-form');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) {
        document.getElementById('doc-upload-filename').textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        const modal = document.getElementById('upload-document-modal');
        if (modal) modal.classList.add('active');
      }
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const title = document.getElementById('upload-input-title').value.trim();
      const doctor = document.getElementById('upload-input-doctor').value.trim();
      const category = document.getElementById('upload-input-category').value;
      const notes = document.getElementById('upload-input-notes').value.trim();
      const file = fileInput.files[0];

      if (!title) {
        showToast('Please enter document title.', 'warning');
        return;
      }

      function saveDocWithUrl(url) {
        const state = store.getState();
        state.documents.unshift({
          id: 'doc-' + Date.now(),
          title,
          doctor: doctor || 'Consulting Clinic',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          category,
          icon: category === 'Prescription' ? 'file-text' : 'activity',
          notes,
          fileType: 'image',
          url
        });

        store.saveState();
        renderDocuments();

        const modal = document.getElementById('upload-document-modal');
        if (modal) modal.classList.remove('active');
        form.reset();
        fileInput.value = '';
        document.getElementById('doc-upload-filename').textContent = '';

        showToast('✓ Document saved to Health Vault!', 'success');
      }

      if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
          saveDocWithUrl(evt.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        saveDocWithUrl('https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80');
      }
    });
  }
}

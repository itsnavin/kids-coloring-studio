import './style.css';
import { categories, designs, thumbnailSvg, pageSvg } from './art.js';
import { createDownload, saveDownload } from './export.js';

const $ = selector => document.querySelector(selector);
const state = { design: designs[0], category: 'all', detail: 'simple', weight: 5, orientation: 'portrait', mirror: false, showTitle: true };
let revision = 0;
let exporting = false;

function updatePreview() {
  revision += 1;
  $('#preview').innerHTML = pageSvg(state.design, state);
  $('#preview').classList.toggle('landscape', state.orientation === 'landscape');
  $('#preview').setAttribute('aria-label', `${state.design.name}, ${state.detail} detail, outline thickness ${state.weight}, A4 ${state.orientation}${state.mirror ? ', mirrored' : ''}. ${state.design.description}`);
  $('#selected-name').textContent = state.design.name;
  $('#selected-category').textContent = categories.find(category => category.id === state.design.category).name;
  $('#paper-badge').textContent = `A4 · ${state.orientation === 'portrait' ? 'Portrait' : 'Landscape'}`;
  $('#weight-value').textContent = state.weight;
  document.querySelectorAll('[data-design]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.design === state.design.id)));
  document.querySelectorAll('[data-detail]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.detail === state.detail)));
  $('#export-status').textContent = exporting ? 'Settings changed. Download again when the current export finishes.' : 'Free to print. No sign-up. Just add crayons.';
}

function renderGallery() {
  const visible = designs.filter(design => state.category === 'all' || design.category === state.category);
  $('#design-count').textContent = `${visible.length} designs`;
  $('#gallery').replaceChildren(...visible.map(design => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'design-card';
    button.dataset.design = design.id;
    button.setAttribute('aria-pressed', String(design.id === state.design.id));
    button.setAttribute('aria-label', `${design.name}: ${design.description}`);
    const image = document.createElement('span');
    image.className = 'card-image';
    image.innerHTML = thumbnailSvg(design);
    const name = document.createElement('span');
    name.className = 'card-name';
    name.textContent = design.name;
    const check = document.createElement('span');
    check.className = 'selection-check';
    check.setAttribute('aria-hidden', 'true');
    check.textContent = '✓';
    button.append(image, name, check);
    button.addEventListener('click', () => { state.design = design; updatePreview(); });
    return button;
  }));
}

$('#categories').replaceChildren(...categories.map(category => {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-pressed', String(category.id === state.category));
  button.dataset.category = category.id;
  button.textContent = `${category.symbol} ${category.name}`;
  button.addEventListener('click', () => {
    state.category = category.id;
    document.querySelectorAll('[data-category]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    if (category.id !== 'all' && state.design.category !== category.id) state.design = designs.find(design => design.category === category.id);
    renderGallery();
    updatePreview();
  });
  return button;
}));

document.querySelectorAll('[data-detail]').forEach(button => button.addEventListener('click', () => { state.detail = button.dataset.detail; updatePreview(); }));
$('#line-weight').addEventListener('input', event => { state.weight = Number(event.target.value); updatePreview(); });
$('#orientation').addEventListener('change', event => { state.orientation = event.target.value; updatePreview(); });
$('#mirror').addEventListener('change', event => { state.mirror = event.target.checked; updatePreview(); });
$('#show-title').addEventListener('change', event => { state.showTitle = event.target.checked; updatePreview(); });

async function download(format) {
  if (exporting) return;
  const snapshot = { ...state };
  const exportRevision = revision;
  exporting = true;
  document.querySelectorAll('[id^="download-"]').forEach(button => { button.disabled = true; });
  $('#export-status').textContent = `Preparing your ${format.toUpperCase()}…`;
  $('#export-status').classList.remove('error');
  try {
    const blob = await createDownload(snapshot.design, snapshot, format);
    if (revision !== exportRevision) {
      $('#export-status').textContent = 'Settings changed. This download was canceled. Download again for the latest page.';
      return;
    }
    saveDownload(blob, `${snapshot.design.id}-${snapshot.detail}-a4-${snapshot.orientation}.${format}`);
    $('#export-status').textContent = `${format.toUpperCase()} ready. Check your downloads${format === 'pdf' ? ' and print on A4 at actual size (100%).' : '.'}`;
  } catch (error) {
    console.error('Coloring page export failed:', error);
    $('#export-status').textContent = `Could not create the ${format.toUpperCase()}. ${error instanceof Error ? error.message : 'Please try again.'}`;
    $('#export-status').classList.add('error');
  } finally {
    exporting = false;
    document.querySelectorAll('[id^="download-"]').forEach(button => { button.disabled = false; });
  }
}

for (const format of ['pdf', 'png', 'svg']) $(`#download-${format}`).addEventListener('click', () => download(format));
renderGallery();
updatePreview();

import './style.css';
import './expansion.css';
import { categories as originalCategories, designs, thumbnailSvg, pageSvg } from './art.js';
import archive from './open-art.json';
import { decodePhoto, loadArchive, rasterData } from './raster.js';
import { createDownload, saveDownload } from './export.js';

const $ = selector => document.querySelector(selector);
const categories = [...originalCategories, { id: 'nature', name: 'Realistic nature', symbol: '❧' }];
const catalog = [...designs, ...archive];
const state = { design: designs[0], category: 'all', detail: 'simple', weight: 5, orientation: 'portrait', mirror: false, showTitle: true };
let revision = 0, exporting = false, processing = false, generation = 0, page = 0;
let pixels = null, worker = null, mode = 'gallery';
const pageSize = 12;

function buttons() {
  document.querySelectorAll('[id^="download-"]').forEach(button => { button.disabled = exporting || processing || !state.design || (state.design.kind && !state.design.rasterData); });
}
function cancelProcessing() {
  generation++; revision++;
  worker?.terminate(); worker = null; processing = false;
}
function imageStatus(text, error = false) {
  $('#image-status').textContent = text;
  $('#image-status').classList.toggle('error', error);
}
function credit() {
  const target = $('#art-credit');
  target.replaceChildren();
  const design = state.design;
  if (design.kind === 'archive') {
    target.append(document.createTextNode(`${design.author}. Public domain in the United States; rights elsewhere may differ. `));
    for (const [label, href] of [['Source & author', design.source], ['Rights policy', design.licenseUrl]]) {
      const link = document.createElement('a');
      link.textContent = label; link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer';
      target.append(link, document.createTextNode(' · '));
    }
    target.append(document.createTextNode('Grayscale, whitespace-trimmed scientific illustration. Not affiliated with or endorsed by NPS. Raster artwork; SVG embeds pixels.'));
  } else target.textContent = design.kind === 'photo' ? 'Photo-derived outline, processed locally. SVG embeds a raster image; it is not traced vector art. No cropping or stretching.' : 'Original Little Lines artwork · CC0 public-domain dedication.';
}

function updatePreview() {
  revision++;
  const ready = !state.design.kind || state.design.rasterData;
  if (ready) $('#preview').innerHTML = pageSvg(state.design, state);
  else $('#preview').textContent = processing ? 'Preparing outline…' : 'Choose a photo or retry the artwork.';
  $('#preview').classList.toggle('landscape', state.orientation === 'landscape');
  $('#preview').setAttribute('aria-label', `${state.design.name}, ${state.detail} detail, outline thickness ${state.weight}, A4 ${state.orientation}${state.mirror ? ', mirrored' : ''}. ${state.design.description}`);
  $('#selected-name').textContent = state.design.name;
  $('#selected-category').textContent = state.design.kind === 'photo' ? 'Your photo' : categories.find(category => category.id === state.design.category).name;
  $('#paper-badge').textContent = `A4 · ${state.orientation === 'portrait' ? 'Portrait' : 'Landscape'}`;
  $('#weight-value').textContent = state.weight;
  $('#svg-kind').textContent = state.design.kind ? 'Embedded raster' : 'Vector';
  $('#detail-field').hidden = state.design.kind === 'archive';
  $('#fixed-detail').hidden = state.design.kind !== 'archive';
  document.querySelectorAll('[data-design]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.design === state.design.id)));
  document.querySelectorAll('[data-detail]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.detail === state.detail)));
  $('#export-status').classList.remove('error');
  $('#export-status').textContent = exporting ? 'Settings changed. Download again when the current export finishes.' : processing ? 'Wait for the outline to finish before downloading.' : 'Free to print. No sign-up. Just add crayons.';
  credit(); buttons();
}

function processCurrent() {
  if (!pixels || !state.design.kind) return;
  cancelProcessing();
  const token = generation;
  processing = true;
  state.design = { ...state.design, rasterData: null };
  imageStatus('Processing in your browser…');
  updatePreview();
  worker = new Worker(new URL('./image-worker.js', import.meta.url), { type: 'module' });
  const fail = message => {
    if (token !== generation) return;
    worker?.terminate(); worker=null; processing=false;
    updatePreview(); imageStatus(`Could not process this image. ${message} Adjust a control to retry, or choose another image.`, true);
  };
  worker.onerror = event => { console.error('Outline worker failed:', event.message); fail(event.message || 'Image worker unavailable.'); };
  worker.onmessage = ({ data }) => {
    if (token !== generation) return;
    if (data.error) { fail(data.error); return; }
    try {
      state.design = { ...state.design, rasterData: rasterData(data.result), width: data.result.width, height: data.result.height };
      processing = false; worker.terminate(); worker=null; updatePreview();
      const coverage = data.result.coverage;
      imageStatus(coverage < .001 ? 'Very few edges found. Lower edge sensitivity or smoothing, or choose a higher-contrast photo.' :
        coverage > .25 ? 'This outline has a lot of ink. Raise edge sensitivity or smoothing to simplify it.' :
        state.design.kind === 'photo' ? 'Outline ready. Tune the controls if you see too much texture or missing edges.' : 'Nature drawing ready. Fine details are best for older artists.');
    } catch (error) { console.error('Outline encoding failed:', error); fail(error.message); }
  };
  worker.postMessage({ ...pixels, mode: state.design.kind === 'archive' ? 'archive' : 'photo', detail: state.detail, weight: state.weight,
    threshold: Number($('#edge-threshold').value), smoothing: Number($('#smoothing').value), cleanup: Number($('#cleanup').value) });
}

async function selectDesign(design) {
  cancelProcessing(); pixels=null;
  state.design = { ...design };
  if (!design.kind) { imageStatus(''); updatePreview(); return; }
  processing=true; const token=generation; updatePreview(); imageStatus('Loading locally bundled nature drawing…');
  try {
    const loaded = await loadArchive(design);
    if (token !== generation) return;
    pixels=loaded; processCurrent();
  } catch (error) {
    if (token !== generation) return;
    console.error('Artwork loading failed:', error);
    processing=false; updatePreview(); imageStatus(error.message, true);
  }
}

function renderGallery() {
  const query = $('#gallery-search').value.trim().toLowerCase();
  const visible = catalog.filter(design => (state.category === 'all' || design.category === state.category) &&
    `${design.name} ${design.description} ${design.category}`.toLowerCase().includes(query));
  page = Math.max(0, Math.min(page, Math.ceil(visible.length/pageSize)-1));
  $('#design-count').textContent = `${visible.length} designs`;
  $('#gallery-empty').hidden = visible.length !== 0;
  $('#page-number').textContent = `${visible.length ? page+1 : 0} / ${Math.ceil(visible.length/pageSize)}`;
  $('#previous-page').disabled = page === 0;
  $('#next-page').disabled = (page+1)*pageSize >= visible.length;
  $('#gallery').replaceChildren(...visible.slice(page*pageSize,(page+1)*pageSize).map(design => {
    const button=document.createElement('button');
    button.type='button'; button.className='design-card'; button.dataset.design=design.id;
    button.setAttribute('aria-pressed',String(design.id===state.design.id));
    button.setAttribute('aria-label',`${design.name}: ${design.kind ? 'Realistic NPS nature drawing.' : design.description}`);
    const image=document.createElement('span'); image.className='card-image';
    if (design.kind) {
      const img=document.createElement('img'); img.src=`${import.meta.env.BASE_URL}${design.thumbnail}`;
      img.alt=''; img.loading='lazy'; img.decoding='async'; img.width=300; img.height=Math.round(300*design.height/design.width);
      img.addEventListener('error',()=>{ img.replaceWith(document.createTextNode('Preview unavailable. Select to retry the full drawing.')); });
      image.append(img);
    } else image.innerHTML=thumbnailSvg(design);
    const name=document.createElement('span'); name.className='card-name'; name.textContent=design.name;
    const check=document.createElement('span'); check.className='selection-check'; check.setAttribute('aria-hidden','true'); check.textContent='✓';
    button.append(image,name,check);
    button.addEventListener('click',()=>selectDesign(design));
    return button;
  }));
}

$('#categories').replaceChildren(...categories.map(category=>{
  const button=document.createElement('button'); button.type='button'; button.dataset.category=category.id;
  button.setAttribute('aria-pressed',String(category.id===state.category)); button.textContent=`${category.symbol} ${category.name}`;
  button.addEventListener('click',()=>{
    state.category=category.id; page=0;
    document.querySelectorAll('[data-category]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    if (category.id!=='all' && state.design.category!==category.id) selectDesign(catalog.find(design=>design.category===category.id));
    renderGallery();
  });
  return button;
}));
$('#gallery-search').addEventListener('input',()=>{page=0;renderGallery();});
$('#previous-page').addEventListener('click',()=>{page--;renderGallery();});
$('#next-page').addEventListener('click',()=>{page++;renderGallery();});

function setMode(next) {
  mode=next;
  $('#gallery-tools').hidden=mode!=='gallery'; $('#photo-tools').hidden=mode!=='photo';
  $('#gallery-mode').setAttribute('aria-pressed',String(mode==='gallery'));
  $('#photo-mode').setAttribute('aria-pressed',String(mode==='photo'));
  $('#photo-file').value='';
  if (mode==='gallery') {
    state.category='all'; page=0; $('#gallery-search').value='';
    document.querySelectorAll('[data-category]').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.category==='all')));
    selectDesign(designs[0]); renderGallery();
  }
  else {
    cancelProcessing(); pixels=null;
    state.design={id:'my-photo',name:'My photo outline',category:'photo',kind:'photo',description:'Your locally processed photo.'};
    updatePreview(); imageStatus('Choose a JPEG or PNG to begin. No photo is sent to a server.');
  }
}
$('#gallery-mode').addEventListener('click',()=>setMode('gallery'));
$('#photo-mode').addEventListener('click',()=>setMode('photo'));
$('#clear-photo').addEventListener('click',()=>setMode('gallery'));
$('#photo-file').addEventListener('change',async event=>{
  const file=event.target.files[0];
  if (!file) return;
  cancelProcessing(); pixels=null; processing=true;
  state.design={id:'my-photo',name:'My photo outline',category:'photo',kind:'photo',description:'Your locally processed photo.'};
  const token=generation; updatePreview(); imageStatus('Reading photo locally…');
  try {
    const decoded=await decodePhoto(file);
    if (token!==generation) return;
    pixels=decoded; processCurrent();
  } catch(error) {
    if(token!==generation) return;
    console.error('Photo decoding failed:',error);
    processing=false; updatePreview(); imageStatus(error.message,true);
  } finally { event.target.value=''; }
});
for (const [id,output] of [['edge-threshold','edge-value'],['smoothing','smoothing-value'],['cleanup','cleanup-value']]) {
  $(`#${id}`).addEventListener('input',event=>{ $(`#${output}`).textContent=event.target.value; processCurrent(); });
}
document.querySelectorAll('[data-detail]').forEach(button=>button.addEventListener('click',()=>{
  state.detail=button.dataset.detail; if(pixels) processCurrent(); else updatePreview();
}));
$('#line-weight').addEventListener('input',event=>{state.weight=Number(event.target.value); if(pixels) processCurrent(); else updatePreview();});
$('#orientation').addEventListener('change',event=>{state.orientation=event.target.value;updatePreview();});
$('#mirror').addEventListener('change',event=>{state.mirror=event.target.checked;updatePreview();});
$('#show-title').addEventListener('change',event=>{state.showTitle=event.target.checked;updatePreview();});

async function download(format) {
  if (exporting || processing) return;
  const snapshot={...state}; const exportRevision=revision; exporting=true; buttons();
  $('#export-status').textContent=`Preparing your ${format.toUpperCase()}…`; $('#export-status').classList.remove('error');
  try {
    const blob=await createDownload(snapshot.design,snapshot,format);
    if(revision!==exportRevision) {$('#export-status').textContent='Settings changed. This download was canceled. Download again for the latest page.';return;}
    saveDownload(blob,`${snapshot.design.id}-${snapshot.detail}-a4-${snapshot.orientation}.${format}`);
    $('#export-status').textContent=`${format.toUpperCase()} ready. Check your downloads${format==='pdf'?' and print on A4 at actual size (100%).':'.'}`;
  } catch(error) {
    console.error('Coloring page export failed:',error);
    $('#export-status').textContent=`Could not create the ${format.toUpperCase()}. ${error instanceof Error?error.message:'Please try again.'}`;
    $('#export-status').classList.add('error');
  } finally {exporting=false;buttons();}
}
for (const format of ['pdf','png','svg']) $(`#download-${format}`).addEventListener('click',()=>download(format));
renderGallery(); updatePreview();

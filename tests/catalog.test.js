import test from 'node:test';
import assert from 'node:assert/strict';
import { DOMParser } from '@xmldom/xmldom';
import { artwork, categories, designs, escapeXml, pageSvg, thumbnailSvg } from '../src/art.js';
import { rasterSize } from '../src/export.js';

function parse(svg) {
  const errors = [];
  const doc = new DOMParser({ errorHandler: {
    warning: message => errors.push(message),
    error: message => errors.push(message),
    fatalError: message => errors.push(message),
  } }).parseFromString(svg, 'image/svg+xml');
  assert.deepEqual(errors, []);
  assert.equal(doc.documentElement.tagName, 'svg');
  return doc;
}

test('curated original catalog has two designs in each of six categories', () => {
  assert.equal(designs.length, 12);
  assert.equal(new Set(designs.map(design => design.id)).size, 12);
  for (const category of categories.slice(1)) assert.equal(designs.filter(design => design.category === category.id).length, 2);
  for (const design of designs) {
    assert.match(design.id, /^[a-z-]+$/);
    assert.match(design.provenance, /Original.*CC0-1.0/);
    assert.ok(design.description.length > 20);
  }
});

test('all drawings produce finite, safe SVG with real additional detail', () => {
  for (const design of designs) {
    const simple = artwork(design);
    const detailed = artwork(design, { detail: 'detailed', weight: 8, mirror: true });
    assert.ok(detailed.length > simple.length + 70, design.id);
    assert.match(detailed, /stroke-width="8"/);
    assert.match(detailed, /translate\(600 0\) scale\(-1 1\)/);
    const doc = parse(thumbnailSvg(design));
    assert.equal(doc.documentElement.getAttribute('viewBox'), design.frame.join(' '));
    assert.ok(design.frame.every(value => Number.isFinite(value) && value > 0));
    assert.ok(doc.getElementsByTagName('path').length > 0);
    for (const path of Array.from(doc.getElementsByTagName('path'))) {
      assert.match(path.getAttribute('d'), /^[Mm]/);
      assert.doesNotMatch(path.getAttribute('d'), /NaN|Infinity|undefined/);
    }
    assert.doesNotMatch(simple + detailed, /script|foreignObject|href|url\(|onload|style=/i);
    parse(`<svg xmlns="http://www.w3.org/2000/svg">${detailed}</svg>`);
    for (const orientation of ['portrait', 'landscape']) {
      const page = parse(pageSvg(design, { orientation, detail: 'detailed', weight: 8, showTitle: true }));
      assert.equal(page.documentElement.getAttribute('width'), orientation === 'portrait' ? '210mm' : '297mm');
      assert.equal(page.documentElement.getAttribute('height'), orientation === 'portrait' ? '297mm' : '210mm');
    }
  }
});

test('options are constrained and page text is XML escaped', () => {
  assert.throws(() => artwork(designs[0], { weight: NaN }));
  assert.throws(() => artwork(designs[0], { weight: 100 }));
  assert.throws(() => artwork(designs[0], { detail: '<script>' }));
  assert.throws(() => pageSvg(designs[0], { orientation: 'square' }));
  const doc = parse(pageSvg({ ...designs[0], name: '<script>&"\'' }, { showTitle: true }));
  assert.equal(doc.getElementsByTagName('script').length, 0);
  assert.equal(doc.getElementsByTagName('text')[0].textContent, '<script>&"\'');
  assert.equal(escapeXml('<>&"\''), '&lt;&gt;&amp;&quot;&apos;');
  for (const orientation of ['portrait', 'landscape']) {
    const [width, height] = rasterSize(orientation);
    assert.ok(width * height < 9_000_000);
    assert.deepEqual([width, height].sort((a, b) => a - b), [2480, 3508]);
  }
});

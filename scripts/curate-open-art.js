import { readFile, writeFile, unlink } from 'node:fs/promises';

// Explicit visual-review allowlist, not automatic acceptance of an archive.
const accepted = {
  'nps-196860634': 'Hagerman horse',
  'nps-196860577': 'Long-nosed dolphin',
  'nps-196860538': 'Freshwater stingray',
  'nps-196860493': 'Ancient deer',
  'nps-196860400': 'Straight-shelled cephalopod',
  'nps-196861305': 'Short-faced bear',
  'nps-196869479': 'Ancient coral',
  'nps-196860176': 'Long-horned bison',
  'nps-110958142': 'Freshwater reptile',
  'nps-196869656': 'Spiral-shelled cephalopod',
  'nps-196869854': 'Trilobite',
  'nps-196859967': 'Anchisaurus',
  'nps-196860068': 'Hadrosaur',
  'nps-110964162': 'Sea scorpion',
  'nps-127943854': 'American cheetah',
  'nps-112640040': 'Nanuqsaurus',
  'nps-196862433': 'Ammonite',
  'nps-196859716': 'Ancient wasp',
  'nps-110964733': 'Mosasaur',
  'nps-196876655': 'Prehistoric shark',
  'nps-112583130': 'Saber-toothed cat',
  'nps-196876385': 'Ancient seed fern',
};
const records = JSON.parse(await readFile('src/open-art.json', 'utf8'));
for (const record of records) {
  if (accepted[record.id]) {
    record.name = accepted[record.id];
    record.review = 'Individually visually reviewed; realistic scientific coloring drawing. Fine details suit older artists.';
  } else {
    await unlink(`public/${record.asset}`);
    await unlink(`public/${record.thumbnail}`);
  }
}
const selected = records.filter(record => accepted[record.id]);
if (selected.length !== Object.keys(accepted).length) throw new Error('Allowlist contains missing sources');
await writeFile('src/open-art.json', JSON.stringify(selected, null, 2) + '\n');
console.log(`Accepted ${selected.length} distinct unframed artworks; rejected ${records.length - selected.length} framed, duplicate, overly dense or faint candidates.`);

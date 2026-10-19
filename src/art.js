// All artwork below is original vector illustration created for this project.
const path = (d, extra = '') => `<path d="${d}" ${extra}/>`;
const ellipse = (cx, cy, rx, ry, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${extra}/>`;
const circle = (cx, cy, r, extra = '') => ellipse(cx, cy, r, r, extra);
const rect = (x, y, w, h, r = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${extra}/>`;
const line = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none"/>`;
const eye = (x, y) => circle(x, y, 6, 'fill="black" stroke="none"');
const star = (x, y, s = 18) => path(`M${x} ${y-s}L${x+s*.3} ${y-s*.3} ${x+s} ${y} ${x+s*.3} ${y+s*.3} ${x} ${y+s} ${x-s*.3} ${y+s*.3} ${x-s} ${y} ${x-s*.3} ${y-s*.3}Z`);
const leaf = (x, y) => path(`M${x} ${y}Q${x-40} ${y-50} ${x+10} ${y-65}Q${x+40} ${y-25} ${x} ${y}Z`);
const flower = (x, y) => [0, 72, 144, 216, 288].map(a => {
  const t = a * Math.PI / 180;
  return circle(x + Math.cos(t) * 15, y + Math.sin(t) * 15, 12);
}).join('') + circle(x, y, 10);

function bird(detail) {
  return path('M216 386L167 446 247 415Z') +
    path('M245 419L241 474M283 423L286 474M221 477H254M271 477H302', 'fill="none"') +
    path('M186 310C174 224 235 178 314 203C342 142 429 151 448 211L496 241 449 263C435 335 386 413 300 424C237 432 198 386 186 310Z') +
    path('M452 219L496 241 449 249Z') +
    path('M221 284C260 247 343 278 369 304C350 359 284 380 241 342C229 329 225 306 221 284Z') +
    eye(409, 214) + path('M392 261Q407 274 424 262', 'fill="none"') +
    (detail ? path('M252 293Q274 325 306 333M280 285Q305 309 337 314', 'fill="none"') + leaf(105, 461) + line(105, 461, 105, 489) + star(158, 185) + star(491, 369, 14) : '');
}

function owl(detail) {
  return path('M246 448L244 485M264 451L264 483M335 451L335 483M354 448L356 485', 'fill="none"') +
    path('M151 492Q302 472 452 492L450 512Q300 495 152 512Z') +
    path('M173 254L166 117 258 171Q300 151 342 171L434 117 427 254C467 377 407 458 300 458C193 458 133 377 173 254Z') +
    path('M184 297Q153 376 225 418Q257 355 236 320Z') +
    path('M416 297Q447 376 375 418Q343 355 364 320Z') +
    ellipse(247, 251, 61, 69) + ellipse(353, 251, 61, 69) +
    circle(250, 253, 19) + circle(350, 253, 19) + eye(250, 253) + eye(350, 253) +
    path('M282 300L300 326 318 300Z') +
    (detail ? path('M265 354L278 366 291 354M309 354L322 366 335 354M279 390L292 402 305 390M322 389L335 401 348 389', 'fill="none"') + leaf(475, 494) + star(112, 232, 16) + star(478, 176, 18) : '');
}

function cat(detail) {
  return path('M389 421C501 445 528 338 479 334C442 331 487 389 401 378Z') +
    ellipse(300, 388, 113, 115) +
    path('M211 224L197 103 272 157Q303 149 332 157L408 103 393 225C425 304 365 338 302 338C237 338 176 304 211 224Z') +
    path('M216 139L224 191 251 170ZM389 139L381 191 355 170Z') +
    path('M251 243Q266 227 281 243M326 243Q341 227 356 243', 'fill="none"') +
    path('M288 263Q302 256 316 263L302 278Z') +
    path('M302 278V287Q287 306 273 288M302 287Q317 306 331 288M244 272L191 260M244 286L191 291M359 272L412 260M359 286L412 291', 'fill="none"') +
    ellipse(255, 477, 40, 26) + ellipse(348, 477, 40, 26) +
    (detail ? path('M282 167L288 201 302 184 316 201 322 166M275 347Q302 367 329 347M241 476V489M256 475V491M333 476V489M348 475V491', 'fill="none"') + flower(129, 440) + line(129, 466, 129, 501) : '');
}

function turtle(detail) {
  return ellipse(229, 448, 38, 42) + ellipse(365, 448, 38, 42) +
    path('M157 384L108 416 159 421Z') +
    path('M369 353C406 309 437 297 468 310C528 331 514 413 469 424C436 432 401 408 375 416Z') +
    path('M155 402C141 264 215 208 298 208C385 208 432 290 420 402Z') +
    path('M158 402H418L404 427H173Z') +
    path('M265 271L327 271 358 323 327 374 265 374 235 323Z') +
    path('M265 271L241 225M327 271L349 226M358 323L410 310M327 374L342 402M265 374L250 402M235 323L160 310', 'fill="none"') +
    eye(471, 345) + path('M482 378Q469 392 454 380', 'fill="none"') +
    (detail ? circle(286, 310, 10) + circle(311, 338, 12) + path('M213 448V466M228 450V471M350 450V469M366 451V472', 'fill="none"') + flower(107, 287) + line(107, 313, 107, 374) + leaf(498, 496) : '');
}

function longneck(detail) {
  return path('M376 351C427 384 460 375 507 339Q490 425 390 425Z') +
    path('M179 330C143 271 137 221 155 162C160 122 217 104 243 136C266 165 251 195 225 200C210 250 236 296 262 313C346 277 419 321 413 393L398 488H351L349 422Q308 438 270 421L258 488H210L213 404C189 386 181 361 179 330Z') +
    path('M165 181Q186 196 209 182', 'fill="none"') + eye(211, 153) +
    (detail ? ellipse(287, 346, 22, 16) + ellipse(337, 369, 24, 19) + ellipse(291, 396, 15, 11) + path('M220 467H256M354 467H399', 'fill="none"') + leaf(105, 482) + line(105, 482, 105, 511) + star(372, 173, 20) : '');
}

function stego(detail) {
  return path('M172 314L159 258 208 278 216 222 260 255 292 205 321 251 368 221 380 274 430 259 426 318Z') +
    path('M403 345Q462 355 512 310L503 348 531 355 496 374Q460 413 394 408Z') +
    path('M169 312C226 268 362 278 406 333C427 363 416 399 391 418L389 479H347L337 429H265L251 479H209L205 414C168 416 144 392 147 365L109 369C64 375 65 320 94 308C123 296 150 308 169 312Z') +
    eye(107, 327) + path('M84 350Q104 361 122 348', 'fill="none"') +
    (detail ? circle(217, 342, 15) + circle(259, 358, 20) + circle(306, 339, 13) + circle(355, 372, 18) + path('M215 457H254M348 457H389', 'fill="none"') + leaf(469, 482) : '');
}

function cottage(detail) {
  return rect(146, 260, 309, 236, 3) +
    rect(385, 124, 42, 105, 3) +
    path('M107 270L300 108 493 270 465 294 300 156 135 294Z') +
    rect(263, 345, 74, 151, 35) +
    rect(177, 322, 55, 66, 6) + rect(368, 322, 55, 66, 6) +
    line(205, 324, 205, 386) + line(179, 355, 230, 355) + line(396, 324, 396, 386) + line(370, 355, 421, 355) +
    circle(320, 429, 4, 'fill="black" stroke="none"') +
    (detail ? circle(300, 243, 29) + line(273, 243, 327, 243) + line(300, 216, 300, 270) + rect(167, 389, 77, 15, 4) + rect(357, 389, 77, 15, 4) + flower(107, 449) + line(107, 475, 107, 496) + flower(494, 449) + line(494, 475, 494, 496) + path('M267 507L242 535M332 507L358 535', 'fill="none"') : '');
}

function castle(detail) {
  return rect(166, 278, 268, 214) +
    rect(103, 222, 92, 270) + rect(405, 222, 92, 270) +
    path('M90 225L149 123 208 225ZM392 225L451 123 510 225Z') +
    path('M236 279V181H264V206H286V181H314V206H336V181H364V279Z') +
    path('M300 181V103L356 121 300 141Z') +
    path('M250 492V397C250 330 350 330 350 397V492Z') +
    rect(134, 282, 30, 54, 15) + rect(436, 282, 30, 54, 15) +
    (detail ? line(300, 372, 300, 489) + circle(283, 434, 4, 'fill="black" stroke="none"') + circle(317, 434, 4, 'fill="black" stroke="none"') + path('M107 385H191M407 385H493M171 446H205M395 446H430M241 307H275M324 307H357', 'fill="none"') + star(91, 130, 18) + star(502, 94, 15) : '');
}

function rocket(detail) {
  return path('M236 333Q165 357 158 452L240 415ZM364 333Q435 357 442 452L360 415Z') +
    path('M266 445Q241 499 300 548Q359 499 334 445Z') +
    path('M284 450Q275 488 300 512Q325 488 316 450Z') +
    path('M237 420C212 276 225 173 300 90C375 173 388 276 363 420Z') +
    path('M254 159Q300 185 346 159', 'fill="none"') +
    circle(300, 259, 51) + circle(300, 259, 35) + rect(235, 419, 130, 26, 8) +
    (detail ? rect(273, 343, 54, 38, 8) + line(285, 354, 315, 354) + line(285, 367, 315, 367) + star(135, 182, 23) + star(453, 277, 28) + star(412, 117, 16) + circle(127, 326, 18) : '');
}

function computer(detail) {
  return path('M265 365L252 433H348L335 365Z') + rect(225, 429, 150, 22, 10) +
    rect(101, 126, 398, 255, 22) + rect(121, 147, 358, 196, 8) +
    circle(300, 362, 6) +
    path('M228 224L211 243 228 262M372 224L389 243 372 262', 'fill="none"') +
    path('M269 222C248 201 221 226 241 247L300 299 359 247C379 226 352 201 331 222L300 250Z') +
    path('M130 470H423L454 520H99Z') +
    ellipse(498, 485, 24, 35) + line(498, 452, 498, 472) +
    (detail ? path('M147 485H405M131 504H423M179 478L171 508M222 478L218 508M265 478V508M308 478L312 508M351 478L359 508M394 478L406 508', 'fill="none"') + star(73, 94, 17) + star(528, 185, 15) : '');
}

function hero(detail) {
  return path('M220 276Q172 306 143 447L226 420 254 285ZM380 276Q428 306 457 447L374 420 346 285Z') +
    rect(228, 406, 62, 92, 14) + rect(310, 406, 62, 92, 14) +
    rect(212, 484, 81, 35, 12) + rect(307, 484, 81, 35, 12) +
    path('M222 273Q176 267 168 308L157 374 201 387 232 328ZM378 273Q424 267 432 308L443 374 399 387 368 328Z') +
    circle(178, 399, 27) + circle(422, 399, 27) +
    path('M222 270Q300 247 378 270L363 401Q300 427 237 401Z') +
    rect(223, 130, 154, 136, 36) + rect(210, 180, 13, 44, 6) + rect(377, 180, 13, 44, 6) +
    rect(242, 166, 116, 50, 19) + eye(270, 190) + eye(330, 190) +
    path('M279 236Q300 250 321 236', 'fill="none"') +
    circle(300, 331, 37) + star(300, 331, 23) +
    (detail ? path('M243 384Q300 401 357 384M242 450H275M325 450H358M176 323L204 331M396 331L424 323M285 146H315', 'fill="none"') + star(126, 197, 19) + star(467, 156, 22) : '');
}

function explorer(detail) {
  return line(300, 122, 300, 91) + circle(300, 79, 12) +
    rect(230, 414, 57, 78, 16) + rect(313, 414, 57, 78, 16) +
    rect(211, 482, 79, 32, 13) + rect(310, 482, 79, 32, 13) +
    path('M224 290L185 275 157 322 192 348 240 319Z') +
    path('M177 282L144 242 115 264 149 316Z') +
    circle(122, 240, 29) +
    path('M376 291L415 279 445 349 408 368 364 321Z') +
    circle(435, 380, 29) +
    rect(222, 272, 156, 151, 28) +
    rect(209, 122, 182, 136, 38) +
    rect(229, 151, 142, 61, 23) +
    eye(267, 181) + eye(333, 181) + path('M282 230Q300 244 318 230', 'fill="none"') +
    path('M263 312H337V354Q300 385 263 354Z') +
    path('M285 340L297 352 318 328', 'fill="none"') +
    (detail ? rect(248, 390, 104, 12, 6) + path('M241 452H276M324 452H359M109 223L123 238 135 223M419 380H447', 'fill="none"') + star(465, 186, 25) + star(119, 421, 22) : '');
}

export const categories = [
  { id: 'all', name: 'All pictures', symbol: '✦' },
  { id: 'birds', name: 'Birds', symbol: '♧' },
  { id: 'animals', name: 'Animals', symbol: '♡' },
  { id: 'dinosaurs', name: 'Dinosaurs', symbol: '☆' },
  { id: 'houses', name: 'Houses', symbol: '⌂' },
  { id: 'technology', name: 'Technology', symbol: '⌘' },
  { id: 'heroes', name: 'Robot heroes', symbol: '⚙' },
];

const design = (id, name, category, draw, description, frame) => Object.freeze({
  id, name, category, draw, description, frame, provenance: 'Original vector artwork created for kids-coloring-studio; CC0-1.0.',
});
export const designs = [
  design('garden-bird', 'Garden songbird', 'birds', bird, 'A cheerful bird with a big feathered wing.', [55, 130, 465, 385]),
  design('woodland-owl', 'Woodland owl', 'birds', owl, 'A wide-eyed owl perched on a branch.', [75, 95, 440, 440]),
  design('cozy-cat', 'Cozy kitten', 'animals', cat, 'A smiling kitten with a curling tail.', [75, 80, 450, 445]),
  design('happy-turtle', 'Happy turtle', 'animals', turtle, 'A gentle turtle with a patchwork shell.', [60, 185, 475, 330]),
  design('gentle-giant', 'Gentle giant', 'dinosaurs', longneck, 'A friendly long-necked dinosaur.', [50, 95, 480, 435]),
  design('sunny-stego', 'Sunny stegosaurus', 'dinosaurs', stego, 'A little dinosaur with big back plates.', [45, 180, 510, 340]),
  design('little-cottage', 'Little cottage', 'houses', cottage, 'A welcoming cottage with a tall roof.', [65, 85, 470, 475]),
  design('storybook-castle', 'Storybook castle', 'houses', castle, 'A castle with turrets and a flying flag.', [55, 55, 490, 460]),
  design('moon-rocket', 'Moon rocket', 'technology', rocket, 'A rocket ready for a space adventure.', [85, 65, 425, 505]),
  design('happy-computer', 'Happy computer', 'technology', computer, 'A friendly desktop with a heart on its screen.', [40, 60, 520, 480]),
  design('kindness-captain', 'Kindness captain', 'heroes', hero, 'An original armored robot hero with a star badge and cape.', [85, 105, 425, 440]),
  design('little-explorer', 'Little explorer', 'heroes', explorer, 'An original friendly robot waving hello.', [75, 45, 440, 490]),
];

export function artwork(design, { detail = 'simple', weight = 5, mirror = false } = {}) {
  if (!['simple', 'detailed'].includes(detail) || !Number.isFinite(weight) || weight < 3 || weight > 8) throw new Error('Invalid drawing options.');
  return `<g fill="white" stroke="black" stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round"${mirror ? ' transform="translate(600 0) scale(-1 1)"' : ''}>${design.draw(detail === 'detailed')}</g>`;
}

export const escapeXml = text => String(text).replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]);

export function thumbnailSvg(design) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${design.frame.join(' ')}" aria-hidden="true"><rect width="600" height="600" fill="white"/>${artwork(design)}</svg>`;
}

export function pageSvg(design, options = {}) {
  const orientation = options.orientation ?? 'portrait';
  if (!['portrait', 'landscape'].includes(orientation)) throw new Error('Invalid paper orientation.');
  const landscape = orientation === 'landscape';
  const width = landscape ? 1123 : 794;
  const height = landscape ? 794 : 1123;
  const size = Math.min(width - 112, height - 154);
  const x = (width - size) / 2;
  const y = (height - size) / 2 + (options.showTitle ? 18 : 0);
  const [frameX, frameY, frameWidth, frameHeight] = design.frame;
  const frame = options.mirror ? [600 - frameX - frameWidth, frameY, frameWidth, frameHeight] : design.frame;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${landscape ? 297 : 210}mm" height="${landscape ? 210 : 297}mm" viewBox="0 0 ${width} ${height}"><title>${escapeXml(design.name)} coloring page</title><rect width="${width}" height="${height}" fill="white"/>${options.showTitle ? `<text x="${width / 2}" y="${y - 25}" text-anchor="middle" fill="black" font-family="sans-serif" font-size="22">${escapeXml(design.name)}</text>` : ''}<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${frame.join(' ')}">${artwork(design, options)}</svg></svg>`;
}

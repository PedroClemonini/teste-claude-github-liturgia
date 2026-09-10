/**
 * Transposição dinâmica de cifras.
 *
 * A transposição opera sobre o texto ChordPro original: só o conteúdo dos
 * colchetes muda, então letra, diretivas e espaçamento continuam intactos e o
 * alinhamento acorde/sílaba é preservado por construção.
 */
import { parseChord, formatChord } from './chord.js';

const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const PITCH = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, 'E#': 5,
  F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10,
  B: 11, Cb: 11, 'B#': 0,
};

/** Tons cuja armadura usa bemóis (lado bemol do círculo das quintas). */
const FLAT_KEYS = new Set([
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb',
  'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm',
]);

/** @param {string} note */
export function pitchOf(note) {
  const value = PITCH[note];
  return value === undefined ? null : value;
}

/**
 * O tom destino pede grafia com bemóis?
 * @param {string} key ex.: "Bb", "Dm", "G"
 */
export function keyPrefersFlats(key) {
  if (typeof key !== 'string' || !key) return false;
  const parsed = parseChord(key);
  if (!parsed) return false;
  const minor = /^m(?!aj)/.test(parsed.suffix);
  const normalized = `${parsed.root}${minor ? 'm' : ''}`;
  return FLAT_KEYS.has(normalized);
}

function transposeNote(note, semitones, preferFlats) {
  const pitch = pitchOf(note);
  if (pitch === null) return note;
  const scale = preferFlats ? FLAT_NOTES : SHARP_NOTES;
  return scale[(((pitch + semitones) % 12) + 12) % 12];
}

/**
 * @param {string} chord cifra isolada, ex.: "G7/B"
 * @param {number} semitones
 * @param {{preferFlats?: boolean, targetKey?: string}} [options]
 * @returns {string} cifra transposta, ou o texto original se não for cifra
 */
export function transposeChord(chord, semitones, options = {}) {
  const parsed = parseChord(chord);
  if (!parsed) return chord;
  const preferFlats = options.targetKey
    ? keyPrefersFlats(options.targetKey)
    : Boolean(options.preferFlats);
  return formatChord({
    root: transposeNote(parsed.root, semitones, preferFlats),
    suffix: parsed.suffix,
    bass: parsed.bass ? transposeNote(parsed.bass, semitones, preferFlats) : null,
  });
}

/**
 * Distância em semitons entre dois tons, pelo caminho mais curto (-5..6).
 * @param {string} fromKey
 * @param {string} toKey
 * @returns {number}
 */
export function semitonesBetween(fromKey, toKey) {
  const from = parseChord(fromKey);
  const to = parseChord(toKey);
  if (!from || !to) return 0;
  const raw = (((pitchOf(to.root) - pitchOf(from.root)) % 12) + 12) % 12;
  return raw > 6 ? raw - 12 : raw;
}

/**
 * Transpõe a indicação de tom mantendo o modo (maior/menor e demais sufixos).
 * @param {string} key
 * @param {number} semitones
 * @param {{preferFlats?: boolean}} [options]
 */
export function transposeKey(key, semitones, options = {}) {
  return transposeChord(key, semitones, options);
}

const BRACKETED = /\[([^\]\n]*)\]/g;

/**
 * Transpõe todos os acordes de um texto ChordPro.
 * @param {string} text
 * @param {number} semitones
 * @param {{preferFlats?: boolean, targetKey?: string}} [options]
 * @returns {string}
 */
export function transposeChordPro(text, semitones, options = {}) {
  if (typeof text !== 'string' || !text) return '';
  const normalized = ((semitones % 12) + 12) % 12;
  if (normalized === 0) return text;
  return text.replace(BRACKETED, (whole, inner) => {
    const transposed = transposeChord(inner, semitones, options);
    return `[${transposed}]`;
  });
}

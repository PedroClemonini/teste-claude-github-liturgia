/**
 * Interpretação do formato ChordPro.
 *
 * O acorde é digitado entre colchetes, imediatamente antes da sílaba em que
 * deve soar ("[G]Pai Nosso que est[C]ais no c[G]éu"). O parser devolve pares
 * acorde+sílaba: quem renderiza empilha os dois no mesmo bloco, de modo que o
 * acorde nunca escorregue para outra sílaba, qualquer que seja a largura da
 * tela.
 */
import { parseChord } from './chord.js';

/** Diretivas abreviadas aceitas pelo formato. */
const DIRECTIVE_ALIASES = {
  t: 'title',
  st: 'subtitle',
  c: 'comment',
  ci: 'comment',
  soc: 'start_of_chorus',
  eoc: 'end_of_chorus',
  sob: 'start_of_bridge',
  eob: 'end_of_bridge',
};

const DIRECTIVE_RE = /^\{\s*([a-zA-Z_]+)\s*(?::\s*([\s\S]*?))?\s*\}$/;

/**
 * Quebra uma linha de letra em pares acorde/sílaba.
 * @param {string} line
 * @returns {Array<{chord: string|null, lyrics: string}>}
 */
export function splitLine(line) {
  const pairs = [];
  let cursor = 0;
  let pendingChord = null;
  let buffer = '';

  const flush = () => {
    if (pendingChord === null && buffer === '') return;
    pairs.push({ chord: pendingChord, lyrics: buffer });
    pendingChord = null;
    buffer = '';
  };

  while (cursor < line.length) {
    const char = line[cursor];
    if (char === '[') {
      const close = line.indexOf(']', cursor);
      if (close === -1) {
        // Colchete não fechado: o resto da linha vira letra literal, sem
        // roubar o acorde que já estava pendente.
        const rest = line.slice(cursor);
        flush();
        pairs.push({ chord: null, lyrics: rest });
        cursor = line.length;
        break;
      }
      flush();
      pendingChord = line.slice(cursor + 1, close).trim();
      cursor = close + 1;
      continue;
    }
    buffer += char;
    cursor += 1;
  }
  flush();
  return pairs;
}

/**
 * @param {string|null|undefined} text
 * @returns {{meta: Record<string,string>, lines: Array<object>}}
 */
export function parseChordPro(text) {
  const result = { meta: {}, lines: [] };
  if (typeof text !== 'string' || text.trim() === '') return result;

  let inChorus = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();

    if (line.trim() === '') {
      result.lines.push({ type: 'empty' });
      continue;
    }

    const directive = DIRECTIVE_RE.exec(line.trim());
    if (directive) {
      const name = (DIRECTIVE_ALIASES[directive[1]] ?? directive[1]).toLowerCase();
      const value = (directive[2] ?? '').trim();

      if (name === 'comment') {
        result.lines.push({ type: 'comment', text: value });
      } else if (name === 'start_of_chorus') {
        inChorus = true;
        result.lines.push({ type: 'chorus-start' });
      } else if (name === 'end_of_chorus') {
        inChorus = false;
        result.lines.push({ type: 'chorus-end' });
      } else if (name === 'start_of_bridge') {
        result.lines.push({ type: 'bridge-start' });
      } else if (name === 'end_of_bridge') {
        result.lines.push({ type: 'bridge-end' });
      } else {
        result.meta[name] = value;
      }
      continue;
    }

    const lyricLine = { type: 'lyric', pairs: splitLine(line) };
    if (inChorus) lyricLine.chorus = true;
    result.lines.push(lyricLine);
  }

  return result;
}

/**
 * Letra sem acordes nem diretivas — usada na busca por trecho.
 * @param {string} text
 * @returns {string}
 */
export function extractPlainLyrics(text) {
  const doc = parseChordPro(text);
  return doc.lines
    .filter((line) => line.type === 'lyric')
    .map((line) => line.pairs.map((pair) => pair.lyrics).join(''))
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Tom da música: diretiva {key: ...} ou, na falta dela, o primeiro acorde.
 * @param {string} text
 * @returns {string|null}
 */
export function extractKey(text) {
  const doc = parseChordPro(text);
  if (doc.meta.key && parseChord(doc.meta.key)) return doc.meta.key;
  for (const line of doc.lines) {
    if (line.type !== 'lyric') continue;
    for (const pair of line.pairs) {
      if (pair.chord && parseChord(pair.chord)) return pair.chord;
    }
  }
  return null;
}

/**
 * Agrupa os pares acorde/sílaba em palavras.
 *
 * Sem isso, cada par vira um bloco independente e o navegador quebra a linha
 * no meio de uma palavra cifrada ("bendi" numa linha, "zemos" na outra). Aqui
 * os pares são recortados nos espaços e reagrupados: a quebra passa a
 * acontecer só entre palavras, e cada acorde continua colado à sua sílaba.
 *
 * @param {Array<{chord: string|null, lyrics: string}>} pairs
 * @returns {Array<{segments: Array<{chord: string|null, text: string}>}>}
 */
export function groupIntoWords(pairs) {
  // Recorta cada par em segmentos que terminam depois do espaço, preservando
  // o acorde no primeiro segmento (é ali que ele soa).
  const segments = [];
  for (const pair of pairs) {
    const parts = pair.lyrics.match(/\S+\s*|\s+/g) ?? [''];
    parts.forEach((text, index) => {
      segments.push({ chord: index === 0 ? (pair.chord ?? null) : null, text });
    });
  }

  const words = [];
  let current = null;

  for (const segment of segments) {
    if (!current) {
      current = { segments: [] };
      words.push(current);
    }
    current.segments.push(segment);
    // Terminou em espaço: a próxima palavra pode quebrar para a linha de baixo.
    if (/\s$/.test(segment.text) || segment.text === '') current = null;
  }

  return words;
}

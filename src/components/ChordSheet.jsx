'use client';

/**
 * Renderização da cifra.
 *
 * Cada par acorde+sílaba vira um único bloco inline: o acorde fica na linha de
 * cima e a sílaba na de baixo, dentro do mesmo elemento. Assim, quando a linha
 * quebra no celular, acorde e sílaba quebram juntos — o acorde nunca escorrega
 * para outra sílaba.
 */
import { useMemo } from 'react';
import { groupIntoWords, parseChordPro } from '@/domain/chordpro/parse.js';
import { transposeChord } from '@/domain/chordpro/transpose.js';

/**
 * @param {{
 *   chordPro: string,
 *   semitones?: number,
 *   targetKey?: string|null,
 *   showChords?: boolean,
 * }} props
 */
export function ChordSheet({ chordPro, semitones = 0, targetKey = null, showChords = true }) {
  const doc = useMemo(() => parseChordPro(chordPro), [chordPro]);

  const renderChord = (chord) => {
    if (!chord) return '';
    if (!semitones) return chord;
    return transposeChord(chord, semitones, targetKey ? { targetKey } : {});
  };

  if (doc.lines.length === 0) {
    return <p className="sheet-empty">Sem cifra cadastrada — nada para mostrar ainda.</p>;
  }

  return (
    <div className={`sheet ${showChords ? '' : 'sheet--lyrics-only'}`}>
      {doc.lines.map((line, index) => {
        if (line.type === 'empty') return <div className="sheet-gap" key={index} />;

        if (line.type === 'comment') {
          return (
            <p className="sheet-comment" key={index}>
              {line.text}
            </p>
          );
        }

        if (line.type === 'chorus-start' || line.type === 'bridge-start') {
          return <div className="sheet-section-start" key={index} aria-hidden="true" />;
        }
        if (line.type === 'chorus-end' || line.type === 'bridge-end') {
          return <div className="sheet-section-end" key={index} aria-hidden="true" />;
        }

        return (
          <p
            className={`sheet-line ${line.chorus ? 'sheet-line--chorus' : ''}`}
            data-chorus={line.chorus ? 'true' : undefined}
            key={index}
          >
            {groupIntoWords(line.pairs).map((word, wordIndex) => (
              /* A palavra é o bloco que não quebra: dentro dela, cada acorde
                 fica empilhado sobre a sua própria sílaba. */
              <span className="word" data-testid="word" key={wordIndex}>
                {word.segments.map((segment, segmentIndex) => (
                  <span className="pair" data-testid="pair" key={segmentIndex}>
                    {showChords && (
                      <span
                        className="pair-chord"
                        data-testid={segment.chord ? 'chord' : undefined}
                      >
                        {renderChord(segment.chord)}
                      </span>
                    )}
                    <span className="pair-lyric" data-testid="lyric">
                      {segment.text}
                    </span>
                  </span>
                ))}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

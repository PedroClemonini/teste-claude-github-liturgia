import { describe, it, expect } from 'vitest';
import {
  LITURGICAL_MOMENTS,
  MOMENT_ORDER,
  momentLabel,
  isValidMoment,
  sortRepertoire,
  missingMoments,
} from '@/domain/liturgy/moments.js';

describe('catálogo de momentos', () => {
  it('cobre os catorze momentos do rito na ordem da evento', () => {
    expect(LITURGICAL_MOMENTS.map((m) => m.id)).toEqual([
      'ENTRADA',
      'ATO_PENITENCIAL',
      'GLORIA',
      'SALMO',
      'ACLAMACAO',
      'OFERTORIO',
      'SANTO',
      'ORACAO_EUCARISTICA',
      'MISTERIO_DA_FE',
      'GRANDE_AMEM',
      'CORDEIRO',
      'COMUNHAO',
      'ACAO_DE_GRACAS',
      'FINAL',
    ]);
  });

  it('dá rótulo legível a cada momento', () => {
    expect(momentLabel('ACAO_DE_GRACAS')).toBe('Ação de Graças');
    expect(momentLabel('ATO_PENITENCIAL')).toBe('Ato Penitencial');
  });

  it('valida identificadores de momento', () => {
    expect(isValidMoment('SALMO')).toBe(true);
    expect(isValidMoment('CAFEZINHO')).toBe(false);
  });

  it('ordena momentos pela sequência do rito', () => {
    expect(MOMENT_ORDER.ENTRADA).toBeLessThan(MOMENT_ORDER.FINAL);
  });
});

describe('sortRepertoire', () => {
  it('ordena pelo rito e, dentro do momento, pela posição', () => {
    const items = [
      { moment: 'FINAL', position: 0, songId: 'a' },
      { moment: 'COMUNHAO', position: 1, songId: 'b' },
      { moment: 'ENTRADA', position: 0, songId: 'c' },
      { moment: 'COMUNHAO', position: 0, songId: 'd' },
    ];
    expect(sortRepertoire(items).map((i) => i.songId)).toEqual(['c', 'd', 'b', 'a']);
  });

  it('não altera o array recebido', () => {
    const items = [{ moment: 'FINAL', position: 0 }, { moment: 'ENTRADA', position: 0 }];
    const sorted = sortRepertoire(items);
    expect(items[0].moment).toBe('FINAL');
    expect(sorted[0].moment).toBe('ENTRADA');
  });
});

describe('missingMoments', () => {
  it('aponta os momentos ainda sem música no roteiro', () => {
    const items = [{ moment: 'ENTRADA' }, { moment: 'FINAL' }];
    const missing = missingMoments(items);
    expect(missing).not.toContain('ENTRADA');
    expect(missing).toContain('SALMO');
    expect(missing).toHaveLength(12);
  });
});

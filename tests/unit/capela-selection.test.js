import { describe, it, expect } from 'vitest';
import { capelaOptions, membersOf, NO_CAPELA, pickCapela } from '@/domain/team/capela-selection.js';

const pessoa = (id, ...capelas) => ({
  id,
  memberships: capelas.map(([capelaId, name]) => ({ capelaId, capela: { name } })),
});
const matriz = ['c1', 'Matriz'];
const saoJose = ['c2', 'Capela São José'];

describe('capelaOptions', () => {
  it('lista cada capela uma vez, em ordem alfabética', () => {
    const options = capelaOptions([pessoa('a', matriz, saoJose), pessoa('b', matriz)]);
    expect(options).toEqual([
      { value: 'c2', label: 'Capela São José' },
      { value: 'c1', label: 'Matriz' },
    ]);
  });

  it('inclui capela administrada mesmo sem ninguém dentro', () => {
    const options = capelaOptions([], [{ id: 'c3', name: 'Nova' }]);
    expect(options).toEqual([{ value: 'c3', label: 'Nova' }]);
  });
});

describe('pickCapela', () => {
  const options = [{ value: 'c2' }, { value: 'c1' }];

  it('respeita a capela da URL', () => {
    expect(pickCapela(options, 'c1', ['c2'])).toBe('c1');
  });

  it('ignora capela da URL que a pessoa não pode ver', () => {
    expect(pickCapela(options, 'de-outro', ['c1'])).toBe('c1');
  });

  it('abre na capela da própria pessoa', () => {
    expect(pickCapela(options, undefined, ['c1'])).toBe('c1');
  });

  it('segue a ordem de preferência, não a alfabética', () => {
    expect(pickCapela(options, undefined, ['c1', 'c2'])).toBe('c1');
  });

  it('ignora preferência que não está entre as opções', () => {
    expect(pickCapela(options, undefined, ['fora', 'c2'])).toBe('c2');
  });

  it('sem capela própria, abre na primeira', () => {
    expect(pickCapela(options, undefined, [])).toBe('c2');
  });

  it('sem opções, não escolhe nada', () => {
    expect(pickCapela([], undefined, [])).toBeNull();
  });
});

describe('membersOf', () => {
  const ana = pessoa('ana', matriz, saoJose);
  const joao = pessoa('joao', matriz);
  const solto = pessoa('solto');
  const dono = { ...pessoa('dono'), isOwner: true };
  const todos = [ana, joao, solto, dono];

  it('traz só quem está na capela', () => {
    expect(membersOf(todos, 'c2').map((m) => m.id)).toEqual(['ana']);
    expect(membersOf(todos, 'c1').map((m) => m.id)).toEqual(['ana', 'joao']);
  });

  it('"sem capela" traz as contas soltas, menos o dono', () => {
    expect(membersOf(todos, NO_CAPELA).map((m) => m.id)).toEqual(['solto']);
  });
});

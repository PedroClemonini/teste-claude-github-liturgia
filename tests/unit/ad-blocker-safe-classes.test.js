import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/** Padrões que bloqueadores de anúncio costumam esconder (EasyList e similares). */
const BLOCKED = /(^|[-_])(ads?|advert|advertisement|sponsor|sponsored|banner|promo|popup)([-_]|$)/i;

const SOURCES = path.resolve('src');

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : [full];
  });
}

function classNames() {
  const names = new Set();
  for (const file of files(SOURCES)) {
    const text = readFileSync(file, 'utf8');
    if (file.endsWith('.css')) {
      for (const [, name] of text.matchAll(/\.([a-zA-Z][\w-]*)/g)) names.add(name);
    } else if (file.endsWith('.jsx')) {
      for (const [, list] of text.matchAll(/className=["{`]+([^"`}]*)/g)) {
        for (const name of list.split(/\s+/)) if (/^[a-zA-Z][\w-]*$/.test(name)) names.add(name);
      }
    }
  }
  return [...names];
}

describe('classes CSS', () => {
  it('nenhuma classe tem nome que bloqueador de anúncio esconde', () => {
    const names = classNames();
    expect(names.length).toBeGreaterThan(100);
    expect(names.filter((name) => BLOCKED.test(name))).toEqual([]);
  });
});

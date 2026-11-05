// @vitest-environment jsdom
import { useState } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagInput } from '@/components/TagInput.jsx';

afterEach(cleanup);

function Campo({ inicial = [] }) {
  const [tags, setTags] = useState(inicial);
  return (
    <form onSubmit={() => { throw new Error('não deveria enviar'); }}>
      <TagInput value={tags} onChange={setTags} suggestions={['natal']} />
      <output>{tags.join(',')}</output>
    </form>
  );
}

const valor = () => screen.getByRole('status').textContent;
const campo = () => screen.getByRole('combobox', { name: 'Nova tag' });

describe('TagInput', () => {
  it('Enter acrescenta a tag normalizada, sem enviar o formulário', async () => {
    const user = userEvent.setup();
    render(<Campo />);
    await user.type(campo(), '#Novena São Francisco{Enter}');
    expect(valor()).toBe('novenasaofrancisco');
    expect(campo().value).toBe('');
  });

  it('vírgula também acrescenta', async () => {
    const user = userEvent.setup();
    render(<Campo />);
    await user.type(campo(), 'natal,pascoa,');
    expect(valor()).toBe('natal,pascoa');
  });

  it('não perde o que foi digitado ao sair do campo', async () => {
    const user = userEvent.setup();
    render(<Campo />);
    await user.type(campo(), 'natal');
    await user.tab();
    expect(valor()).toBe('natal');
  });

  it('remove uma tag', async () => {
    const user = userEvent.setup();
    render(<Campo inicial={['natal', 'pascoa']} />);
    await user.click(screen.getByRole('button', { name: 'Remover #natal' }));
    expect(valor()).toBe('pascoa');
  });
});

// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChordProEditor } from '@/components/ChordProEditor.jsx';

afterEach(cleanup);

describe('ChordProEditor', () => {
  it('mostra editor e pré-visualização lado a lado', () => {
    render(<ChordProEditor value="[G]Pai Nosso" onChange={() => {}} />);
    expect(screen.getByLabelText(/cifra em chordpro/i)).toBeTruthy();
    expect(screen.getByTestId('preview')).toBeTruthy();
  });

  it('renderiza a pré-visualização a partir do texto digitado', () => {
    render(<ChordProEditor value="[G]Pai Nosso que est[C]ais no céu" onChange={() => {}} />);
    const preview = screen.getByTestId('preview');
    expect(preview.querySelectorAll('[data-testid="chord"]')).toHaveLength(2);
  });

  it('avisa o formulário a cada tecla, para a pré-visualização acompanhar', async () => {
    const user = userEvent.setup();
    const changes = [];
    render(<ChordProEditor value="" onChange={(v) => changes.push(v)} />);

    // `[[` escapa o colchete: no userEvent, `[` sozinho descreve uma tecla.
    await user.type(screen.getByLabelText(/cifra em chordpro/i), '[[G]Vem');
    expect(changes).toHaveLength(6);
    expect(changes[0]).toBe('[');
    expect(changes.at(-1)).toBe('m');
  });

  it('mostra o tom detectado na cifra', () => {
    render(<ChordProEditor value="[Am]Vem, Senhor" onChange={() => {}} />);
    expect(screen.getByTestId('detected-key').textContent).toContain('Am');
  });

  it('conta quantos acordes já foram digitados', () => {
    render(<ChordProEditor value="[G]Um [C]dois [D]três" onChange={() => {}} />);
    expect(screen.getByTestId('chord-count').textContent).toContain('3');
  });
});

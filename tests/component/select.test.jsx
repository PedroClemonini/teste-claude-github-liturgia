// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from '@/components/Select.jsx';

afterEach(cleanup);

const options = [
  { value: '', label: 'Todos' },
  { value: 'ADVENTO', label: 'Advento' },
  { value: 'NATAL', label: 'Natal' },
  { value: 'TRIDUO_PASCAL', label: 'Tríduo Pascal' },
];

function setup(props = {}) {
  const { container } = render(
    <form>
      <Select label="Tempo litúrgico" name="tempo" options={options} {...props} />
      <button type="button">Outro</button>
    </form>,
  );
  return {
    user: userEvent.setup(),
    trigger: screen.getByRole('combobox', { name: /tempo litúrgico/i }),
    field: container.querySelector('input[name="tempo"]'),
  };
}

describe('Select', () => {
  it('mostra o valor inicial e o envia no campo do formulário', () => {
    const { trigger, field } = setup({ defaultValue: 'NATAL' });
    expect(trigger.textContent).toContain('Natal');
    expect(field.value).toBe('NATAL');
  });

  it('escolhe com o mouse e fecha a lista', async () => {
    const { user, trigger, field } = setup();
    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: 'Advento' }));

    expect(field.value).toBe('ADVENTO');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('funciona só com o teclado, sem tirar o foco do botão', async () => {
    const { user, trigger, field } = setup();
    trigger.focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');

    expect(field.value).toBe('NATAL');
    expect(document.activeElement).toBe(trigger);
  });

  it('Enter não envia o formulário junto', async () => {
    let enviado = false;
    render(
      <form onSubmit={() => (enviado = true)}>
        <Select label="Momento" name="momento" options={options} />
      </form>,
    );
    screen.getByRole('combobox').focus();
    await userEvent.setup().keyboard('{Enter}{Enter}');
    expect(enviado).toBe(false);
  });

  it('Esc fecha sem mudar o valor', async () => {
    const { user, trigger, field } = setup({ defaultValue: 'NATAL' });
    trigger.focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{Escape}');

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(field.value).toBe('NATAL');
  });

  it('Esc fecha só o menu, sem chegar ao modal em volta', async () => {
    let fechouModal = false;
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div onKeyDown={(event) => event.key === 'Escape' && (fechouModal = true)}>
        <Select label="Papel" name="papel" options={options} />
      </div>,
    );
    screen.getByRole('combobox').focus();
    await userEvent.setup().keyboard('{ArrowDown}{Escape}');

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(fechouModal).toBe(false);
  });

  it('digitar a inicial encontra a opção, ignorando acento', async () => {
    const { user, trigger, field } = setup();
    trigger.focus();
    await user.keyboard('tri{Enter}');
    expect(field.value).toBe('TRIDUO_PASCAL');
  });

  it('clicar fora fecha a lista', async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Outro' }));
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('agrupa as opções', async () => {
    const { user, trigger } = setup({
      options: [
        { value: '', label: 'Sem canto' },
        { value: 'a', label: 'Santo', group: 'Indicadas' },
        { value: 'b', label: 'Glória', group: 'Demais' },
      ],
    });
    await user.click(trigger);
    expect(screen.getByText('Indicadas')).toBeTruthy();
    expect(screen.getByText('Demais')).toBeTruthy();
  });

  describe('com busca', () => {
    const lista = [
      { value: '', label: 'Sem canto' },
      { value: 'a', label: 'Glória a Deus (D)', group: 'Indicadas' },
      { value: 'b', label: 'Santo (C)', group: 'Demais' },
      { value: 'c', label: 'Cordeiro de Deus (Am)', group: 'Demais' },
    ];

    it('filtra ignorando acento e escolhe com Enter, devolvendo o foco', async () => {
      const { user, trigger, field } = setup({ options: lista, searchable: true });
      await user.click(trigger);
      expect(document.activeElement).toBe(screen.getByRole('textbox', { name: /buscar/i }));

      await user.keyboard('gloria');
      expect(screen.getAllByRole('option')).toHaveLength(1);
      await user.keyboard('{Enter}');

      expect(field.value).toBe('a');
      expect(document.activeElement).toBe(trigger);
    });

    it('espaço digita na busca, não escolhe', async () => {
      const { user, trigger, field } = setup({ options: lista, searchable: true });
      await user.click(trigger);
      await user.keyboard('de deus');
      expect(screen.getAllByRole('option')).toHaveLength(1);
      expect(field.value).toBe('');
    });

    it('avisa quando nada casa', async () => {
      const { user, trigger } = setup({ options: lista, searchable: true });
      await user.click(trigger);
      await user.keyboard('zabumba');
      expect(screen.getByText('Nada encontrado')).toBeTruthy();
      await user.keyboard('{Enter}');
      expect(screen.getByRole('listbox')).toBeTruthy();
    });

    it('digitar no botão abre já buscando', async () => {
      const { user, trigger } = setup({ options: lista, searchable: true });
      trigger.focus();
      await user.keyboard('s');
      expect(screen.getByRole('textbox', { name: /buscar/i }).value).toBe('s');
    });
  });

  it('marca a opção escolhida para leitores de tela', async () => {
    const { user, trigger } = setup({ defaultValue: 'ADVENTO' });
    await user.click(trigger);
    expect(screen.getByRole('option', { name: 'Advento' }).getAttribute('aria-selected')).toBe('true');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });
});

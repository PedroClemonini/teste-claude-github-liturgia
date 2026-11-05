// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiturgyPanel } from '@/components/LiturgyPanel.jsx';

afterEach(cleanup);

const celebracao = (extra) => ({
  id: 'a',
  liturgia: 'Terça-feira do Tempo Comum',
  cor: 'Verde',
  principal: true,
  oracoes: { coleta: 'Ó Deus', oferendas: null, comunhao: null, extras: [] },
  antifonas: {},
  leituras: [
    {
      ordem: 1,
      tipo: 'evangelho',
      rotulo: 'Evangelho',
      opcoes: [{ referencia: 'Lc 1,1', titulo: 'Proclamação', texto: 'Naquele tempo' }],
    },
  ],
  ...extra,
});

const painel = (props) =>
  render(
    <LiturgyPanel date="2026-11-08" isToday previousHref="/a" nextHref="/b" todayHref="/agenda" {...props} />,
  );

describe('LiturgyPanel', () => {
  it('mostra celebração, cor e referências, com o texto recolhido', () => {
    painel({ liturgy: { celebracoes: [celebracao()] } });
    expect(screen.getByRole('heading', { name: 'Terça-feira do Tempo Comum' })).toBeTruthy();
    expect(screen.getByText('Verde')).toBeTruthy();
    expect(screen.getByRole('list').textContent).toContain('Lc 1,1');
    expect(screen.getByText('Ler a liturgia completa').closest('details').open).toBe(false);
  });

  it('sem liturgia, avisa e mantém a navegação entre os dias', () => {
    painel({ liturgy: null });
    expect(screen.getByText(/não está disponível/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /dia seguinte/ })).toBeTruthy();
  });

  it('com memória facultativa, troca de celebração nas abas, começando pela principal', async () => {
    const user = userEvent.setup();
    painel({
      liturgy: {
        celebracoes: [
          celebracao({ id: 'b', liturgia: 'São Martinho', cor: 'Branco', principal: false, leituras: [] }),
          celebracao(),
        ],
      },
    });
    expect(screen.getByRole('heading', { name: 'Terça-feira do Tempo Comum' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Opção: São Martinho' }));
    expect(screen.getByRole('heading', { name: 'São Martinho' })).toBeTruthy();
    expect(screen.getByText('Branco')).toBeTruthy();
  });

  it('no sábado avisa da regra das 17h e leva ao domingo', () => {
    painel({ liturgy: null, date: '2026-11-07' });
    expect(screen.getByText(/a partir das 17h/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver domingo' }).getAttribute('href')).toBe('/b');
  });

  it('na tela do evento não há navegação entre dias', () => {
    render(<LiturgyPanel date="2026-11-08" liturgy={null} heading="Liturgia desta missa" />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText(/Liturgia desta missa/)).toBeTruthy();
  });

  it('botão Hoje só aparece em outro dia', () => {
    painel({ liturgy: null });
    expect(screen.queryByRole('link', { name: 'Hoje' })).toBeNull();
    cleanup();
    painel({ liturgy: null, isToday: false });
    expect(screen.getByRole('link', { name: 'Hoje' }).getAttribute('href')).toBe('/agenda');
  });
});

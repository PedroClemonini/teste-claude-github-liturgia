'use client';

/**
 * Liturgia do dia na Agenda: no computador, o texto completo; no celular, recolhido.
 * Quando há memória facultativa, abas trocam a celebração.
 */
import { useId, useState } from 'react';
import Link from 'next/link';
import { isoToDate, isSaturday, sortCelebrations } from '@/domain/liturgy/daily.js';
import { Icon } from './Icon.jsx';

const formatDate = (iso) =>
  isoToDate(iso).toLocaleDateString('pt-BR', { dateStyle: 'full', timeZone: 'UTC' });

/** No computador o texto fica sempre à vista; o botão só existe no celular (CSS). */
function FullText({ children }) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="ui-liturgy__toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <Icon name="chevron-right" />
        {open ? 'Recolher a liturgia' : 'Ler a liturgia completa'}
      </button>
      <div className="ui-liturgy__text" id={id} data-open={open || undefined}>
        {children}
      </div>
    </>
  );
}

/** Dia da barra de navegação, como "quarta-feira 4". */
const dayLabel = (iso) => {
  const date = isoToDate(iso);
  return `${date.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' })} ${date.getUTCDate()}`;
};

function Prayer({ title, text }) {
  if (!text) return null;
  return (
    <section>
      <h3>{title}</h3>
      <p>{text}</p>
    </section>
  );
}

function Reading({ reading }) {
  return (
    <section>
      <h3>{reading.rotulo}</h3>
      {reading.opcoes.map((option, index) => (
        <div key={index}>
          {reading.opcoes.length > 1 && <h4>Opção {index + 1}</h4>}
          {option.referencia && <p className="ui-liturgy__ref">{option.referencia}</p>}
          {option.titulo && <h4>{option.titulo}</h4>}
          {option.refrao && <p className="ui-liturgy__refrain">{option.refrao}</p>}
          <p>{option.texto}</p>
        </div>
      ))}
    </section>
  );
}

/**
 * @param {{
 *   date: string,
 *   isToday: boolean,
 *   liturgy: object|null,
 *   dayColor?: string,
 *   previousHref?: string,
 *   nextHref?: string,
 *   todayHref?: string,
 *   heading?: string,
 *   children?: import('react').ReactNode,
 * }} props Com `previousHref`, mostra o dia com as setas; sem ele (tela do
 * evento), não há navegação. `children` entra logo abaixo do cabeçalho.
 */
export function LiturgyPanel({
  date,
  isToday = false,
  liturgy,
  dayColor,
  previousHref,
  nextHref,
  todayHref,
  heading,
  children,
}) {
  const celebrations = liturgy ? sortCelebrations(liturgy.celebracoes) : [];
  const [selectedId, setSelectedId] = useState(null);
  const current = celebrations.find((item) => item.id === selectedId) ?? celebrations[0];

  return (
    <section className="ui-liturgy" data-cor={current?.cor} aria-labelledby="liturgia-titulo">
      <div className="ui-liturgy__head">
        <p className="ui-liturgy__kicker">
          {heading && `${heading} · ${formatDate(date)}`}
          {!heading && (isToday ? 'Liturgia de hoje' : `Liturgia de ${formatDate(date)}`)}
        </p>
        {previousHref && !isToday && (
          <Link className="ui-button" href={todayHref}>
            Voltar para hoje
          </Link>
        )}
      </div>

      {previousHref && (
        <nav className="ui-day-nav" aria-label="Escolher o dia da liturgia">
          <Link
            className="ui-button ui-button--subtle ui-button--icon"
            href={previousHref}
            aria-label="Liturgia do dia anterior"
            title="Dia anterior"
          >
            <Icon name="chevron-left" />
          </Link>
          <span className="ui-day-nav__day" aria-current="date">
            <span className="cor-dot" data-cor={dayColor} />
            {dayLabel(date)}
          </span>
          <Link
            className="ui-button ui-button--subtle ui-button--icon"
            href={nextHref}
            aria-label="Liturgia do dia seguinte"
            title="Dia seguinte"
          >
            <Icon name="chevron-right" />
          </Link>
        </nav>
      )}

      {children}

      {previousHref && isSaturday(date) && (
        <p className="ui-helper">
          Missas a partir das 17h seguem a liturgia de domingo. <Link href={nextHref}>Ver domingo</Link>
        </p>
      )}

      {!current ? (
        <p className="ui-subtle" id="liturgia-titulo">
          A liturgia deste dia não está disponível agora.
        </p>
      ) : (
        <>
          <div className="ui-liturgy__title">
            <h2 className="ui-heading-small" id="liturgia-titulo">
              {current.liturgia}
            </h2>
            <span className="ui-lozenge" data-cor={current.cor}>
              <span className="cor-dot" data-cor={current.cor} />
              {current.cor}
            </span>
          </div>

          {celebrations.length > 1 && (
            <div className="ui-tabs ui-liturgy__tabs" role="group" aria-label="Celebrações do dia">
              {celebrations.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="ui-tab"
                  aria-current={item === current ? 'true' : undefined}
                  onClick={() => setSelectedId(item.id)}
                >
                  {item.principal ? item.liturgia : `Opção: ${item.liturgia}`}
                </button>
              ))}
            </div>
          )}

          {current.leituras.length > 0 && (
            <dl className="ui-liturgy__readings">
              {current.leituras.map((reading) => (
                <div key={reading.ordem}>
                  <dt>{reading.rotulo}</dt>
                  <dd>{reading.opcoes[0]?.referencia ?? '—'}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* A chave recolhe o texto ao trocar de dia ou de celebração. */}
          <FullText key={`${date}-${current.id}`}>
            <Prayer title="Antífona de entrada" text={current.antifonas.entrada} />
            <Prayer title="Oração do dia" text={current.oracoes.coleta} />
            {current.leituras.map((reading) => (
              <Reading key={reading.ordem} reading={reading} />
            ))}
            <Prayer title="Oração sobre as oferendas" text={current.oracoes.oferendas} />
            <Prayer title="Antífona da comunhão" text={current.antifonas.comunhao} />
            <Prayer title="Oração depois da comunhão" text={current.oracoes.comunhao} />
            {current.oracoes.extras.map((extra, index) => (
              <Prayer key={index} title={extra.titulo ?? 'Oração'} text={extra.texto} />
            ))}
          </FullText>
        </>
      )}
    </section>
  );
}

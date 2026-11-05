'use client';

/**
 * Liturgia do dia na Agenda: resumo sempre à vista e o texto completo recolhido.
 * Quando há memória facultativa, abas trocam a celebração.
 */
import { useState } from 'react';
import Link from 'next/link';
import { isoToDate, isSaturday, sortCelebrations } from '@/domain/liturgy/daily.js';
import { Icon } from './Icon.jsx';

const formatDate = (iso) =>
  isoToDate(iso).toLocaleDateString('pt-BR', { dateStyle: 'full', timeZone: 'UTC' });

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
 *   previousHref?: string,
 *   nextHref?: string,
 *   todayHref?: string,
 *   heading?: string,
 *   children?: import('react').ReactNode,
 * }} props Sem `previousHref`, não há navegação entre dias (tela do evento).
 * `children` entra logo abaixo do cabeçalho.
 */
export function LiturgyPanel({
  date,
  isToday = false,
  liturgy,
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
          {heading ?? (isToday ? 'Liturgia de hoje' : 'Liturgia')} · {formatDate(date)}
        </p>
        {previousHref && (
          <div className="ui-liturgy__nav">
            {!isToday && (
              <Link className="ui-button" href={todayHref}>
                Hoje
              </Link>
            )}
            <Link
              className="ui-button ui-button--subtle ui-button--icon"
              href={previousHref}
              aria-label="Liturgia do dia anterior"
              title="Dia anterior"
            >
              <Icon name="chevron-left" />
            </Link>
            <Link
              className="ui-button ui-button--subtle ui-button--icon"
              href={nextHref}
              aria-label="Liturgia do dia seguinte"
              title="Dia seguinte"
            >
              <Icon name="chevron-right" />
            </Link>
          </div>
        )}
      </div>

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
            <ul className="ui-liturgy__readings">
              {current.leituras.map((reading) => (
                <li key={reading.ordem}>
                  <span>{reading.rotulo}:</span> {reading.opcoes[0]?.referencia ?? '—'}
                </li>
              ))}
            </ul>
          )}

          {/* A chave fecha o texto ao trocar de dia ou de celebração. */}
          <details className="ui-liturgy__full" key={`${date}-${current.id}`}>
            <summary>
              <Icon name="chevron-right" />
              Ler a liturgia completa
            </summary>
            <div className="ui-liturgy__text">
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
            </div>
          </details>
        </>
      )}
    </section>
  );
}

import Link from 'next/link';
import { buildMonthGrid, WEEKDAYS, celebrationTypeLabel } from '@/domain/calendar/grid.js';
import { fallbackColor, LITURGY_COLORS } from '@/domain/liturgy/daily.js';
import { seasonLabel } from '@/domain/liturgy/seasons.js';
import { Icon } from './Icon.jsx';

const TYPES = ['MISSA_COMUM', 'MISSA_SOLENE', 'ENSAIO'];

const hora = (date) =>
  new Date(date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });

/**
 * Painel de agenda. Em telas largas mostra a grade do mês; no celular a mesma
 * informação vira lista cronológica, que é como a equipe consulta na hora.
 *
 * `liturgyColors` traz a cor oficial dos dias já guardados; nos demais, o ponto
 * usa a cor do tempo litúrgico calculado.
 *
 * @param {{year: number, month: number, celebrations: object[], today?: string, liturgyColors?: Record<string, {cor: string, liturgia: string}>}} props
 */
export function CalendarBoard({ year, month, celebrations, today, liturgyColors = {} }) {
  const weeks = buildMonthGrid(year, month, celebrations);
  const days = weeks.flat();
  // Todo dia tem o ponto da cor litúrgica; o nome aparece só onde o tempo começa
  // na grade, senão se repetiria em todas as células.
  const startsSeason = (day) => days[days.indexOf(day) - 1]?.season !== day.season;

  return (
    <>
      <div className="calendar">
        <div className="calendar-weekdays" aria-hidden="true">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        {weeks.map((week, index) => (
          <div className="calendar-week" key={index}>
            {week.map((day) => (
              <div
                key={day.iso}
                className={[
                  'calendar-day',
                  day.inMonth ? '' : 'calendar-day--out',
                  day.iso === today ? 'calendar-day--today' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="calendar-day-number">
                  <span className="calendar-day-date">{day.day}</span>
                  <span
                    className="calendar-day-season"
                    title={liturgyColors[day.iso]?.liturgia ?? seasonLabel(day.season)}
                  >
                    <span className="cor-dot" data-cor={liturgyColors[day.iso]?.cor ?? fallbackColor(day.season)} />
                    {startsSeason(day) ? (
                      <span className="calendar-day-season__label">{seasonLabel(day.season)}</span>
                    ) : (
                      <span className="ui-visually-hidden">{seasonLabel(day.season)}</span>
                    )}
                  </span>
                </div>
                <div className="calendar-day-events">
                  {day.celebrations.map((celebration) => (
                    <Link
                      key={celebration.id}
                      href={`/celebracoes/${celebration.id}`}
                      className="calendar-event"
                      data-type={celebration.type}
                      title={`${celebration.title} · ${celebrationTypeLabel(celebration.type)}`}
                    >
                      {hora(celebration.date)} {celebration.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}

        <ul className="calendar-legend" aria-label="Legenda">
          {TYPES.map((type) => (
            <li key={type}>
              <span className="calendar-legend__type" data-type={type} />
              {celebrationTypeLabel(type)}
            </li>
          ))}
          {LITURGY_COLORS.map((color) => (
            <li key={color}>
              <span className="cor-dot" data-cor={color} />
              {color}
            </li>
          ))}
        </ul>
      </div>

      <div className="agenda-list--mobile">
        <AgendaList celebrations={celebrations} />
      </div>
    </>
  );
}

/** Lista cronológica das celebrações, com o indicador de roteiro. */
export function AgendaList({ celebrations }) {
  if (celebrations.length === 0) {
    return (
      <div className="ui-empty">
        <Icon name="calendar" size={32} />
        <p>Nenhum evento neste período.</p>
      </div>
    );
  }

  return (
    <ul className="ui-list">
      {celebrations.map((celebration) => {
        const date = new Date(celebration.date);
        const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' });
        const month = date.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' });
        return (
          <li key={celebration.id}>
            <Link className="ui-list-item" href={`/celebracoes/${celebration.id}`}>
              <span className="ui-date">
                <strong>{date.getUTCDate()}</strong>
                {month.replace('.', '')}
              </span>
              <span className="ui-list-item__text">
                <span className="ui-list-item__title">{celebration.title}</span>
                <span className="ui-subtle">
                  {weekday.replace('.', '')}, {hora(celebration.date)} · {seasonLabel(celebration.season)}
                </span>
                <span className="ui-list-item__meta">
                  <span className="ui-lozenge" data-type={celebration.type}>
                    {celebrationTypeLabel(celebration.type)}
                  </span>
                  {typeof celebration.songCount === 'number' && (
                    <span className="ui-list-item__songs">
                      <Icon name="audio" size={12} />
                      {celebration.songCount} {celebration.songCount === 1 ? 'canto' : 'cantos'}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

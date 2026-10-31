import Link from 'next/link';
import { buildMonthGrid, WEEKDAYS, celebrationTypeLabel } from '@/domain/calendar/grid.js';
import { seasonLabel } from '@/domain/liturgy/seasons.js';

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
 * @param {{year: number, month: number, celebrations: object[], today?: string}} props
 */
export function CalendarBoard({ year, month, celebrations, today }) {
  const weeks = buildMonthGrid(year, month, celebrations);

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
                  <span
                    className="season-dot"
                    data-season={day.season}
                    title={seasonLabel(day.season)}
                  />
                  {day.day}
                </div>
                <div
                  className={`calendar-day-events ${day.celebrations.length > 3 ? 'calendar-day-events--compact' : ''}`}
                >
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
    return <p className="empty">Nenhuma evento neste período.</p>;
  }

  return (
    <div>
      {celebrations.map((celebration) => {
        const date = new Date(celebration.date);
        return (
          <Link
            className="agenda-item"
            key={celebration.id}
            href={`/celebracoes/${celebration.id}`}
          >
            <div className="agenda-date">
              <strong>{date.getUTCDate()}</strong>
              <span>
                {date.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' })}
              </span>
            </div>
            <div className="agenda-body">
              <h3>{celebration.title}</h3>
              <p>
                {hora(celebration.date)} · {seasonLabel(celebration.season)}
                {typeof celebration.songCount === 'number'
                  ? ` · ${celebration.songCount} ${celebration.songCount === 1 ? 'canto' : 'cantos'}`
                  : ''}
              </p>
            </div>
            <span
              className={`tag ${
                celebration.type === 'MISSA_SOLENE'
                  ? 'tag--solene'
                  : celebration.type === 'ENSAIO'
                    ? 'tag--ensaio'
                    : ''
              }`}
            >
              {celebrationTypeLabel(celebration.type)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

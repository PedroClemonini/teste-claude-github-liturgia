import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { listCelebrations, nextCelebrations, listCelebrationCapelas } from '@/services/celebrations.js';
import { CalendarBoard, AgendaList } from '@/components/CalendarBoard.jsx';
import { CapelaFilter } from '@/components/CapelaFilter.jsx';
import { Icon } from '@/components/Icon.jsx';
import { LiturgyPanel } from '@/components/LiturgyPanel.jsx';
import { addDaysIso, fallbackColor, isIsoDate, isoToDate, todayInBrazil } from '@/domain/liturgy/daily.js';
import { fillUpcomingLiturgy, getLiturgy, getLiturgyColors } from '@/services/liturgy.js';
import { buildMonthGrid, monthLabel, monthRange, shiftMonth } from '@/domain/calendar/grid.js';
import { seasonForDate, seasonLabel } from '@/domain/liturgy/seasons.js';
import { isCoordinator } from '@/domain/auth/roles.js';

export const metadata = { title: 'Santa Liturgia - São Francisco Xavier' };

export default async function AgendaPage({ searchParams }) {
  const user = await currentUser();
  if (!user) redirect('/entrar');

  const query = await searchParams;
  const showCalendar = query?.visao === 'calendario';

  // A data de hoje é a do Brasil: em UTC, o dia virava às 21h.
  const todayIso = todayInBrazil();
  const hoje = isoToDate(todayIso);
  const year = Number(query?.ano) || hoje.getUTCFullYear();
  const month = Number(query?.mes) || hoje.getUTCMonth() + 1;
  const liturgyDate = isIsoDate(query?.liturgia) ? query.liturgia : todayIso;
  // O filtro de capela é da aba Calendário: na outra, ficaria invisível.
  const capelaId = showCalendar ? query?.capela || undefined : undefined;

  const { from, to } = monthRange(year, month);
  const gridDays = buildMonthGrid(year, month, []).flat().map((day) => day.iso);
  // Além do dia aberto, os vizinhos: é para onde as setas levam.
  const visibleDays = showCalendar
    ? gridDays
    : [liturgyDate, addDaysIso(liturgyDate, 1), addDaysIso(liturgyDate, -1)];

  const [celebrations, proximas, capelaOptions, liturgy, liturgyColors] = await Promise.all([
    showCalendar ? listCelebrations({ from, to, capelaId }, user) : [],
    showCalendar ? [] : nextCelebrations({ limit: 4 }, user),
    listCelebrationCapelas(user),
    showCalendar ? null : getLiturgy(liturgyDate, user),
    getLiturgyColors(visibleDays),
  ]);

  // Em segundo plano: a resposta da página não espera por isso.
  fillUpcomingLiturgy(todayIso, { priorityDays: visibleDays }).catch((error) =>
    console.error('[liturgia] falha ao preencher', error),
  );

  const anterior = shiftMonth(year, month, -1);
  const proximo = shiftMonth(year, month, 1);
  const seasonToday = seasonForDate(hoje);

  const hrefLiturgia = (date) => (date === todayIso ? '/agenda' : `/agenda?liturgia=${date}`);

  const hrefCalendario = ({ ano, mes, capela = capelaId } = {}) => {
    const params = new URLSearchParams({ visao: 'calendario' });
    if (ano) params.set('ano', ano);
    if (mes) params.set('mes', mes);
    if (capela) params.set('capela', capela);
    return `/agenda?${params}`;
  };

  return (
    <div className="dashboard">
      <div className="dashboard__head">
        <h1 className="ui-heading-large">Agenda</h1>
        <span className="ui-lozenge">
          <span className="season-dot" data-season={seasonToday} />
          {seasonLabel(seasonToday)}
        </span>
        {isCoordinator(user) && (
          <Link className="ui-button ui-button--primary ui-fab" href="/agenda/nova" title="Novo evento">
            <Icon name="add" />
            <span className="ui-fab__label">Novo evento</span>
          </Link>
        )}
      </div>

      <nav className="ui-tabs dashboard__tabs" aria-label="Visões da agenda">
        <Link className="ui-tab" href="/agenda" aria-current={showCalendar ? undefined : 'true'}>
          Diário
        </Link>
        <Link className="ui-tab" href={hrefCalendario({ capela: null })} aria-current={showCalendar ? 'true' : undefined}>
          Calendário
        </Link>
      </nav>

      {showCalendar ? (
        <section className="dashboard__calendar" aria-label="Calendário do mês">
          <div className="calendar-head">
            <h2 className="ui-heading-medium">{monthLabel(year, month)}</h2>
            <div className="calendar-head__actions">
              <Link
                className="ui-button ui-button--subtle ui-button--icon"
                href={hrefCalendario()}
                aria-label="Voltar ao mês atual"
                title="Voltar ao mês atual"
              >
                <Icon name="calendar" />
              </Link>
              <Link
                className="ui-button ui-button--subtle ui-button--icon"
                href={hrefCalendario({ ano: anterior.year, mes: anterior.month })}
                aria-label="Mês anterior"
                title="Mês anterior"
              >
                <Icon name="chevron-left" />
              </Link>
              <Link
                className="ui-button ui-button--subtle ui-button--icon"
                href={hrefCalendario({ ano: proximo.year, mes: proximo.month })}
                aria-label="Próximo mês"
                title="Próximo mês"
              >
                <Icon name="chevron-right" />
              </Link>
            </div>
          </div>

          {isCoordinator(user) && capelaOptions.length > 1 && (
            <CapelaFilter
              value={capelaId ?? ''}
              options={[
                {
                  value: '',
                  label: 'Todas as capelas',
                  href: hrefCalendario({ ano: query?.ano, mes: query?.mes, capela: null }),
                },
                ...capelaOptions.map((capela) => ({
                  value: capela.id,
                  label: capela.name,
                  href: hrefCalendario({ ano: query?.ano, mes: query?.mes, capela: capela.id }),
                })),
              ]}
            />
          )}

          <CalendarBoard
            year={year}
            month={month}
            celebrations={celebrations.map((celebration) => ({
              ...celebration,
              date: celebration.date.toISOString(),
            }))}
            today={todayIso}
            liturgyColors={liturgyColors}
            currentSeason={seasonToday}
          />
        </section>
      ) : (
        <div className="dashboard__grid">
          <LiturgyPanel
            date={liturgyDate}
            isToday={liturgyDate === todayIso}
            liturgy={liturgy}
            dayColor={liturgyColors[liturgyDate]?.cor ?? fallbackColor(seasonForDate(isoToDate(liturgyDate)))}
            previousHref={hrefLiturgia(addDaysIso(liturgyDate, -1))}
            nextHref={hrefLiturgia(addDaysIso(liturgyDate, 1))}
            todayHref="/agenda"
          />

          <section className="dashboard__next" aria-labelledby="proximas">
            <h2 className="ui-heading-small" id="proximas">
              Próximas celebrações
            </h2>
            <AgendaList
              currentSeason={seasonToday}
              celebrations={proximas.map((celebration) => ({
                ...celebration,
                date: celebration.date.toISOString(),
              }))}
            />
          </section>
        </div>
      )}
    </div>
  );
}

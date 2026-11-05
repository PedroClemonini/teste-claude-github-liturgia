import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { listCelebrations, nextCelebrations, listCelebrationCapelas } from '@/services/celebrations.js';
import { CalendarBoard, AgendaList } from '@/components/CalendarBoard.jsx';
import { Icon } from '@/components/Icon.jsx';
import { LiturgyPanel } from '@/components/LiturgyPanel.jsx';
import { addDaysIso, isIsoDate, isoToDate, todayInBrazil } from '@/domain/liturgy/daily.js';
import { fillUpcomingLiturgy, getLiturgy, getLiturgyColors } from '@/services/liturgy.js';
import { buildMonthGrid, monthLabel, monthRange, shiftMonth } from '@/domain/calendar/grid.js';
import { seasonForDate, seasonLabel } from '@/domain/liturgy/seasons.js';
import { isCoordinator } from '@/domain/auth/roles.js';

export const metadata = { title: 'Santa Liturgia - São Francisco Xavier' };

export default async function AgendaPage({ searchParams }) {
  const user = await currentUser();
  if (!user) redirect('/entrar');

  const query = await searchParams;
  // A data de hoje é a do Brasil: em UTC, o dia virava às 21h.
  const todayIso = todayInBrazil();
  const hoje = isoToDate(todayIso);
  const year = Number(query?.ano) || hoje.getUTCFullYear();
  const month = Number(query?.mes) || hoje.getUTCMonth() + 1;
  const liturgyDate = isIsoDate(query?.liturgia) ? query.liturgia : todayIso;
  const capelaId = query?.capela || undefined;

  const { from, to } = monthRange(year, month);
  const gridDays = buildMonthGrid(year, month, []).flat().map((day) => day.iso);
  const [celebrations, proximas, capelaOptions, liturgy, liturgyColors] = await Promise.all([
    listCelebrations({ from, to, capelaId }, user),
    nextCelebrations({ limit: 4, capelaId }, user),
    listCelebrationCapelas(user),
    getLiturgy(liturgyDate, user),
    getLiturgyColors(gridDays),
  ]);

  // Em segundo plano: a resposta da página não espera por isso.
  fillUpcomingLiturgy(todayIso, { priorityDays: gridDays }).catch((error) => console.error('[liturgia] falha ao preencher', error));

  const anterior = shiftMonth(year, month, -1);
  const proximo = shiftMonth(year, month, 1);
  const sufixoCapela = capelaId ? `&capela=${capelaId}` : '';
  const seasonToday = seasonForDate(hoje);

  const hrefLiturgia = (date) => {
    const params = new URLSearchParams();
    if (query?.ano) params.set('ano', query.ano);
    if (query?.mes) params.set('mes', query.mes);
    if (capelaId) params.set('capela', capelaId);
    if (date !== todayIso) params.set('liturgia', date);
    const search = params.toString();
    return search ? `/agenda?${search}` : '/agenda';
  };

  /** Filtrar por capela mantém o mês que a pessoa está vendo. */
  const hrefCapela = (id) => `/agenda?ano=${year}&mes=${month}${id ? `&capela=${id}` : ''}`;

  return (
    <div className="dashboard">
      <div className="dashboard__head">
        <div>
          <h1 className="ui-heading-large">Agenda</h1>
          <p className="ui-subtle">
            Hoje é {hoje.toLocaleDateString('pt-BR', { dateStyle: 'long', timeZone: 'UTC' })}
          </p>
        </div>
        <span className="ui-lozenge">
          <span className="season-dot" data-season={seasonToday} />
          {seasonLabel(seasonToday)}
        </span>
        {isCoordinator(user) && (
          <Link className="ui-button ui-button--primary" href="/agenda/nova">
            <Icon name="add" />
            Novo evento
          </Link>
        )}
      </div>

      <LiturgyPanel
        date={liturgyDate}
        isToday={liturgyDate === todayIso}
        liturgy={liturgy}
        previousHref={hrefLiturgia(addDaysIso(liturgyDate, -1))}
        nextHref={hrefLiturgia(addDaysIso(liturgyDate, 1))}
        todayHref={hrefLiturgia(todayIso)}
      />

      <div className="dashboard__grid">
        <section className="ui-card dashboard__calendar" aria-label="Calendário do mês">
          <div className="calendar-head">
            <h2 className="ui-heading-medium">{monthLabel(year, month)}</h2>
            <div className="calendar-head__actions">
              <Link className="ui-button" href={`/agenda${capelaId ? `?capela=${capelaId}` : ''}`}>
                Hoje
              </Link>
              <Link
                className="ui-button ui-button--subtle ui-button--icon"
                href={`/agenda?ano=${anterior.year}&mes=${anterior.month}${sufixoCapela}`}
                aria-label="Mês anterior"
                title="Mês anterior"
              >
                <Icon name="chevron-left" />
              </Link>
              <Link
                className="ui-button ui-button--subtle ui-button--icon"
                href={`/agenda?ano=${proximo.year}&mes=${proximo.month}${sufixoCapela}`}
                aria-label="Próximo mês"
                title="Próximo mês"
              >
                <Icon name="chevron-right" />
              </Link>
            </div>
          </div>

          {isCoordinator(user) && capelaOptions.length > 1 && (
            <div className="ui-tabs" role="group" aria-label="Filtrar por capela">
              <Link className="ui-tab" href={hrefCapela()} aria-current={capelaId ? undefined : 'true'}>
                Todas as capelas
              </Link>
              {capelaOptions.map((capela) => (
                <Link
                  key={capela.id}
                  className="ui-tab"
                  href={hrefCapela(capela.id)}
                  aria-current={capelaId === capela.id ? 'true' : undefined}
                >
                  {capela.name}
                </Link>
              ))}
            </div>
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
          />
        </section>

        <section className="ui-card dashboard__next" aria-labelledby="proximas">
          <h2 className="ui-heading-small" id="proximas">
            Próximas celebrações
          </h2>
          <AgendaList
            celebrations={proximas.map((celebration) => ({
              ...celebration,
              date: celebration.date.toISOString(),
            }))}
          />
        </section>
      </div>
    </div>
  );
}

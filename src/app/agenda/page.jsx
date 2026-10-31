import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { listCelebrations, nextCelebrations, listCelebrationCapelas } from '@/services/celebrations.js';
import { CalendarBoard, AgendaList } from '@/components/CalendarBoard.jsx';
import { monthLabel, monthRange, shiftMonth } from '@/domain/calendar/grid.js';
import { seasonForDate, seasonLabel } from '@/domain/liturgy/seasons.js';
import { isAdministrator, isCoordinator } from '@/domain/auth/roles.js';

export const metadata = { title: 'Agenda · Coral Litúrgico' };

export default async function AgendaPage({ searchParams }) {
  const user = await currentUser();
  if (!user) redirect('/entrar');
  if (isAdministrator(user)) redirect('/admin');

  const query = await searchParams;
  const hoje = new Date();
  const year = Number(query?.ano) || hoje.getUTCFullYear();
  const month = Number(query?.mes) || hoje.getUTCMonth() + 1;
  const capelaId = query?.capela || undefined;

  const { from, to } = monthRange(year, month);
  const [celebrations, proximas, capelaOptions] = await Promise.all([
    listCelebrations({ from, to, capelaId }, user),
    nextCelebrations({ limit: 4, capelaId }, user),
    listCelebrationCapelas(user),
  ]);

  const anterior = shiftMonth(year, month, -1);
  const proximo = shiftMonth(year, month, 1);
  const sufixoCapela = capelaId ? `&capela=${capelaId}` : '';

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>Agenda</h1>
          <p>
            Hoje é {hoje.toLocaleDateString('pt-BR', { dateStyle: 'long' })} —{' '}
            {seasonLabel(seasonForDate(hoje))}.
          </p>
        </div>
        {isCoordinator(user) && (
          <Link className="btn" href="/agenda/nova">
            Novo evento
          </Link>
        )}
      </div>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="calendar-head">
          <h2>{monthLabel(year, month)}</h2>
          {isCoordinator(user) && capelaOptions.length > 0 && (
            <form method="get" action="/agenda" className="row" style={{ gap: '0.3rem' }}>
              <input type="hidden" name="ano" value={year} />
              <input type="hidden" name="mes" value={month} />
              <select name="capela" defaultValue={capelaId ?? ''} aria-label="Filtrar por capela" className="select--compact">
                <option value="">todas as capelas</option>
                {capelaOptions.map((capela) => (
                  <option key={capela.id} value={capela.id}>
                    {capela.name}
                  </option>
                ))}
              </select>
              <button className="btn btn--small btn--ghost" type="submit">
                Filtrar
              </button>
            </form>
          )}
          <Link
            className="btn btn--ghost"
            href={`/agenda?ano=${anterior.year}&mes=${anterior.month}${sufixoCapela}`}
            aria-label="Mês anterior"
          >
            ‹
          </Link>
          <Link className="btn btn--ghost" href={`/agenda${capelaId ? `?capela=${capelaId}` : ''}`} aria-label="Mês atual">
            Hoje
          </Link>
          <Link
            className="btn btn--ghost"
            href={`/agenda?ano=${proximo.year}&mes=${proximo.month}${sufixoCapela}`}
            aria-label="Próximo mês"
          >
            ›
          </Link>
        </div>

        <CalendarBoard
          year={year}
          month={month}
          celebrations={celebrations.map((celebration) => ({
            ...celebration,
            date: celebration.date.toISOString(),
          }))}
          today={hoje.toISOString().slice(0, 10)}
        />

        <p style={{ fontSize: '0.78rem', color: 'var(--text-soft)', marginTop: '0.75rem' }}>
          O ponto colorido ao lado do dia indica o tempo litúrgico; a cor da barra
          distingue missa, missa solene e ensaio.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: '1.1rem' }}>Próximas celebrações</h2>
        <AgendaList
          celebrations={proximas.map((celebration) => ({
            ...celebration,
            date: celebration.date.toISOString(),
          }))}
        />
      </section>
    </>
  );
}

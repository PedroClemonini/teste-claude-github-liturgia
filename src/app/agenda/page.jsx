import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { listCelebrations, nextCelebrations } from '@/services/celebrations.js';
import { CalendarBoard, AgendaList } from '@/components/CalendarBoard.jsx';
import { monthLabel, monthRange, shiftMonth } from '@/domain/calendar/grid.js';
import { seasonForDate, seasonLabel } from '@/domain/liturgy/seasons.js';
import { isCoordinator } from '@/domain/auth/roles.js';

export const metadata = { title: 'Agenda · Coral Litúrgico' };

export default async function AgendaPage({ searchParams }) {
  const user = await currentUser();
  if (!user) redirect('/entrar');

  const query = await searchParams;
  const hoje = new Date();
  const year = Number(query?.ano) || hoje.getUTCFullYear();
  const month = Number(query?.mes) || hoje.getUTCMonth() + 1;

  const { from, to } = monthRange(year, month);
  const [celebrations, proximas] = await Promise.all([
    listCelebrations({ from, to }, user),
    nextCelebrations({ limit: 4 }, user),
  ]);

  const anterior = shiftMonth(year, month, -1);
  const proximo = shiftMonth(year, month, 1);

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
            Nova celebração
          </Link>
        )}
      </div>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="calendar-head">
          <h2>{monthLabel(year, month)}</h2>
          <Link
            className="btn btn--ghost"
            href={`/agenda?ano=${anterior.year}&mes=${anterior.month}`}
            aria-label="Mês anterior"
          >
            ‹
          </Link>
          <Link className="btn btn--ghost" href="/agenda" aria-label="Mês atual">
            Hoje
          </Link>
          <Link
            className="btn btn--ghost"
            href={`/agenda?ano=${proximo.year}&mes=${proximo.month}`}
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

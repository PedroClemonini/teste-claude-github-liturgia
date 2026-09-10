import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { getCelebration } from '@/services/celebrations.js';
import { buildScript } from '@/services/repertoire.js';
import { seasonLabel } from '@/domain/liturgy/seasons.js';
import { celebrationTypeLabel } from '@/domain/calendar/grid.js';
import { momentLabel } from '@/domain/liturgy/moments.js';
import { isCoordinator } from '@/domain/auth/roles.js';
import { SongViewer } from '@/components/SongViewer.jsx';

export const metadata = { title: 'Celebração · Coral Litúrgico' };

export default async function CelebracaoPage({ params }) {
  const user = await currentUser();
  if (!user) redirect('/entrar');

  const { id } = await params;
  const celebration = await getCelebration(id, user);
  const script = await buildScript(id, user);

  const data = new Date(celebration.date);

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '0.85rem' }}>
            <Link href="/agenda">← Agenda</Link>
          </p>
          <h1>{celebration.title}</h1>
          <p>
            {data.toLocaleDateString('pt-BR', { dateStyle: 'full', timeZone: 'UTC' })} ·{' '}
            {data.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'UTC',
            })}
            {celebration.location ? ` · ${celebration.location}` : ''}
          </p>
          <div className="row" style={{ marginTop: '0.35rem' }}>
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
            <span className="tag">{seasonLabel(celebration.season)}</span>
            <span className="tag">
              {script.length} {script.length === 1 ? 'canto' : 'cantos'}
            </span>
          </div>
        </div>
        {isCoordinator(user) && (
          <Link className="btn" href={`/celebracoes/${celebration.id}/roteiro`}>
            Editar roteiro
          </Link>
        )}
      </div>

      {celebration.notes && <div className="notice">{celebration.notes}</div>}

      {script.length === 0 ? (
        <p className="empty">
          O roteiro musical ainda não foi montado.
          {isCoordinator(user) ? ' Use “Editar roteiro” para escolher os cantos.' : ''}
        </p>
      ) : (
        <>
          <h2 style={{ fontSize: '1.1rem' }}>Roteiro musical</h2>
          <p style={{ color: 'var(--text-soft)', fontSize: '0.85rem', marginTop: 0 }}>
            Toque em um canto para abrir a cifra. O tom já é o definido para esta celebração e
            pode ser ajustado na hora.
          </p>

          {script.map((item, index) => (
            <details className="script-item" key={item.id} open={index === 0}>
              <summary>
                <span className="script-moment">{item.momentLabel}</span>
                {item.title}
                <span className="tag tag--key" style={{ marginLeft: 'auto' }}>
                  {item.key}
                </span>
              </summary>
              <div className="script-body">
                {/*
                  A cifra entra como foi cadastrada e o tom da celebração vai
                  em `performanceKey`: é o SongViewer que transpõe, uma única
                  vez, e o músico continua podendo subir ou descer dali.
                */}
                <SongViewer
                  song={{
                    title: item.title,
                    composer: item.composer,
                    originalKey: item.originalKey,
                    chordPro: item.sourceChordPro,
                  }}
                  performanceKey={item.key === item.originalKey ? null : item.key}
                  momentLabel={item.momentLabel}
                  variant="embedded"
                />
                <p style={{ fontSize: '0.85rem' }}>
                  <Link href={`/acervo/${item.songId}`}>Abrir no acervo →</Link>
                </p>
              </div>
            </details>
          ))}
        </>
      )}

      {celebration.missingMoments.length > 0 && celebration.type !== 'ENSAIO' && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)', marginTop: '1.5rem' }}>
          Ainda sem canto: {celebration.missingMoments.map(momentLabel).join(', ')}.
        </p>
      )}
    </>
  );
}

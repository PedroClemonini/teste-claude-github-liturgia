import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { getCelebration, isParticipantCoordinator } from '@/services/celebrations.js';
import { buildScript } from '@/services/repertoire.js';
import { seasonLabel } from '@/domain/liturgy/seasons.js';
import { celebrationTypeLabel } from '@/domain/calendar/grid.js';
import { momentLabel } from '@/domain/liturgy/moments.js';
import { isAdministrator, isCoordinator } from '@/domain/auth/roles.js';
import { SongViewer } from '@/components/SongViewer.jsx';
import { DeleteCelebrationButton } from '@/components/DeleteCelebrationButton.jsx';
import { ExportScriptPdfButton } from '@/components/ExportScriptPdfButton.jsx';
import { PerformanceMode } from '@/components/PerformanceMode.jsx';

export const metadata = { title: 'evento · Coral Litúrgico' };

export default async function CelebracaoPage({ params }) {
  const user = await currentUser();
  if (!user) redirect('/entrar');
  if (isAdministrator(user)) redirect('/admin');

  const { id } = await params;
  let celebration;
  let script;
  try {
    celebration = await getCelebration(id, user);
    script = await buildScript(id, user);
  } catch (error) {
    if (error.status === 404) notFound();
    throw error;
  }

  const data = new Date(celebration.date);
  // Roteiro e exclusão continuam exclusivos de quem administra a capela
  // dona; editar as informações do evento também vale pra um coordenador
  // escalado como participante, mesmo sendo de outra capela.
  const ehDaPropriaCapela = isCoordinator(user) && celebration.capelaId === user.capelaId;
  const podeEditarEvento = ehDaPropriaCapela || isParticipantCoordinator(user, celebration);
  const podeGerenciar = ehDaPropriaCapela;

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
            <span className="tag">{celebration.capela.name}</span>
            <span className="tag">
              {script.length} {script.length === 1 ? 'canto' : 'cantos'}
            </span>
          </div>
        </div>
        {(podeEditarEvento || podeGerenciar) && (
          <span className="row">
            {podeEditarEvento && (
              <Link className="btn btn--ghost" href={`/celebracoes/${celebration.id}/editar`}>
                Editar evento
              </Link>
            )}
            {podeGerenciar && (
              <Link className="btn" href={`/celebracoes/${celebration.id}/roteiro`}>
                Editar roteiro
              </Link>
            )}
            {podeGerenciar && <DeleteCelebrationButton celebrationId={celebration.id} />}
          </span>
        )}
      </div>

      {celebration.notes && <div className="notice">{celebration.notes}</div>}

      {celebration.participants.length > 0 && (
        <div className="row" style={{ marginBottom: '1rem' }}>
          {celebration.participants.map((participant) => (
            <span className="tag" key={participant.id}>
              {participant.name}
              {participant.capelaId !== celebration.capelaId && participant.capela
                ? ` (${participant.capela.name})`
                : ''}
            </span>
          ))}
        </div>
      )}

      {script.length === 0 ? (
        <p className="empty">
          O roteiro musical ainda não foi montado.
          {podeGerenciar ? ' Use “Editar roteiro” para escolher os cantos.' : ''}
        </p>
      ) : (
        <>
          <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Roteiro musical</h2>
            <span className="row">
              <PerformanceMode
                songs={script.map((item) => ({
                  id: item.id,
                  title: item.title,
                  composer: item.composer,
                  originalKey: item.originalKey,
                  chordPro: item.sourceChordPro,
                  momentLabel: item.momentLabel,
                  performanceKey: item.key === item.originalKey ? null : item.key,
                }))}
              />
              <ExportScriptPdfButton />
            </span>
          </div>
          <p style={{ color: 'var(--text-soft)', fontSize: '0.85rem', marginTop: 0 }}>
            Toque em um canto para abrir a cifra. O tom já é o definido para esta evento e
            pode ser ajustado na hora. Na hora da missa, “Modo missa” abre as cifras em tela
            cheia, na ordem do rito.
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
                  A cifra entra como foi cadastrada e o tom da evento vai
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

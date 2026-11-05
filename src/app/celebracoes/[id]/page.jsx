import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { getCelebration, isParticipantCoordinator } from '@/services/celebrations.js';
import { buildScript } from '@/services/repertoire.js';
import { seasonLabel } from '@/domain/liturgy/seasons.js';
import { celebrationTypeLabel } from '@/domain/calendar/grid.js';
import { momentLabel } from '@/domain/liturgy/moments.js';
import { canManageCapela } from '@/domain/auth/roles.js';
import { SongViewer } from '@/components/SongViewer.jsx';
import { DeleteCelebrationButton } from '@/components/DeleteCelebrationButton.jsx';
import { ExportScriptPdfButton } from '@/components/ExportScriptPdfButton.jsx';
import { PerformanceMode } from '@/components/PerformanceMode.jsx';
import { Breadcrumbs } from '@/components/Breadcrumbs.jsx';
import { LiturgyChoicePicker } from '@/components/LiturgyChoicePicker.jsx';
import { LiturgyPanel } from '@/components/LiturgyPanel.jsx';
import { displaySeason, isSaturdayMass, liturgyChoiceFor, liturgyDateFor } from '@/domain/liturgy/daily.js';
import { getLiturgy } from '@/services/liturgy.js';
import { Icon } from '@/components/Icon.jsx';

export const metadata = { title: 'Evento · Coral Litúrgico' };

export default async function CelebracaoPage({ params }) {
  const user = await currentUser();
  if (!user) redirect('/entrar');

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

  const liturgyDate = liturgyDateFor(celebration);
  const liturgy = celebration.type === 'ENSAIO' ? null : await getLiturgy(liturgyDate, user);
  const data = new Date(celebration.date);
  // Roteiro e exclusão continuam exclusivos de quem administra a capela
  // dona; editar as informações do evento também vale pra um coordenador
  // escalado como participante, mesmo sendo de outra capela.
  const ehDaPropriaCapela = canManageCapela(user, celebration.capela);
  const podeEditarEvento = ehDaPropriaCapela || isParticipantCoordinator(user, celebration);
  const podeGerenciar = ehDaPropriaCapela;

  return (
    <>
      <div className="ui-page-head">
        <Breadcrumbs items={[{ href: '/agenda', label: 'Agenda' }, { label: celebration.title }]} />
        {(podeEditarEvento || podeGerenciar) && (
          <span className="ui-button-group ui-event-actions">
            {podeEditarEvento && (
              <Link className="ui-button" href={`/celebracoes/${celebration.id}/editar`} title="Editar evento">
                <Icon name="edit" />
                <span className="ui-button__label">Editar evento</span>
              </Link>
            )}
            {podeGerenciar && (
              <Link
                className="ui-button ui-button--primary"
                href={`/celebracoes/${celebration.id}/roteiro`}
                title="Editar roteiro"
              >
                <Icon name="audio" />
                <span className="ui-button__label">Editar roteiro</span>
              </Link>
            )}
            {podeGerenciar && <DeleteCelebrationButton celebrationId={celebration.id} />}
          </span>
        )}
      </div>

      <header className="ui-event-head">
        <h1 className="ui-heading-large">{celebration.title}</h1>
        <p className="ui-subtle">
          {data.toLocaleDateString('pt-BR', { dateStyle: 'full', timeZone: 'UTC' })} ·{' '}
          {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
          {celebration.location ? ` · ${celebration.location}` : ''}
        </p>
        <div className="ui-event-tags">
          <span className="ui-lozenge" data-type={celebration.type}>
            {celebrationTypeLabel(celebration.type)}
          </span>
          <span className="ui-lozenge">
            <span className="season-dot" data-season={displaySeason(celebration)} />
            {seasonLabel(displaySeason(celebration))}
          </span>
          <span className="ui-lozenge">{celebration.capela.name}</span>
        </div>
      </header>

      {celebration.notes && <p className="ui-section-message">{celebration.notes}</p>}

      {celebration.type !== 'ENSAIO' && (
        <LiturgyPanel date={liturgyDate} liturgy={liturgy} heading="Liturgia desta missa">
          {isSaturdayMass(celebration) && (
            <LiturgyChoicePicker
              celebrationId={celebration.id}
              choice={liturgyChoiceFor(celebration)}
              automatic={!celebration.liturgyChoice}
              canEdit={podeEditarEvento}
            />
          )}
        </LiturgyPanel>
      )}

      {celebration.participants.length > 0 && (
        <section className="ui-event-section" aria-labelledby="participantes">
          <h2 className="ui-heading-small" id="participantes">
            Participantes
          </h2>
          <ul className="ui-people">
            {celebration.participants.map((participant) => {
              const deFora =
                participant.memberships.length > 0 &&
                !participant.memberships.some((membership) => membership.capelaId === celebration.capelaId);
              return (
                <li key={participant.id}>
                  <span className="ui-avatar" aria-hidden="true">
                    {participant.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <span>
                    {participant.name}
                    {deFora && (
                      <small>{participant.memberships.map((membership) => membership.capela.name).join(', ')}</small>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="ui-event-section" aria-labelledby="roteiro">
        <div className="ui-section-head">
          <div>
            <h2 className="ui-heading-small" id="roteiro">
              Roteiro musical
            </h2>
            <p className="ui-subtle">
              {script.length} {script.length === 1 ? 'canto' : 'cantos'}
            </p>
          </div>
          {script.length > 0 && (
            <span className="ui-button-group">
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
          )}
        </div>

        {script.length === 0 ? (
          <div className="ui-empty">
            <Icon name="audio" size={32} />
            <p>O roteiro musical ainda não foi montado.</p>
            {podeGerenciar && (
              <Link className="ui-button ui-button--primary" href={`/celebracoes/${celebration.id}/roteiro`}>
                Montar roteiro
              </Link>
            )}
          </div>
        ) : (
          <div className="ui-script">
            {script.map((item, index) => (
              <details className="script-item" key={item.id} open={index === 0}>
                <summary>
                  <Icon name="chevron-right" />
                  <span className="script-title">
                    <span className="script-moment">{item.momentLabel}</span>
                    {item.title}
                  </span>
                  <span className="ui-key" title="Tom neste evento">
                    {item.key}
                  </span>
                </summary>
                <div className="script-body">
                  {/*
                    A cifra entra como foi cadastrada e o tom do evento vai em
                    `performanceKey`: é o SongViewer que transpõe, uma única vez,
                    e o músico continua podendo subir ou descer dali.
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
                  <p className="ui-script__link">
                    <Link href={`/acervo/${item.songId}`}>Abrir no acervo</Link>
                  </p>
                </div>
              </details>
            ))}
          </div>
        )}

        {celebration.missingMoments.length > 0 && celebration.type !== 'ENSAIO' && (
          <p className="ui-helper ui-missing">
            Ainda sem canto: {celebration.missingMoments.map(momentLabel).join(', ')}.
          </p>
        )}
      </section>
    </>
  );
}

import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { roleLabel } from '@/domain/auth/roles.js';
import { ProfileForm } from '@/components/ProfileForm.jsx';

export const metadata = { title: 'Perfil · Coral Litúrgico' };

export default async function PerfilPage() {
  const user = await currentUser();
  if (!user) redirect('/entrar');

  return (
    <>
      <div className="ui-page-head">
        <div>
          <h1 className="ui-heading-large">Perfil</h1>
          <p className="ui-subtle">Seus dados de acesso e os instrumentos que você toca.</p>
        </div>
      </div>

      <ProfileForm user={{ name: user.name, email: user.email, instruments: user.instruments }} />

      <section className="ui-card ui-profile-capelas">
        <h2 className="ui-heading-small">Suas capelas</h2>
        {user.isOwner && <p className="ui-subtle">Você é o dono do sistema e coordena todas as capelas.</p>}
        {user.memberships.length === 0 && !user.isOwner && (
          <p className="ui-subtle">Você ainda não faz parte de nenhuma capela.</p>
        )}
        {user.memberships.length > 0 && (
          <ul className="ui-list">
            {user.memberships.map((membership) => (
              <li key={membership.capelaId} className="ui-capela">
                <span>{membership.capela.name}</span>
                <span className="ui-lozenge" data-type={membership.role === 'COORDENADOR' ? 'MISSA_COMUM' : undefined}>
                  {roleLabel(membership.role)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="ui-credits">Feito para servir à liturgia — cifras em ChordPro, sem PDF.</p>
    </>
  );
}

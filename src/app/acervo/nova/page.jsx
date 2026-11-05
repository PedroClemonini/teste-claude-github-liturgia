import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { isCoordinator } from '@/domain/auth/roles.js';
import { SongForm } from '@/components/SongForm.jsx';
import { listSongTags } from '@/services/songs.js';
import { Breadcrumbs } from '@/components/Breadcrumbs.jsx';

export const metadata = { title: 'Nova música · Coral Litúrgico' };

export default async function NovaMusicaPage() {
  const user = await currentUser();
  if (!user) redirect('/entrar');
  if (!isCoordinator(user)) redirect('/acervo');

  return (
    <>
      <Breadcrumbs items={[{ href: '/acervo', label: 'Acervo' }, { label: 'Nova música' }]} />
      <div className="ui-page-head">
        <div>
          <h1 className="ui-heading-large">Nova música</h1>
          <p className="ui-subtle">Digite a cifra e confira o alinhamento na pré-visualização.</p>
        </div>
      </div>
      <SongForm tagSuggestions={await listSongTags()} />
    </>
  );
}

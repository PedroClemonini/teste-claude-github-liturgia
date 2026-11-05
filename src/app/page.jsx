import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';

export default async function HomePage() {
  const user = await currentUser();
  if (user) redirect('/agenda');

  return (
    <div className="ui-auth ui-auth--wide">
      <h1 className="ui-heading-large">Santa Liturgia</h1>
      <p className="ui-subtle">
        Site de apoio para o coral da paróquia São Francisco Xavier, da Diocese de Guarulhos.
      </p>
      <ul className="ui-auth__list">
        <li>Agenda com missas, solenidades e ensaios.</li>
        <li>Roteiro musical por momento do rito.</li>
        <li>Escreva cifras ou importe direto do CifraClub.</li>
      </ul>
      <Link className="ui-button ui-button--primary" href="/entrar">
        Entrar
      </Link>
    </div>
  );
}

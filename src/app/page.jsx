import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { isAdministrator } from '@/domain/auth/roles.js';

export default async function HomePage() {
  const user = await currentUser();
  if (user) redirect(isAdministrator(user) ? '/admin' : '/agenda');

  return (
    <div className="auth">
      <div className="card">
        <h1>Santa Liturgia - São Francisco Xavier</h1>
        <p>
          Este é um site de apoio para o coral da paróquia São Francisco Xavier da Diocese de Guarulhos
        </p>
        <ul>
          <li>Agenda com missas, solenidades e ensaios.</li>
          <li>Roteiro musical por momento do rito.</li>
          <li>Escreva Cifras ou transponha direto do CifraClub.</li>
        </ul>
        <div className="row">
          <Link className="btn" href="/entrar">
            Entrar
          </Link>
        </div>
      </div>
    </div>
  );
}

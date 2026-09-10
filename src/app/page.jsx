import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';

export default async function HomePage() {
  const user = await currentUser();
  if (user) redirect('/agenda');

  return (
    <div className="auth">
      <div className="card">
        <h1>Coral Litúrgico</h1>
        <p>
          Calendário das celebrações, escala da equipe e o acervo de cifras em um só lugar —
          pensado para ser lido no celular, durante a missa.
        </p>
        <ul>
          <li>Agenda com missas, solenidades e ensaios.</li>
          <li>Roteiro musical por momento do rito.</li>
          <li>Cifras em ChordPro, com transposição em um clique.</li>
        </ul>
        <div className="row">
          <Link className="btn" href="/entrar">
            Entrar
          </Link>
          <Link className="btn btn--ghost" href="/cadastro">
            Criar conta
          </Link>
        </div>
      </div>
    </div>
  );
}

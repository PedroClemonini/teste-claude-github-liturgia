/**
 * Manifesto do app: nome e ícone usados quando alguém o adiciona à tela
 * inicial do celular. O ícone da aba (icon.png) e o do iPhone
 * (apple-icon.png) ficam ao lado, em src/app, pela convenção do Next.
 */
export default function manifest() {
  return {
    name: 'Santa Liturgia - São Francisco Xavier',
    short_name: 'Santa Liturgia',
    description: 'Calendário, escalas e cifras para corais católicos.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#6b2d5b',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}

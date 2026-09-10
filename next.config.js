/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // O cliente Prisma é nativo: precisa ficar fora do bundle do servidor.
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
};

export default nextConfig;

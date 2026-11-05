-- Migra uma base antiga para o modelo de várias capelas por pessoa:
--   * User.capelaId + User.role  ->  CapelaMembership (papel por capela)
--   * User.voiceOrInstrument     ->  User.instruments
--   * papel ADMINISTRADOR some; um único usuário recebe User.isOwner
--
-- O `prisma db push` da inicialização do container recusa essas mudanças, pois
-- apagariam colunas com dados. Rode este script antes de subir a nova versão:
--
--   docker exec -i <container-db> psql -U postgres -d <banco> \
--     -v ON_ERROR_STOP=1 -v owner_email=dono@exemplo.org \
--     < prisma/upgrade-capelas-multiplas.sql
--
-- Tudo roda numa transação: se algo falhar, a base fica como estava.
-- Sem -v owner_email o script falha, e rodar de novo numa base já migrada também:
-- nos dois casos, nada é alterado.

BEGIN;

CREATE TABLE "CapelaMembership" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "capelaId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CapelaMembership_pkey" PRIMARY KEY ("id")
);

-- Quem era Administrador e estava numa capela continua nela como Coordenador.
INSERT INTO "CapelaMembership" ("id", "userId", "capelaId", "role")
SELECT 'm' || md5("id" || "capelaId"), "id", "capelaId",
       CASE WHEN "role"::text = 'MUSICO' THEN 'MUSICO' ELSE 'COORDENADOR' END
FROM "User"
WHERE "capelaId" IS NOT NULL;

ALTER TABLE "User" ADD COLUMN "instruments" TEXT[];
UPDATE "User"
SET "instruments" = CASE WHEN btrim("voiceOrInstrument") IN ('', 'Administração') THEN ARRAY[]::TEXT[]
                         ELSE ARRAY[btrim("voiceOrInstrument")] END;

ALTER TABLE "User" ADD COLUMN "isOwner" BOOLEAN;
UPDATE "User" SET "isOwner" = TRUE WHERE "email" = lower(:'owner_email');

-- Com contas na base, o dono precisa existir: sem ele ninguém cria capelas.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "User") AND NOT EXISTS (SELECT 1 FROM "User" WHERE "isOwner") THEN
    RAISE EXCEPTION 'Nenhuma conta com o e-mail informado para o dono.';
  END IF;
END $$;

ALTER TABLE "User" DROP CONSTRAINT "User_capelaId_fkey";
ALTER TABLE "User" DROP COLUMN "capelaId", DROP COLUMN "role", DROP COLUMN "voiceOrInstrument";

DROP TYPE "Role";
CREATE TYPE "Role" AS ENUM ('COORDENADOR', 'MUSICO');
ALTER TABLE "CapelaMembership"
  ALTER COLUMN "role" TYPE "Role" USING "role"::"Role",
  ALTER COLUMN "role" SET DEFAULT 'MUSICO';

CREATE UNIQUE INDEX "User_isOwner_key" ON "User"("isOwner");
CREATE UNIQUE INDEX "CapelaMembership_userId_capelaId_key" ON "CapelaMembership"("userId", "capelaId");
CREATE INDEX "CapelaMembership_capelaId_idx" ON "CapelaMembership"("capelaId");
ALTER TABLE "CapelaMembership"
  ADD CONSTRAINT "CapelaMembership_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CapelaMembership_capelaId_fkey" FOREIGN KEY ("capelaId")
    REFERENCES "Capela"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

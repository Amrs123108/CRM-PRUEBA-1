-- AlterTable
ALTER TABLE "DefinicionCampo" ADD COLUMN     "esMonetario" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Meta" (
    "id" TEXT NOT NULL,
    "moduloId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "metaClientes" INTEGER NOT NULL DEFAULT 0,
    "metaMonto" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Meta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Meta_moduloId_mes_key" ON "Meta"("moduloId", "mes");

-- AddForeignKey
ALTER TABLE "Meta" ADD CONSTRAINT "Meta_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "Modulo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

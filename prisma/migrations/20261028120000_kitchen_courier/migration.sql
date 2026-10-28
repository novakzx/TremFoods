-- Estafeta em tempo real (link secreto e última posição).
ALTER TABLE "Order" ADD COLUMN "courierToken" TEXT,
ADD COLUMN "courierLat" DOUBLE PRECISION,
ADD COLUMN "courierLng" DOUBLE PRECISION,
ADD COLUMN "courierAccuracy" DOUBLE PRECISION,
ADD COLUMN "courierAt" TIMESTAMP(3);

-- CreateIndex (não único: o token é aleatório de 192 bits e um índice único
-- obrigaria o `prisma db push` do deploy a usar --accept-data-loss)
CREATE INDEX "Order_courierToken_idx" ON "Order"("courierToken");

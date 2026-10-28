// Módulo puro (sem BD): usado também em componentes de cliente.
// Máquina de estados do pedido: o índice `order` é a posição no fluxo e
// impede transições para trás (ex.: voltar de "Entregue" para "Em preparação").
export type OrderStage = 'RECEIVED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export const FLOW: readonly OrderStage[] = ['RECEIVED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export const LIFECYCLE: Record<string, { label: string; pickupLabel?: string; order: number }> = {
  RECEIVED: { label: 'Pedido recebido', order: 0 },
  PREPARING: { label: 'Em preparação', order: 1 },
  OUT_FOR_DELIVERY: { label: 'Saiu para entrega', pickupLabel: 'Pronto para levantamento', order: 2 },
  DELIVERED: { label: 'Entregue', pickupLabel: 'Concluído', order: 3 },
  CANCELLED: { label: 'Cancelado', order: 9 },
};

export function statusLabel(status: string, deliveryMethod?: string) {
  const meta = LIFECYCLE[status];
  if (!meta) return status;
  if (deliveryMethod === 'PICKUP' && meta.pickupLabel) return meta.pickupLabel;
  return meta.label;
}

// Transições permitidas (uma fonte de verdade para a API e para o painel):
// avança um passo de cada vez; cancelar só antes de o pedido sair da loja.
export const TRANSITIONS: Record<string, readonly OrderStage[]> = {
  RECEIVED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
};

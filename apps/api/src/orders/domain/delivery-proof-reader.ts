export abstract class DeliveryProofReader {
  abstract hasDeliveryProof(orderId: string): Promise<boolean>;
}

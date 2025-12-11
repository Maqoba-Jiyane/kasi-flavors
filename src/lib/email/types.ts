// src/lib/email/types.ts

export type TenantEmailConfig = {
    tenantId: string;
    from: string;
    replyTo?: string;
    brandName: string;
    logoUrl?: string;
    baseUrl: string;      // used for links like /track
    poweredBy?: string;   // footer text
  };
  
  export type FulfilmentType = "COLLECTION" | "DELIVERY";
  
  export type OrderItemForEmail = {
    name: string;
    quantity: number;
    totalCents: number;
  };
  
  export type SendOrderEmailArgs = {
    tenantConfig: TenantEmailConfig;
    to: string;
    customerName: string;
    storeName: string;
    orderId: string;
    pickupCode: string;
    trackingToken: string;
    fulfilmentType: FulfilmentType;
    items: OrderItemForEmail[];
    totalCents: number;
  };
  
  export type SendOrderReadyEmailArgs = {
    tenantConfig: TenantEmailConfig;
    to: string;
    customerName: string;
    storeName: string;
    orderId: string;
    pickupCode: string;
    fulfilmentType: FulfilmentType;
  };
  
  export type BuiltEmail = {
    from: string;
    replyTo?: string;
    to: string;
    subject: string;
    html: string;
  };
  
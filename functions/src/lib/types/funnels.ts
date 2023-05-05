export type Funnel = {
    id: string;
    title: string;
    steps: FunnelStep[];
    total_sales: number;
    status: boolean;
    total_aov: number;
    total_orders: number;
    total_earnings: number;
    tags: string[];
    merchant_uuid: string;
    created_at: FirebaseFirestore.Timestamp;
    updated_at: FirebaseFirestore.Timestamp;
  };
  
  export type FunnelStep = {
    id: string;
    name: "OPT_IN" | "UPSELL" | "DOWNSELL" | "VIDEO" | "CONFIRMATION" | "";
    order: number;
    products: {
      title: string;
      product_id: string;
      url: string;
      price: number;
      image?: string;
      options?: Record<string, string>;
    }[];
    success_url: string;
    has_bump: boolean;
    decline_url?: string;
    confirm_url?: string;
    created_at: FirebaseFirestore.Timestamp;
    updated_at: FirebaseFirestore.Timestamp;
  };
  
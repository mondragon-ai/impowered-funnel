export type Product = {
    id: string;
    product_id: number;
    high_risk: boolean;
    title: string;
    description: string;
    sku: string;
    price: number;
    status: boolean;
    sell_overstock: boolean;
    is_digital: boolean;
    requires_shipping: boolean;
    compare_at_price: number;
    handle: string;
    weight: number;
    quantity: number;
    tags: string[];
    categories: string[];
    option1: string;
    option2: string;
    option3: string;
    updated_at: FirebaseFirestore.Timestamp;
    created_at: FirebaseFirestore.Timestamp;
    variants: []
}


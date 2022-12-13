import { Address } from "./addresses";

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

export type Collection = {
    id: string,
    title: string,
    type_to_compare: string,
    condition: "===",
    compare_against: string,
    notes: string,
    products: {
        id: string,
        title: string,
        url: string,
        option1: string,
        option2: string,
        option3: string,
        compare_at_price: number,
        price: number,
    }[],
    updated_at: FirebaseFirestore.Timestamp;
    created_at: FirebaseFirestore.Timestamp;
}

export type Bundle = {
    id: string,
    title: string,
    total: number,
    new_price: number,
    tags: string[],
    notes: string,
    products: {
        id: string,
        title: string,
        url: string,
        option1: string,
        option2: string,
        option3: string,
        compare_at_price: number,
        price: number,
    }[],
    updated_at: FirebaseFirestore.Timestamp;
    created_at: FirebaseFirestore.Timestamp;
}



export interface GiftCard {
    customer:{
        cus_uuid: string,
        first_name: string,
        last_name:string,
        email: string,
    },
    id: string,
    notes: string,
    starting_balance: number,
    current_balance: number,
    code: string
    updated_at: FirebaseFirestore.Timestamp;
    created_at: FirebaseFirestore.Timestamp;
}

export type SubscriptionAgreement = { 
    updated_at: FirebaseFirestore.Timestamp;
    created_at: FirebaseFirestore.Timestamp;
    id?: string,
    customer:{
        cus_uuid: string,
        first_name: string,
        last_name:string,
        email: string,
        addresses: Address[]
    },
    schedule: {
        interval: number,
        type: "MONTH" | "DAY" | "YEAR" | "TRIAL" | ""
    },
    product: {
        product_id: string,
        variant_id: string,
        title: string,
        options1: string,
        options2: string,
        options3: string,
        price: number
    },
    order_number: string,
    payment_method: "STRIPE" | "PAYPAL" | "SQUARE" | ""



}

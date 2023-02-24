import { Address } from "./addresses";

export type Product = {
    high_risk: boolean
    title: string;
    handle: string;
    price: number;
    description?: string;
    compare_at_price?: number;
    quantity: number;
    weight?: number;
    status: boolean;
    id: string;
    is_digital?: boolean;
    sell_overstock?: boolean;
    requires_shipping?: boolean;
    tags: string[],
    collections: string[],
    option1?: string,
    option2?: string,
    option3?: string,
    options: {
        options1: string[],
        options2: string[],
        options3: string[]
    },
    videos: {
        id: string,
        url: string,
        type: "YOUTUBE" | "VIMEO"
    }[],
    images: {
        id: string,
        url: string,
        alt: string
    }[],
    variants?: Variant[],
    sku?: string,
    external_id: string,
    external_type: string,
    updated_at: FirebaseFirestore.Timestamp;
    created_at: FirebaseFirestore.Timestamp;
}



export interface Variant 
  {
    product_id?: string,
    variant_id?: string,
    sku?: string,
    compare_at?: number,
    price?: number,
    options1?: string,
    options2?: string,
    options3?: string,
    quantity?: number,
    high_risk: boolean,
    title: string,
    weight: number,
    compare_at_price: number,
    status?: boolean,
    image_url?: string,
    inventory?: number,
    external_id: string,
    external_type: string,
    updated_at: FirebaseFirestore.Timestamp;
    created_at: FirebaseFirestore.Timestamp;
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

import { Address, ShippingLines } from "./addresses";
import { DicsountCode } from "./discounts";

export interface LineItem {
    variant_id: string,
    product_id: string,
    high_risk: boolean,
    title: string,
    sku: string,
    price: number,
    compare_at_price: number,
    handle: string,
    options1: string,
    options2: string,
    options3: string,
    weight: number,
    quantity: number,
    is_recurring?: boolean
}

export interface DraftOrder {
    high_risk: boolean,
    line_items: LineItem[],
    updated_at: FirebaseFirestore.Timestamp,
    created_at: FirebaseFirestore.Timestamp,
    addresses: Address[],
    id?: string,
    phone?: string,
    checkout_url?: string
    type?: "FUNNEL" | "STORE",
    isActive?: boolean,
    gateway?: "STRIPE" | "SQUARE" | "",
    used_gift_card?: boolean,
    has_discount?: boolean,
    gift_card?: string
    discount_code?: DicsountCode,
    browser_ip?: string,
    current_subtotal_price?: number, 
    current_discount_value?: number,
    current_gift_card_value?: number, 
    current_total_price: number, 
    customer_id?: string,
    email?: string,
    tags?: string[],
    note?: string,
    shipping_line?: ShippingLines,
    fullfillment_status?: "PRINTED" | "SENT" | "TRANSIT" | "HOLD" | "DELIVERED" | "LOST",
    payment_status?: "PAID" | "UNPAID",
    transaction_id: string,
    store_type?: "SHOPIFY" | "IMPOWERED" | ""
}

export interface Order {
    order_name: string,
    high_risk: boolean,
    line_items: LineItem[],
    updated_at: FirebaseFirestore.Timestamp,
    created_at: FirebaseFirestore.Timestamp,
    addresses: Address[],
    id?: string,
    phone?: string,
    checkout_url?: string
    type?: "FUNNEL" | "STORE",
    isActive?: boolean,
    gateway?: "STRIPE" | "SQUARE" | "",
    used_gift_card?: boolean,
    has_discount?: boolean,
    gift_card?: string
    discount_code?: DicsountCode,
    browser_ip?: string,
    current_subtotal_price?: number, 
    current_discount_value?: number,
    current_gift_card_value?: number, 
    current_total_price: number, 
    customer_id?: string,
    email?: string,
    tags?: string[],
    note?: string,
    shipping_line?: ShippingLines,
    fullfillment_status?: "PRINTED" | "SENT" | "TRANSIT" | "HOLD" | "DELIVERED" | "LOST",
    payment_status?: "PAID" | "UNPAID",
    transaction_id: string,
    store_type?: "SHOPIFY" | "IMPOWERED" | "",
    first_name: string,
    last_name: string,
    order_number: string,
}

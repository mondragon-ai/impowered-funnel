import {Address} from "./addresses"
import { LineItem } from "./draft_rders"
export interface NewSession { 
    first_name: string,
    id?: string,
    tags: string[],
    email: string,
    phone: string,
    accepts_SMS: boolean,
    accepts_email: boolean,
    last_name: string,
    ip_address: string,
    ORDER_STARTED?: boolean,
    stripe?: {
        UUID: string,
        PI_UUID: string, 
        CLIENT_ID: string,
    },
    square?: {
        UUID: string,
        PI_UUID: string, 
        CLIENT_ID: string,
        CARD_UUID: string
    },
    created_at: FirebaseFirestore.Timestamp,
    updated_at: FirebaseFirestore.Timestamp
}

export interface Customer {
    subscriptions: string[],
    merchant_uuid: string,
    id: string,
    first_name: string,
    last_name: string,
    email: string,
    status: boolean,
    tags: string[],
    last_order: LastOrder,
    notes: string,
    total_orders: number,
    total_spent: number,
    phone?: string,
    accepts_SMS?: boolean,
    accepts_email?: boolean,
    ip_address?: string,
    ORDER_STARTED?: boolean,
    stripe?: {
        PM?: string
        UUID?: string,
        CLIENT_ID: string,
    },
    square?: {
        PM: string,
        UUID?: string,
        location?: string
    },
    created_at?: FirebaseFirestore.Timestamp,
    updated_at: FirebaseFirestore.Timestamp,
    line_items?: LineItem[],
    addresses: Address[],
    orders: string[],
    draft_orders: string,
    shopify_uuid: string,
    funnel_uuid: string,
    funnels: string[]
}

export type LastOrder = {
    id: string,
    line_items: LineItem[],
    total_price: number,
    order_number: string,
    payment_status: boolean, 
    fulfillment_status: boolean,
}
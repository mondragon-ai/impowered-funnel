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
    first_name?: string,
    id: string,
    tags?: string[],
    email?: string,
    phone?: string,
    accepts_SMS?: boolean,
    accepts_email?: boolean,
    last_name?: string,
    ip_address?: string,
    ORDER_STARTED?: boolean
    stripe?: {
        UUID: string,
        PI_UUID: string, 
        CLIENT_ID: string,
        PM: string
    }
    created_at?: FirebaseFirestore.Timestamp,
    updated_at: FirebaseFirestore.Timestamp,
    line_items?: LineItem,
    addresses: Address[],
    orders: string[],
    draft_orders: string[],
    shopify_uuid: string
}
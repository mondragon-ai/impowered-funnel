import { AppSession } from "./Sessions"

export type CreateMerchant = {
    merchant: Merchant,
    token: string
    id: string,
    first_name: string,
    last_name: string,
    email: string,
    user?: UserSummary
    merchant_uuid?: string
}
export type SendSecret = {
    merchant_uuid: string,
    token: string,
    amount: number,
    service: string
}

export type Merchant = {
    id: string,
    shop: string,
    owner: UserSummary,
    sqaure: {
        UUID: string,
        PM: string,
    },
    stripe: {
        UUID: string,
        secret: string,
        PM: string,
    },
    created_at: FirebaseFirestore.Timestamp;
    updated_at: FirebaseFirestore.Timestamp;
    host: string
    api_key: string
    ip_address: string
    payment_history: {
        date: FirebaseFirestore.Timestamp;
        amount: number,
        email: string,
        id: string
    }[],
    api_keys: AppSession,
    billing: {
        usage: number,
        amount: number,
        time: number,
        name: string
        title: string,
        id: string,
    }[];

}

export type AppMeta = {
    name: string,
    id: string,
    title: string,
    charge_type: "FIXED" | "USAGE" | "BOTH"
}

export type UserSummary = {
    id: string,
    first_name: string,
    last_name: string,
    email: string,
}

export type User = {
    isOwner: boolean,
    id: string
    ip_address?: string,
    merchant_uuid?: string
    first_name: string,
    last_name: string,
    email: string,
    created_at: FirebaseFirestore.Timestamp;
    updated_at: FirebaseFirestore.Timestamp;
    api_key: string;
    roles: string[]
}


export type AppSessionBilling = {
    charge_monthly: number,
    charge_rate: number,
    time:  number
    service_type: "PLAFORM" | "USER" | "API_KEY" | "MICRO_SERVICE"
}

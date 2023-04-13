export type CreateMerchant = {
    merchant: Merchant,
    token: string
    id: string,
    first_name: string,
    last_name: string,
    email: string,
    user?: any
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
}

export type UserSummary = {
    id: string,
    first_name: string,
    last_name: string,
    email: string,
}

export type User = {
    first_name: string,
    last_name: string,
    email: string,
    created_at: FirebaseFirestore.Timestamp;
    updated_at: FirebaseFirestore.Timestamp;
    api_key: string;
}


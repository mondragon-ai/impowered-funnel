
export type AppSession = {
    host: "127.0.0.1" | string;
    api_key: string;
    dev_api_key: string;
    production: boolean;
    merchant_uuid: string;
    updated_at: FirebaseFirestore.Timestamp;
    created_at: FirebaseFirestore.Timestamp;
    roles: ["ALL" | "STOREFRONT"];
    usage: { time: number, count: number}
}

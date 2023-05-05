import { UserSummary } from "./merchants";

export type AppSession = {
    host: "127.0.0.1" | string;
    api_key: string;
    session_type: "STORE_FRONT" | "USER" | "API_KEY" | "MICRO_SERVICE"
    dev_api_key: string;
    production: boolean;
    merchant_uuid: string;
    owner: UserSummary;
    updated_at: FirebaseFirestore.Timestamp;
    created_at: FirebaseFirestore.Timestamp;
    roles: string[];
    usage: { time: number, count: number};
    billing: {
        charge_rate: number,
        charge_monthly: number,
        time: number,
        service_type: "PLATFORM" | "API_KEY" | "MICRO",
        title: string,
        id: string,
    }[];
    is_valid: boolean
    is_charging: boolean
    service:  string,
}

import { Address } from "cluster";
import { LastOrder } from "./customers";

export type Fulfillment = {
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
    last_order: LastOrder,
    return_address: Address,
    shipping_line: {
        provider: "USPS" | "UPS",
        rate: "STANDARD" | "INTERNATIONAL" | "EXPRESS" | "EXPRESS_I"
        packaging_type: "ENVELOPE" | "PACKAGE",
        weight: number,
        insurance: boolean
        price: number
    },
    tracking_id: string, 
    label_url: string, 
    status: boolean
}
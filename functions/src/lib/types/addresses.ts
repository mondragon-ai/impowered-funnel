export interface Address {
    type: "BOTH" | "SHIPPING" | "BILLING", // default: BOTH
    line1: string,
    line2?: string,
    city: string,
    state: string,
    zip: string,
    country: string,
    name: string,
    title?: string,
}

export interface ShippingLines {
    id: string,
    title: string,
    price: number
}
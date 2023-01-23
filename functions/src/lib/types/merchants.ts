
export type Merchant = {
    shop: string,
    owner: UserSummary,
    sqaure: {
        UUID: string,
        PM: string,
    }
}

export type UserSummary = {
    first_name: string,
    last_name: string,
    email: string,
}


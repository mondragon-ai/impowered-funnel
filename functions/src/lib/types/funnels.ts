export type Funnel = {
    id: string;
    title: string;
    steps: {
        name: "OPT_IN" | " UPSELL" | "DOWNSELL" | "VIDEO" | ""
    }[],
    total_sales: number,
    status: boolean,
    total_aov: number, 
    total_orders: number, 
    total_earnings: number, 
    tags: string[]
}


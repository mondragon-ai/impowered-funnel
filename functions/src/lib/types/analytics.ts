export interface Daily {
    total_orders: number,
    total_aov: number,
    total_revenue: number,
    top_sellers: TopSellers[],
    total_sessions: number,
    total_carts: number,
    total_checkouts: number,
}

export type FunnelAnalytics = {
    id: string;
    title: string;
    steps: {
        painted: boolean,
        order: number,
        name: "OPT_IN" | "UPSELL" | "DOWNSELL" | "VIDEO" | "CONFIRMED" | "",
        page_views: number,
        unique_page_views: number,
        opt_ins: number,
        opt_in_rate: number,
        sales_count: number,
        sales_rate: number,
        sales_value: number,
        recurring_count: number,
        recurring_value: number,
        earnings: number,
        earnings_unique: number,
    }[],
    total_sales: number,
    status: boolean,
    total_aov: number, 
    total_orders: number, 
    total_earnings: number, 
    tags: string[],
    updated_at: FirebaseFirestore.Timestamp,
    created_at: FirebaseFirestore.Timestamp,
}

export interface DailyFunnel {
    total_funnel_orders: number,
    total_funnel_sales: number,
    total_funnel_aov: number,
    total_opt_ins: number,
    total_upsell: number,
    total_downsell: number,
    order_page_views: number,
    order_unique_page_views: number,
    order_opt_ins: number,
    order_opt_in_rate: number,
    order_sales_count: number,
    order_sales_rate: number,
    order_sales_value: number,
    order_recurring_count: number,
    order_recurring_value: number,
    order_earnings: number,
    order_earnings_unique: number,
    upsell_page_views: number,
    upsell_unique_page_views: number,
    upsell_opt_ins: number,
    upsell_opt_in_rate: number,
    upsell_sales_count: number,
    upsell_sales_rate: number,
    upsell_sales_value: number,
    upsell_recurring_count: number,
    upsell_recurring_value: number,
    upsell_earnings: number,
    upsell_earnings_unique: number,
    confirm_page_view: number,
    confirm_unique_page_view: number,
    updated_at: any,
    created_at: any,
}

export interface TopSellers {
    title: string,
    total_orders: number,
    id?: number
}


export interface Analytics {
    prev_daily_sessions: number,
    total_daily_sessions: number,
    daily_sessions_rate: number,
    prev_daily_new_sessions: number,
    total_daily_new_sessions: number,
    daily_new_sessions_rate: number,
    prev_daily_sales: number,
    total_daily_sales: number,
    daily_sales_rate: number,
    prev_daily_carts: number,
    total_daily_carts: number,
    daily_carts_rate: number,
    prev_daily_checkouts: number,
    prev_daily_aov: number,
    total_daily_checkouts: number,
    total_daily_orders: number,
    total_funnel_sales: number,
    total_funnel_orders: number,
    total_online_sales: number,
    total_online_orders: number,
    daily_aov: number,
    daily_order_rate: number,
    daily_cart_rate: number,
    daily_checkout_rate: number,
    top_sellers: {
        title: string,
        view_count: number,
        total_orders: number,
        id: string
    }[]
    id?: string,
    updated_at: FirebaseFirestore.Timestamp,
    created_at: FirebaseFirestore.Timestamp,
    orders: {
        date: string,
        value: number
    }[]
}
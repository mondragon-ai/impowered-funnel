import * as functions from "firebase-functions";
import { getFunnelDocument, updateFunnelsDocument } from "../lib/helpers/firestore";
import { DailyFunnel } from "../lib/types/analytics";
import { Customer } from "../lib/types/customers";
import * as admin from "firebase-admin";
import { getToday } from "../lib/helpers/date";

export const customersCreated = functions.firestore
.document("/merchants/{merchantID}/customers/{customerID}")
.onCreate(async (snap) => {

    let customer: Customer | null = snap.exists ? snap.data() as Customer : {} as Customer

    if (customer !== null) {
            
        let TODAY = await getToday();

        const result = await getFunnelDocument(customer?.merchant_uuid, "analytics", String(TODAY))

        const analytics: DailyFunnel | null= result.data ? result.data as DailyFunnel : null;

        if (analytics !== null) {
            const opv = analytics.order_page_views > 0 ? analytics.order_page_views : 1;
            const uopv = analytics.order_unique_page_views > 0 ? analytics.order_unique_page_views : 1;
    
            const update = {
                ...result.data,
                order_opt_in_rate: ((analytics.order_opt_ins) / (uopv)),
                order_sales_rate: ((analytics.order_sales_count) / (uopv)),
                order_earnings: (analytics.order_sales_value) / (opv),
                order_earnings_unique: (analytics.order_sales_value) / (uopv),
                upsell_earnings: (analytics.upsell_sales_value) / (opv),
                upsell_earnings_unique: (analytics.upsell_sales_value) / (uopv),
                updated_at: admin.firestore.Timestamp.now()
            }
            await updateFunnelsDocument(customer?.merchant_uuid, "analytics", String(TODAY), update);
    
        } else {
            throw new Error("[ERROR]: Couldn't fetch funnel analytics");
        }

    } else {
        throw new Error("[ERROR]: Internal error - customer doesn't exist");
        
    }
})
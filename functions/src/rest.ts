import * as express from "express";
import * as cors from "cors";

// import Routes 
import { customerRoute } from "./routes/customers";
import { checkoutRoutes } from "./routes/checkout";
import { paymentsRoutes } from "./routes/payments";
import { analyticRoutes } from "./routes/analytics";
import { productRoutes } from "./routes/products";
import { authRoutes } from "./routes/auth";
import { dbManagerRoutes } from "./routes/db";
import { orderRoutes } from "./routes/orders";
import { funnelRoutes } from "./routes/funnels";
import { collectionRoutes } from "./routes/colletions";
import { bundleRoutes } from "./routes/bundles";
import { giftCardRoutes } from "./routes/gift_cards";
import { subscriptionRoutes } from "./routes/subscriptions";
import { fulfillmentRoutes } from "./routes/fulfillments";
import { openAPIRoutes } from "./routes/openAPI";
import { twitterRoutes } from "./apis/twitter";
import { podRoutes } from "./routes/pod";
import { blogRoutes } from "./routes/blogs";
import { marketingRoutes } from "./routes/marketing";
import { botRoutes } from "./routes/bot";
import { shopifyOrderCreatedWebHook } from "./webhooks/shopifyOrders";
import { merchantRoutes } from "./routes/merchants";
import { usersRoutes } from "./routes/users";


export const rest = (db: FirebaseFirestore.Firestore) => {
    const bearer = require("express-bearer-token");
    const bodyParser = require("body-parser");
    const app = express();

    app.use( bearer());
    app.use( bodyParser.urlencoded({ extended: false}));
    app.use( express.json());
    app.use(cors({ origin: true}));

    // Customer Routes 
    customerRoute(app, db);

    // Payment Routes 
    checkoutRoutes(app);
    paymentsRoutes(app);

    // analytic Routes
    analyticRoutes(app);

    // Order Routes 
    orderRoutes(app);

    // Product Routes 
    productRoutes(app);

    // Auth Routes for session
    authRoutes(app);

    // DB Management Routes
    dbManagerRoutes(app)

    // Colleciton Routes 
    collectionRoutes(app)

    // Bundle Routes 
    bundleRoutes(app)

    // Gift Card Routes 
    giftCardRoutes(app)

    // openAPI Routes
    openAPIRoutes(app)

    // Gift Card Routes 
    fulfillmentRoutes(app)

    // subsc Routes 
    subscriptionRoutes(app)

    //Funnel Routes
    funnelRoutes(app)

    // Twitter ROutes 
    twitterRoutes(app)

    // POD Routes
    podRoutes(app)

    // Blog Routes
    blogRoutes(app)

    // Marketing Routes
    marketingRoutes(app)

    // Bot Routes
    botRoutes(app)
    
    shopifyOrderCreatedWebHook(app)

    merchantRoutes(app);

    
    usersRoutes(app);

    return app
}
import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { createDocument, getCollections, getDocument, simlpeSearch } from "../lib/helpers/firestore";
import { validateKey } from "./auth";
import { fetchOrders } from "../lib/helpers/shopify";

type Design = {
    merchant_uuid: string,
    url: string,
    sku: string,
    title: string,
    meta: {}[]
}

type ShopifyOrder = {	
    "orders": {
        "id": number,
        "name": string,
        "total_price": string,
        "line_items": [
        {
            "id": number,
            "admin_graphql_api_id": string,
            "fulfillable_quantity": number,
            "fulfillment_service": string,
            "fulfillment_status": null,
            "gift_card": boolean,
            "grams": number,
            "name": string,
            "price": string,
            "price_set": {
            "shop_money": {
                "amount": number,
                "currency_code": "USD"
            },
            "presentment_money": {
                "amount": number,
                "currency_code": "USD"
            }
            },
            "product_exists": true,
            "product_id": number,
            "properties": [
            {
                "name": string,
                "value": string
            },
            {
                "name": string,
                "value": string
            }
            ],
            "quantity": number,
            "requires_shipping": boolean,
            "sku": string,
            "taxable": boolean,
            "title": string,
            "total_discount": number,
            "total_discount_set": {
            "shop_money": {
                "amount": number,
                "currency_code": "USD"
            },
            "presentment_money": {
                "amount": number,
                "currency_code": "USD"
            }
            },
            "variant_id": number,
        },]
    }[]
}
export const podRoutes = (app: express.Router) => {
    app.post("/pod/designs/upload", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> [POD ROUTE] - Started Design Upload ✅");
        let status = 200,
            text = "[SUCCESS]: Design successfully uploaded 👽",
            ok = true;

        let {
            sku,
            merchant_uuid,
            url,
            title,
            meta
        } = req.body as Design; 

        // create paload
        const design_data = {
            sku,
            url,
            title,
            meta: meta ? meta : [],
            updated_at: admin.firestore.Timestamp.now(),
            created_at: admin.firestore.Timestamp.now(),
        }

        try {
            // create document
            await createDocument(merchant_uuid, "designs", "des_", design_data);

        } catch (e) {
            functions.logger.error(text)
            status = 200;
            text = " 🚨 [ERROR]: Design could not be uploaded";
            ok = true;
        }
        
        res.status(status).json({
            ok: ok,
            text: text,
            result: null
        })
    });

    app.post("/pod/designs", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> [POD ROUTE] - Started Design fetched ✅");
        let status = 200,
            text = "[SUCCESS]: Design successfully fetched 👽",
            size = 0,
            ok = true;

        let {
            des_uuid,
            merchant_uuid,
        } = req.body as {
            merchant_uuid: string,
            des_uuid: string,
            meta: {}[]
        }; 

        let designs: Design[] = [] as Design[];

        try {

            if (des_uuid && des_uuid !== "") {
                // fetch design document
                const design_res = await getDocument(merchant_uuid, "designs", des_uuid);
                if (design_res.status < 300 && design_res.data) {
                    size = 1;
                    designs = [design_res.data as Design]
                }
            }

            if (des_uuid === "") {
                // fetch design document
                const design_res = await getCollections(merchant_uuid, "designs");
                if (design_res.status < 300 && design_res.data) {
                    size = design_res.data.size;

                    design_res.data.collection?.forEach(d => {
                        designs = [
                            ...designs,
                            d
                        ]
                    })
                }
            }

        } catch (e) {
            functions.logger.error(text)
            status = 200;
            text = " 🚨 [ERROR]: Design could not be fetched";
            ok = true;
        }
        
        res.status(status).json({
            ok: ok,
            text: text,
            result: {
                size: size,
                list: designs
            }
        })
    });

    app.post("/pod/designs/search", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> [POD ROUTE] - Started Design fetched ✅");
        let status = 200,
            text = "[SUCCESS]: Design successfully fetched 👽",
            size = 0,
            ok = true;

        let {
            sku,
            order_number,
            merchant_uuid,
        } = req.body as {
            merchant_uuid: string,
            sku: string,
            order_number: string
        }; 

        let designs: Design[] = [] as Design[];

        let order = {} as ShopifyOrder

        try {

            if (sku && sku !== "") {
                functions.logger.debug(" ====> [SKU] - Searching by SKU");
                // Search & fetch design document by sku
                const design_res = await simlpeSearch(merchant_uuid, "designs", "sku", sku);
                if (design_res.status < 300 && !design_res.data.list?.empty) {
                    design_res.data.list?.forEach(d => {
                        designs = [
                            ...designs,
                            d.data() as Design
                        ]
                    })
                }
            }

        } catch (e) {
            functions.logger.error(text)
            status = 400;
            ok = false;
            text = " 🚨 [ERROR]: Design could not be fetched";
        }

        try {

            if (order_number && order_number !== "") {
                functions.logger.debug(" ====> [SHOPIFY] - Fetching Order by order number");
                const order_res = await fetchOrders(order_number);

                if (order_res && order_res !== undefined) {
                    order = order_res as ShopifyOrder;
                }
            }
            
        } catch (e) {
            status = 400;
            ok = false;
            text = " 🚨 [ERROR]: Valid order number required if SKU not presented";
            functions.logger.error(text)
        }

        let sku_list: string[] = []

        if (order_number && order_number !== "" && order) {
            functions.logger.debug(" ====> [SHOPIFY] - Fetched Order");

            order.orders[0].line_items.forEach(li => {
                sku_list = [
                    ...sku_list,
                    li.sku
                ]
            })
        }
        functions.logger.debug(" ====> [SKUS] - Extracted");
        designs = [];


        const designs_new = await searchArray(sku_list, merchant_uuid) as Design[];

        functions.logger.debug(" - [DESIGN NEW]");
        functions.logger.debug(designs_new);

        res.status(status).json({
            ok: ok,
            text: text,
            result: {
                size: size,
                list: designs_new ? designs_new : designs ? designs : []
            }
        })
    });
}


const searchArray = async (
    sku_list: string[],
    merchant_uuid: string
) => {
    let colleciton: any[] = [];

    return new Promise((resolve) => {
        let designs: any[] = [];
        sku_list.forEach(async (s, i) => {
            const design_res = await simlpeSearch(merchant_uuid, "designs", "sku", s);
                                
            if (design_res.status < 300 && design_res.data.list) {
                functions.logger.debug(" [DESIGN] - Found 🔎");
                functions.logger.debug(" [DESIGN] - " + i + " " + (sku_list.length - 1));
                design_res.data.list?.forEach((d) => {
                    const data = d.data() as Design;
                    colleciton = [
                        ...colleciton,
                        data
                    ]
                });
                designs = [
                    colleciton[0]
                ];
            } else if (i == (sku_list.length - 1)) {
                functions.logger.debug(" [DESIGN] - " + i + " " + (sku_list.length - 1));
            }
        });
        resolve(designs);
    });
};


export const getDesignsFromOrder = async (
    sku_list: string[],
    merchant_uuid: string,
) => {
    let colleciton: any[] = [];
    let designs: any[] = [];



    if (sku_list.length > 0) {
        functions.logger.debug(" [SKU] - Exist - " + sku_list.length);
        functions.logger.debug(sku_list);

        sku_list.forEach(async (s, i) => {
            // Search & fetch design document by sku
            const delay = (ms: number) => {
                return new Promise((resolve) => setTimeout(async () => {

                    const design_res = await simlpeSearch(merchant_uuid, "designs", "sku", s);
                            
                    if (design_res.status < 300 && design_res.data.list) {
                        functions.logger.debug(" [DESIGN] - Found 🔎");
                        functions.logger.debug(" [DESIGN] - " + i + " " + (sku_list.length - 1));
                        design_res.data.list?.forEach((d) => {
                            const data = d.data() as Design;
                            colleciton = [
                                ...colleciton,
                                data
                            ]
                        });
                        designs = [
                            colleciton[0]
                        ];
                    } else if (i == (sku_list.length - 1)) {
                        functions.logger.debug(" [DESIGN] - " + i + " " + (sku_list.length - 1));
                        return resolve
                    }
                    return
                }, ms));
            };
            await delay(500).then(() => console.log("TEST"))
        })
    }
    functions.logger.debug("-");
    functions.logger.debug(designs);
    functions.logger.debug(colleciton);
    return designs

}
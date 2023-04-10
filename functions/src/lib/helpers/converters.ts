import * as csv from 'csvtojson';
import * as crypto from 'crypto';
import fetch from "node-fetch";
import { Address } from '../types/addresses';
import { LineItem, Order } from '../types/draft_rders';


export const convertCsvToJson = async (csvUrl: string, funnel_uuid: string, merchant_uuid: string, ip_address: string): Promise<any[]> => {
  const response = await fetch(csvUrl, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        }
   })

  const csvData = await response.text();

  const orders: Order[] = [];

  const jsonArray = await csv().fromString(csvData);

  jsonArray.forEach((row: Order) => {

    const addresses = [
      {
        type: "BOTH",
        line1: row['Shipping Address 1'],
        line2: row['Shipping Address 2'],
        city: row['Shipping City'],
        state: row['Shipping State'],
        zip:  row['Shipping Zip'],
        country: row['Shipping Country'],
        name: row['First Name'] as string + " " + row['Last Name'] as string,
        title: "home",
      }
    ];

    let line_items = [{
      variant_id: "",
      product_id: "",
      high_risk: false,
      title: (row['Product Names'] as string).split(",")[0].trim(),
      sku: "",
      price: Number(row['Original Amount Cents']),
      compare_at_price: 0,
      handle: (row['Product Names'] as string).split(",")[0].trim().toLocaleLowerCase(),
      options1: "",
      options2: "",
      options3: "",
      weight: 0,
      quantity: 1,
      is_recurring: false,
      url: ""
    } as LineItem];

    const upsell = row['Subscription'] as string;

    if (upsell !== "") {
      line_items = [
        {
          variant_id: 42514002641068,
          product_id: "",
          high_risk: false,
          title: "Patriot Pack Decals (Free)",
          sku: "",
          price: 900,
          compare_at_price: 0,
          handle: "patriot-pack-decals-free",
          options1: "",
          options2: "",
          options3: "",
          weight: 0,
          quantity: 1,
          is_recurring: false,
          url: ""
        }
      ]
    };
    
    const order = {
      funnel_uuid: funnel_uuid,
      merchant_uuid: merchant_uuid,
      high_risk: false,
      line_items: line_items,
      id: "",
      phone: "",
      checkout_url: "",
      type: "FUNNEL",
      isActive: false,
      gateway: "STRIPE",
      used_gift_card: false,
      has_discount: false,
      gift_card: "",
      browser_ip: ip_address,
      current_subtotal_price: upsell !== "" ? 399 + Number(row['Original Amount Cents']) : Number(row['Original Amount Cents']),
      current_discount_value: 0,
      current_gift_card_value: 0,
      current_total_price: upsell !== "" ? 399 + Number(row['Original Amount Cents']) : Number(row['Original Amount Cents']),
      tags: ['impowered'],
      note: "CVS to JSON via imPowered.",
      fullfillment_status: "HOLD",
      payment_status: "PAID",
      transaction_id: row['Charge'],
      store_type: "SHOPIFY",
      order_number: "SH-" + crypto.randomBytes(10).toString('hex'),
      email: row.Email,
      first_name: row['First Name'] as string,
      last_name: row['Last Name'] as string,
      addresses: addresses as Address[]
    } as Order;

    orders.push(order);
  });

  return orders;
}
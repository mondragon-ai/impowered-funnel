import * as crypto from "crypto";
import * as admin from "firebase-admin";
import { Product, Variant } from "../../types/products";
/**
 * Create a list of variants from the options || single variant in instance of no options. 
 * @param product: Product
 * @param options1: string[]
 * @param options2: string[]
 * @param options3: string[]
 * @returns Variant[]
 */
 export const createVariantsFromOptions = (
    product: Product,
    options1?: string[],
    options2?: string[],
    options3?: string[],
  ): Variant[] => {

    const SKU =  product.sku &&  product.sku !== "" ?  product.sku : product.title.toLocaleLowerCase().replace(" ", "-")
  
    // Variant var instance returned
    let variants: Variant[] = [];
  
    // if only ONE option list exists, loop & create variants (ONE)
    if (options1?.length != 0 && options2?.length == 0 && options3?.length == 0) {
      options1?.forEach((v,i) => {
        variants.push({
            variant_id: "var_" + crypto.randomBytes(10).toString('hex'),
            product_id: product.id,
            sku: "" + SKU + "--" + v.charAt(0).toLocaleUpperCase(),
            price: product.price,
            options1: v,
            options2: "",
            options3: "",
            quantity: product.quantity,
            high_risk: false,
            title: "",
            compare_at_price: 0,
            weight: 0,
            external_id: "",
            external_type: "",
            updated_at: admin.firestore.Timestamp.now(),
            created_at: admin.firestore.Timestamp.now()
        });
      })
    }
  
    // if TWO option lists exists, loop & create variants (ONE * TWO)
    if (options1?.length != 0  && options2?.length != 0 &&  options3?.length == 0) {
      options1?.forEach((one,i) => {
        options2?.forEach((two,i) => {
          variants.push({
              variant_id: "var_" + crypto.randomBytes(10).toString('hex'),
              product_id: product.id,
              sku: "" + SKU + "--" + one.charAt(0).toLocaleUpperCase() + "/" + two.charAt(0).toLocaleUpperCase(),
              price: product.price,
              options1: one,
              options2: two,
              options3: "",
              quantity: product.quantity,
              high_risk: false,
              title: "",
              compare_at_price: 0,
              weight: 0,
              external_id: "",
              external_type: "",
              updated_at: admin.firestore.Timestamp.now(),
              created_at: admin.firestore.Timestamp.now()
          });
        });
      })
    }
  
    // if TWO option lists exists, loop & create variants (ONE * TWO * THREE)
    if (options1?.length != 0  && options2?.length != 0 && options3?.length != 0) {
      options1?.forEach((one,i) => {
        options2?.forEach((two,i) => {
          options3?.forEach((three,i) => {
            variants.push({
                variant_id: "var_" + crypto.randomBytes(10).toString('hex'),
                product_id: product.id,
                sku: "" + SKU + "--" + one.charAt(0).toLocaleUpperCase() + "/" + two.charAt(0).toLocaleUpperCase() + "/" + three.charAt(0).toLocaleUpperCase(),
                price: product.price,
                options1: one,
                options2: two,
                options3: three,
                quantity: product.quantity,
                high_risk: false,
                title: "",
                compare_at_price: 0,
                weight: 0,
                external_id: "",
                external_type: "",
                updated_at: admin.firestore.Timestamp.now(),
                created_at: admin.firestore.Timestamp.now()
            });
          });
        });
      })
    }
    return variants;
  }
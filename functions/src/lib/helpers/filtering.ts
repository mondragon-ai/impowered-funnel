import { Address } from "../types/addresses";

export function compareAddresses(arr1: Address[], shipping: Address) {
    const uniqueAddresses: Address[] = [];

    let isUnique = true;
    arr1.forEach(address1 => {
        if (address1.line1 === shipping.line1
            && address1.city === shipping.city
            && address1.state === shipping.state
            && address1.zip === shipping.zip
        ) {
            isUnique = false;
        }
    });

    if (isUnique) {
        uniqueAddresses.push(shipping);
    }

    return uniqueAddresses;
}

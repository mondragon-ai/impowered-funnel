import { Address } from "../types/addresses";

export function compareAddresses(arr1: Address[], arr2: Address[]) {
    const uniqueAddresses: Address[] = [];

    arr1.forEach(address1 => {
        let isUnique = true;
        arr2.forEach(address2 => {
            if (address1.line1 === address2.line1
                && address1.city === address2.city
                && address1.state === address2.state
                && address1.zip === address2.zip
            ) {
                isUnique = false;
            }
        });

        if (isUnique) {
            uniqueAddresses.push(address1);
        }
    });

    return uniqueAddresses;
}

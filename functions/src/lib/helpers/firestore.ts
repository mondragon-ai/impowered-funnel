import {db} from "../../firebase";
import * as crypto from "crypto";
// import { Product } from "../types/products";
// import { AppSession } from "../types/Sessions";
import * as functions from "firebase-functions";

export const updateSessions = async (
    api_key: string,
    data: any,
) => {
    // Data for validation in parent
    let text = "SUCCESS: Document Created 👍🏻", status = 200, updated = true;

    try {
        await db
        .collection("sessions")
        .doc(api_key)
        .set(data, { merge: true });
    } catch {
        text = " - Could not update document.";
        status = 400;
        updated = false;
    }

    // return either result 
    return {
        text: text,
        status: status,
        data: updated
    }
}

/**
 * Create app sesion in primary DB 
 * TODO: create layer db with C/C++ 
 * @param API_KEY: string
 * @param data 
 * @returns 
 */
export const createAppSessions = async (
    api_key: string,
    data: any,
) => {
    // Data for validation in parent
    let text = "SUCCESS: Document Created 👍🏻", status = 200;

    //  generate doc uuid w/ prefix
    const doc_uuid = api_key;

    let response; 

    try {
        response = await db
        .collection("sessions")
        .doc(doc_uuid)
        .set({
            ...data,
            id: doc_uuid
        });
    } catch {
        text = " - Could not create document.";
        status = 400;
    }

    // return either result 
    return {
        text: text,
        status: status,
        data: {
            id: doc_uuid,
            customer: response ? response : null
        }
    }
}

export const getSessionAccount = async (
    api_key: string,
) => {
    // Data for validation in parent
    let text = " - account resource fetched 👍🏻", status = 200, result: any = null;


    let response: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>  = await db
    .collection("sessions")
    .doc(api_key)
    .get();

    if (response.exists) {
        functions.logger.debug(" ===> Get Session Document");
        functions.logger.debug(response);
        result = response.data();
    } else {
        text = " - getting session document.";
        status = 400;
    }

    // return either result 
    return {
        text: text,
        status: status,
        data: result
    }
}

/**
 * Create docuemtn in primary DB 
 * @param merchant_uuid: string
 * @param prefix 
 * @param data 
 * @returns 
 */
export const createDocument = async (
    merchant_uuid: string,
    collection: string,
    prefix: string,
    data: any
) => {
    // Data for validation in parent
    let text = "SUCCESS: Document Created 👍🏻", status = 200;

    //  generate doc uuid w/ prefix
    const doc_uuid = "" + prefix + crypto.randomBytes(10).toString('hex').substring(0,10);

    let response; 

    try {
        response = await db
        .collection("merchants")
        .doc(merchant_uuid)
        .collection(collection)
        .doc(doc_uuid)
        .set({
            ...data,
            id: doc_uuid
        });
    } catch {
        text = " - Could not create document.";
        status = 400;
    }

    // return either result 
    return {
        text: text,
        status: status,
        data: {
            id: doc_uuid,
            customer: response ? response : null
        }
    }
}

export const getCollections = async (
    merchant_uuid: string,
    collection: string,
) => {

    // Data for validation in parent
    let text = "SUCCESS: Document Created 👍🏻", status = 200;


    let response = {} as FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData> ; 
    let colleciton: {}[] = []; 
    let size = 0; 
    

    try {
        response = await db
        .collection("merchants")
        .doc(merchant_uuid)
        .collection(collection)
        .limit(25)
        .get()

    } catch {
        text = " - Could not fetch collection. check collection | uuid.";
        status = 400;
    }

    if (response.size > 0) {
        size = response.size;
        response.forEach(item => {
            colleciton = [
                ...colleciton,
                item.data()
            ]
        })
    }

    // return either result 
    return {
        text: text,
        status: status,
        data: {
            size: size,
            collection: colleciton ? colleciton : null
        }
    }
}

export const updateDocument = async (
    merchant_uuid: string,
    collection: string,
    uuid: string,
    data: any
) => {
    // Data for validation in parent
    let text = " - Document updated 👍🏻", status = 200;

    // Update the document document
    await db
    .collection("merchants")
    .doc(merchant_uuid)
    .collection(collection)
    .doc(uuid)
    .set(data, { merge: true });

    return {
        text: text,
        status: status,
        data: null
    }

}

export const updateFunnelsDocument = async (
    merchant_uuid: string,
    collection: string,
    uuid: string,
    data: any
) => {
    // Data for validation in parent
    let text = " - Document updated 👍🏻", status = 200;

    // Update the document document
    await db
    .collection("funnels")
    .doc(merchant_uuid)
    .collection(collection)
    .doc(uuid)
    .set(data, { merge: true });

    return {
        text: text,
        status: status,
        data: null
    }

}

export const simlpeSearch = async (
    merchant_uuid: string,
    collection: string,
    key: string,
    data: any
) => {
    // Data for validation in parent
    console.log("93: Simple Search");
    let text = " - Document found 👍🏻", status = 200;

    let result: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData> | null = await db
    .collection("merchants")
    .doc(merchant_uuid)
    .collection(collection)
    .where(key, "==", data)
    .get()

    console.log(" ==> 103 -");
    console.log(result);
    if (result.empty) {
        text = " - Document NOT updated 👎🏻";
        status = 400;
        result = null;
    }

    return {
        text: text,
        status: status,
        data: {
            list: result 
        }
    }
}
export const getFunnelDocument = async (
    funnnel_uuid: string,
    collection: string,
    uuid: string,
) => {
    // Data for validation in parent
    console.log("140: Get Document --------------------- ");
    let text = " - Document found 👍🏻", status = 200;

    let result: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>  = await db
    .collection("funnels")
    .doc(funnnel_uuid)
    .collection(collection)
    .doc(uuid)
    .get();

    return {
        text: result.exists ? text : " - Document NOT found 👎🏻 ",
        status: result.exists ? status : 400,
        data: result.exists ? result.data() : undefined
    }
}

export const getDocument = async (
    merchant_uuid: string,
    collection: string,
    uuid: string,
) => {
    // Data for validation in parent
    console.log("118: Get Document --------------------- ");
    let text = " - Document found 👍🏻", status = 200;

    let result: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>  = await db
    .collection("merchants")
    .doc(merchant_uuid)
    .collection(collection)
    .doc(uuid)
    .get();

    return {
        text: result.exists ? text : " - Document NOT found 👎🏻 ",
        status: result.exists ? status : 400,
        data: result.exists ? result.data() : undefined
    }
}


export const deleteDocument = async (
    merchant_uuid: string,
    collection: string,
    uuid: string
) => {

    await db
    .collection("merchants")
    .doc(merchant_uuid)
    .collection(collection)
    .doc(uuid)
    .delete();

}


/**
 * Create docuemtn in primary DB 
 * @param merchant_uuid: string
 * @param prefix 
 * @param data 
 * @returns 
 */
 export const createDocumentWthId = async (
    merchant_uuid: string,
    collection: string,
    id: string,
    data: any
) => {
    // Data for validation in parent
    let text = "SUCCESS: Document Created 👍🏻", status = 200;

    //  generate doc uuid w/ prefix
    const doc_uuid = id;

    let response; 

    try {
        response = await db
        .collection("merchants")
        .doc(merchant_uuid)
        .collection(collection)
        .doc(doc_uuid)
        .set({
            ...data,
            id: doc_uuid
        });
    } catch {
        text = " - Could not create document.";
        status = 400;
    }

    // return either result 
    return {
        text: text,
        status: status,
        data: {
            id: doc_uuid,
            customer: response ? response : null
        }
    }
}

// export const getCollection = (
//     merchant_uuid: string,
//     collection: string,
// ) => {
//     // Data for validation in parent
//     let text = "SUCCESS: Document Created 👍🏻", status = 200;
    
//     // return either result 
//     return {
//         text: text,
//         status: status,
//         data: {
//             id: doc_uuid,
//             customer: response ? response : null
//         }
//     }
// }
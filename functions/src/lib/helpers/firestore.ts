import {db} from "../../firebase";
import * as crypto from "crypto";
import * as admin from "firebase-admin";
// import { Product } from "../types/products";
// import { AppSession } from "../types/Sessions";
import * as functions from "firebase-functions";



export const fetchFunnelAnalytics = async (
    merchant_uuid: string,
    doc_uuid: string,
    today: string,
) => {
    // Data for validation in parent
    let text = "SUCCESS: Document fetched 👍🏻", status = 200;

    let result = null; 

    try {
        const response = await db
        .collection("merchants")
        .doc(merchant_uuid)
        .collection("funnels")
        .doc(doc_uuid)
        .collection("analytics")
        .doc(today)
        .get()

        if (response.exists) {
            result = response.data();
        } else {
            text = " - getting session document.";
            status = 400;
        }
        
    } catch {
        text = " - Could not fetch document.";
        status = 400;
    }

    // return either result 
    return {
        text: text,
        status: status,
        data: result ? result : null
    }
}


export const createFunnelAnalytics = async (
    merchant_uuid: string,
    doc_uuid: string,
    today: string,
    data: any,
) => {
    // Data for validation in parent
    let text = "[SUCCESS]: Document Created 👍🏻", status = 200;

    let response; 

    try {
        response = await db
        .collection("merchants")
        .doc(merchant_uuid)
        .collection("funnels")
        .doc(doc_uuid)
        .collection("analytics")
        .doc(today)
        .set({
            ...data,
            id: doc_uuid,
            state: Number(today)
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
            id: Number(today),
            funnel: response ? response : null
        }
    }
}


export const updateFunnelAnalytics = async (
    merchant_uuid: string,
    doc_uuid: string,
    today: string,
    data: any,
) => {
    // Data for validation in parent
    let text = "[SUCCESS]: Document Created 👍🏻", status = 200, updated = true

    try {
        await db
        .collection("merchants")
        .doc(merchant_uuid)
        .collection("funnels")
        .doc(doc_uuid)
        .collection("analytics")
        .doc(today)
        .set({
            ...data,
        });
    } catch {
        text = " - Could not create document.";
        status = 400;
    }

    // return either result 
    return {
        text: text,
        status: status,
        data: updated
    }
}


export const updateSessions = async (
    api_key: string,
    data: any,
) => {
    // Data for validation in parent
    let text = "[SUCCESS]: Document Created 👍🏻", status = 200, updated = true;

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
export const updateMerchant = async (
    api_key: string,
    data: any,
) => {
    // Data for validation in parent
    let text = "[SUCCESS]: Document Created 👍🏻", status = 200, updated = true;

    try {
        await db
        .collection("merchants")
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
    let text = "[SUCCESS]: Document Created 👍🏻", status = 200;

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

export const getPaginatedCollections = async (
    merchant_uuid: string,
    collection: string,
    start?: any,
) => {

    // Data for validation in parent
    let text = "SUCCESS: Document fetched 👍🏻", status = 200;

    let response = {} as FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData> ; 
    let colleciton: any[] = []; 
    let size = 0; 

    try {
        console.log(" ====> [STATE && OPERATOR]")
        response = await db
        .collection("merchants")
        .doc(merchant_uuid)
        .collection(collection)
        .orderBy('updated_at', "desc")
        .startAfter(start)
        .limit(25)
        .get()

    } catch {
        text = " - Could not fetch collection. check collection";
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
    } else {
        text = " - Nothing wrong, just not found";
        status = 420;
        size = 0;
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

export const getCollections = async (
    merchant_uuid: string,
    collection: string,
    state?: number,
    operator?:  '<'
    | '<='
    | '=='
    | '!='
    | '>='
    | '>'
    | 'array-contains'
    | 'in'
    | 'not-in'
    | 'array-contains-any',
) => {

    // Data for validation in parent
    let text = "SUCCESS: Document Created 👍🏻", status = 200;

    let response = {} as FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData> ; 
    let colleciton: any[] = []; 
    let size = 0; 

    const advanced_text = state || operator ? " - state or operator 🥲" : " - Doc UUID 🥲"

    if (state && operator) {

        try {
            console.log(" ====> [STATE && OPERATOR]")
            response = await db
            .collection("merchants")
            .doc(merchant_uuid)
            .collection(collection)
            .where('state', operator as  '<'
                  | '<='
                  | '=='
                  | '!='
                  | '>='
                  | '>'
                  | 'array-contains'
                  | 'in'
                  | 'not-in'
                  | 'array-contains-any', state)
            .limit(25)
            .get()
    
        } catch {
            text = " - Could not fetch collection. check collection" + advanced_text;
            status = 400;
        }
    
    } else {

        try {
            console.log(" ====> [ORDERED]")
            response = await db
            .collection("merchants")
            .doc(merchant_uuid)
            .collection(collection)
            .orderBy('updated_at', "desc")
            .limit(25)
            .get()
    
        } catch {
            text = " - Could not fetch collection. check collection" + advanced_text;
            status = 400;
        }
    }
    
    if (response.size > 0) {
        size = response.size;
        response.forEach(item => {
            colleciton = [
                ...colleciton,
                item.data()
            ]
        })
    } else {
        text = " - Nothing wrong, just not found";
        status = 420;
        size = 0;
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
    let text = " - Document found 👍🏻", status = 200;

    let result: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData> | null = await db
    .collection("merchants")
    .doc(merchant_uuid)
    .collection(collection)
    .where(key, "==", data)
    .get()

    if (result.empty) {
        functions.logger.error(" 🚨 [SEARCHING] -  ❸ Document NOT found");
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


export const findMerchant = async (
    key: string,
    data: any
) => {
    // Data for validation in parent
    let text = " - Document found 👍🏻", status = 200;

    let result: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData> | null = await db
    .collection("merchants")
    .where(key, "==", data)
    .get()

    if (result.empty) {
        functions.logger.error(" 🚨 [SEARCHING] -  ❸ Document NOT found");
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



export const complexSearch = async (
    merchant_uuid: string,
    collection: string,
    key: string,
    data: any,
    start?: any,
) => {
    // Data for validation in parent
    let text = " - Document found 👍🏻", status = 200;
    // let size = 0; 

    let result: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData> | null = await db
    .collection("merchants")
    .doc(merchant_uuid)
    .collection(collection)
    .orderBy('updated_at', "desc")
    .startAfter(start)
    .limit(25)
    .get()

    if (result.empty) {
        functions.logger.error(" 🚨 [SEARCHING] -  ❸ Document NOT found");
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



export const searchFunnelAnalytics = async (
    merchant_uuid: string,
    fun_uuid: string,
    search_data: {start: number, end: number}
) => {

    // Data for validation in parent
    console.log("456: Date Range Search");
    functions.logger.info(merchant_uuid);
    functions.logger.info(fun_uuid);
    console.log(search_data.start);
    console.log(search_data.end);
    let text = " - Document found 👍🏻", status = 200;

    let result: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData> | null = await db
        .collection("merchants")
        .doc(merchant_uuid)
        .collection("funnels")
        .doc(fun_uuid)
        .collection("analytics")
        .orderBy("state")
        .where("state", ">=", Number(search_data.start))
        .where("state", "<=", Number(search_data.end))
        .get()

    // if (result) {
    //     result = await db
    //     .collection("merchants")
    //     .doc(merchant_uuid)
    //     .collection("funnels")
    //     .doc(fun_uuid)
    //     .collection("analytics")
    //     .get()
    // }

    if (result.empty) {
        text = " - Document NOT fetched 👎🏻";
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

export const searchAnalytics = async (
    merchant_uuid: string,
    search_data: {start: number, end: number}
) => {

    const FS_START =  admin.firestore.Timestamp.fromDate(new Date(search_data.start));
    const FS_END =  admin.firestore.Timestamp.fromDate(new Date(search_data.end));
    // Data for validation in parent
    console.log("456: Date Range Search");
    functions.logger.info(merchant_uuid);
    console.log(FS_START);
    console.log(FS_END);
    let text = " - Document found 👍🏻", status = 200;

    let result: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData> | null = await db
        .collection("merchants")
        .doc(merchant_uuid)
        .collection("analytics")
        .orderBy("id")
        .where("id", ">=", String(search_data.start))
        .where("id", "<=", String(search_data.end))
        .get()

    // if (result) {
    //     result = await db
    //     .collection("merchants")
    //     .doc(merchant_uuid)
    //     .collection("funnels")
    //     .doc(fun_uuid)
    //     .collection("analytics")
    //     .get()
    // }

    if (result.empty) {
        text = " - Document NOT fetched 👎🏻";
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


export const getFunnelAnalytics= async (
    merchant_uuid: string,
    funnel_uuid: string,
    date: string,
) => {
    // Data for validation in parent
    console.log("140: Get Document --------------------- ");
    let text = " - Document found 👍🏻", status = 200;

    let result: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>  = await db
    .collection("merchants")
    .doc(merchant_uuid)
    .collection("funnels")
    .doc(funnel_uuid)
    .collection("analytics")
    .doc(date)
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


export const getMerchant = async (
    merchant_uuid: string,
) => {
    // Data for validation in parent
    console.log("118: Get Mercahnt --------------------- ");
    let text = " - Document found 👍🏻", status = 200;

    let result: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>  = await db
    .collection("merchants")
    .doc(merchant_uuid)
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



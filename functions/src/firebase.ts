import * as admin from "firebase-admin";
admin.initializeApp();

const firestoreDB: FirebaseFirestore.Firestore = admin.firestore();

firestoreDB.settings({
    timestampInSnapshot: true
})

export const db = firestoreDB;
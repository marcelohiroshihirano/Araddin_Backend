import * as functions from 'firebase-functions';

export const getStores = functions.https.onRequest((request, response) => {
    response.send("Hello from Firebase!");
});

export const postOrder = functions.https.onRequest((request, response) => {
    response.send("Hello from Firebase!");
});

export const getProducts = functions.https.onRequest((request, response) => {
    response.send("Hello from Firebase!");
});
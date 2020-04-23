import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as Joi from 'joi'
import { Order, Item } from './apptypes'

admin.initializeApp();

export const orderAfterSave = functions.firestore
    .document('order/{orderID}')
    .onWrite((change, context) => {
        const document = change.after.exists ? change.after.data() : null;
        const timeValues = {
            updatedAt: Date.now(),
        };
        return document?.update(timeValues);
    });


export const getShops = functions.https.onRequest(async (req, res) => {
    const query = admin.firestore().collection(`/shop`)
    try {
        const snapshot = await query.get();
        const shop: any = [];
        snapshot.forEach((childSnapshot) => {
            const values = childSnapshot.data()
            values.id = childSnapshot.id
            shop.push(values);
        });

        res.status(200).send( { data: { "shops": shop } } );
    } catch (error) {
        console.log('Error getting messages', error.message);
        res.status(500).send({ error :  error });
    }
});
export const getProducts = functions.https.onRequest(async (req, res) => {
    const shopId = req.body.data.shopId;
    console.log("DATA.shopId " + req.body.data.shopId)
    const query = admin.firestore().collection(`/product/${shopId}/item`)
    try {
        const snapshot = await query.get();
        const products: any = [];
        snapshot.forEach((childSnapshot) => {
            const values = childSnapshot.data()
            values.id = childSnapshot.id
            products.push(values);
        });

        res.status(200).send({ data: { "shop_id": `${shopId}`, "products": products }});
    } catch (error) {
        console.log('Error getting messages', error.message);
        res.status(404).send({ error :  error.message });
    }
});

export const getOrder = functions.https.onRequest(async (req, res) => {
    const orderId = req.body.data.orderId;
    const query = admin.firestore().doc(`/order/${orderId}`)
    try {
        const snapshot = await query.get();
        const data = snapshot.data()
        data!.id = snapshot.id
        res.status(200).send({ data });
    } catch (error) {
        console.log('Error getting messages', error.message);
        res.status(404).send({ error :  error.message });
    }
});

const itemSchema = Joi.object({
    item: Joi.string().required(),
    quantity: Joi.number().positive().required(),
})

const orderSchema = Joi.object({
    shop: Joi.string().required(),
    locale: Joi.string().required(),
    address1: Joi.string().required(),
    address2: Joi.string().optional().allow(''),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    postalCode: Joi.string().required(),
    notes: Joi.string().optional().allow(''),
    currency: Joi.string().required(),
    items: Joi.array().required().min(1).items(itemSchema),
    user: Joi.string().required()
})

export const createOrder = functions.https.onRequest(async (req, res) => {

    const params = req.body.data
    console.log(params)
    const result = Joi.validate(params, orderSchema)
    if(result.error){
        res.status(400).send({ error : result.error.message });
    }
    try {
        await admin.firestore().doc(`/product/${params.shop}`).get();
    } catch (error) {
        console.log('Error getting messages', error.message);
        res.status(400).send({ error : "Shop doesn't exits "});
        return
    }

    const items: Item[] = [];
    for (const element of params.items) {
        try {
            const snapshot = await admin.firestore().doc(`/product/${params.shop}/item/${element.item}`).get()
            console.log("PRICE " + snapshot.data()?.price)
            items.push({quantity: Number(element.quantity), item: element.item, value: 4.0 })
        } catch (error) {
            console.log('Error getting messages', error.message);
            res.status(400).send({ error : `Item ${element.item} doesn't exits. ` });
            return
        }
    }

    const order: Order = {
        shop: params.shop,
        locale: params.locale,
        address1: params.address1,
        postalCode: params.postalCode,
        isPaid: false,
        total: 30.0,
        total_with_tax: 30.0,
        state: params.state,
        items: items,
        currency: params.currency,
        taxes: [{ VAT : 0.8 }],
        city: params.city,
        country: params.country,
        user: params.user,
        delivered: false,
    }

    console.log(order)
    
    if (req.query.notes) {
        order.notes = params.notes;
    }

    if (req.query.address2) {
        order.address2 = params.address2;
    }
    
    try {
        const ref = await admin.firestore().collection("/order").add(order)
        const saved_order = await ref.get()
        const data =  saved_order.data()
        data!.id = saved_order.id
        res.status(200).send({ data });
    } catch (error) {
        console.log('Error getting messages', error.message);
        res.status(500).send({ error : error.message })
    }
})

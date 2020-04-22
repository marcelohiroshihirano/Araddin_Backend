import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as Joi from '@hapi/joi'
import {
    ContainerTypes,
    // Use this as a replacement for express.Request
    ValidatedRequest,
    // Extend from this to define a valid schema type/interface
    ValidatedRequestSchema,
    // Creates a validator that generates middlewares
    createValidator
} from 'express-joi-validation'
import { Order, Item } from './apptypes'


admin.initializeApp();
const app = express();

/*const authenticate = async (req: express.Request, res: express.Response, next: Function) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        res.status(403).send('Unauthorized');
        return;
    }
    const idToken = req.headers.authorization.split('Bearer ')[1];
    try {
        const decodedIdToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedIdToken;
        next();
        return;
    } catch (e) {
        res.status(403).send('Unauthorized');
        return;
    }
};
app.use(authenticate);*/

export const orderAfterSave = functions.firestore
    .document('order/{orderID}')
    .onWrite((change, context) => {
        const document = change.after.exists ? change.after.data() : null;
        const timeValues = {
            updatedAt: Date.now(),
        };
        return document?.update(timeValues);
    });

app.get('/shops', async (req: express.Request, res: express.Response) => {
    const query = admin.firestore().collection(`/shop`)
    try {
        const snapshot = await query.get();
        const shop: any = [];
        snapshot.forEach((childSnapshot) => {
            shop.push({ "shop_id": childSnapshot.id, "data": childSnapshot.data() });
        });

        res.set('Cache-Control', 'private, max-age=300');
        res.status(200).json(shop);
    } catch (error) {
        console.log('Error getting messages', error.message);
        res.sendStatus(500);
    }
});

app.get('/shop/:shopId/products', async (req: express.Request, res: express.Response) => {
    const shopId = req.params.shopId;
    const query = admin.firestore().collection(`/product/${shopId}/item`)
    try {
        const snapshot = await query.get();
        const products: any = [];
        snapshot.forEach((childSnapshot) => {
            products.push({ id: childSnapshot.id, data: childSnapshot.data() });
        });

        res.set('Cache-Control', 'private, max-age=300');
        res.status(200).json({ "shop_id": `${shopId}`, "products": products });
    } catch (error) {
        console.log('Error getting messages', error.message);
        res.sendStatus(500);
    }
});

app.get('/order/:orderId', async (req: express.Request, res: express.Response) => {
    const orderId = req.params.orderId;
    const query = admin.firestore().doc(`/order/${orderId}`)
    try {
        const snapshot = await query.get();
        res.set('Cache-Control', 'private, max-age=300');
        res.status(200).json({ "order_id": snapshot.id, "data": snapshot.data() });
    } catch (error) {
        console.log('Error getting messages', error.message);
        res.sendStatus(404);
    }
});

const validator = createValidator()

const itemSchema = Joi.object({
    item: Joi.string().required(),
    quantity: Joi.number().positive().required(),
})
const querySchema = Joi.object({
    shop: Joi.string().required(),
    locale: Joi.string().required(),
    address1: Joi.string().required(),
    address2: Joi.string(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    postalCode: Joi.string().required(),
    notes: Joi.string(),
    currency: Joi.string().required(),
    items: Joi.array().required().min(1).items(itemSchema)
})

interface OrderRequestSchema extends ValidatedRequestSchema {
    [ContainerTypes.Query]: {
        shop: string,
        locale: string
        address1: string,
        address2: string,
        city: string,
        state: string,
        country: string,
        postalCode: string
        notes: string,
        items: [ { item: string, quantity: string }],
        currency: string
    }
}

app.post('/order',
    validator.query(querySchema),
    async (req: ValidatedRequest<OrderRequestSchema>, res: express.Response) => {
        
        try {
            await admin.firestore().doc(`/product/${req.query.shop}`).get();
        } catch (error) {
            console.log('Error getting messages', error.message);
            res.status(400).send("Shop doesn't exits ");
            return
        }

        const items: Item[] = [];
        for (const element of req.query.items) {
            try {
                const snapshot = await admin.firestore().doc(`/product/${req.query.shop}/item/${element.item}`).get()
                items.push({quantity: Number(element.quantity), item: element.item, value: snapshot.data()?.price })
            } catch (error) {
                console.log('Error getting messages', error.message);
                res.status(400).send(`Item ${element.item} doesn't exits. `);
                return
            }
        }

        const order: Order = {
            shop: req.query.shop,
            locale: req.query.locale,
            address1: req.query.address1,
            postalCode: req.query.postalCode,
            isPaid: false,
            total: 30.0,
            total_with_tax: 30.0,
            state: req.query.state,
            items: items,
            currency: req.query.currency,
            taxes: [{ VAT : 0.8 }],
            city: req.query.city,
            country: req.query.country,
            user: "SASAS",
            delivered: false,
        }
        
        if (req.query.notes) {
            order.notes = req.query.notes;
        }

        if (req.query.address2) {
            order.address2 = req.query.address2;
        }
        
        try {
            const ref = await admin.firestore().collection("/order").add(order)
            const saved_order = await ref.get()
            res.status(200).json({ "order_id": saved_order.id, "data": saved_order.data()});
        } catch (error) {
            console.log('Error getting messages', error.message);
            res.sendStatus(500);
        }
    });


exports.api = functions.https.onRequest(app);
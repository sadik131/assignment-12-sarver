const express = require('express');
const app = express();
const stripe = require("stripe")('sk_test_51L47IwKLivP7yRsGI5ux8335cVujKbxWO0n99C1NgeMb1M6mJDcCi5cLhwRnlxuCzck56DeyfvIBB0lwvVZuzI9W005OD20IQS')
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')

// midell ware 
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.Db_USER}:${process.env.PASSWORD}@cluster0.6euue.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// jwt verification 
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorize access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_KEY, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        await client.connect();
        const productCollection = client.db("bangaliIndustry").collection("products");
        const usersCollection = client.db("bangaliIndustry").collection("users");
        const ordersCollection = client.db("bangaliIndustry").collection("orders");
        const reviewsCollection = client.db("bangaliIndustry").collection("reviews");
        const paymentCollection = client.db("bangaliIndustry").collection("payment");

        // all product 
        app.get('/products', async (req, res) => {
            const result = await productCollection.find().toArray()
            res.send(result)
        });

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        //token generate
        app.put('/user', async (req, res) => {
            const email = req.query.email;
            const filter = { email }
            const currentUser = req.body;
            const options = { upsert: true }
            const updateDoc = {
                $set: currentUser
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_KEY)
            res.send({ result, token })
        })
        //check admin 
        app.get('/admin', async (req, res) => {
            const email = req.query.email;
            const query = { email }
            const user = await usersCollection.findOne(query)
            if (user.role === 'admin') {
                return res.send({ isAdmin: true })
            } else {
                return res.send({ isAdmin: false })
            }
        })
        // get single product data 
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await productCollection.findOne(query)
            res.send(result)
        })
        //add order to database 
        app.post('/orders', async (req, res) => {
            const orderData = req.body;
            const result = await ordersCollection.insertOne(orderData)
            res.send(result)
        })
        //my orders 
        app.get('/orders', async (req, res) => {
            const email = req.query.email;
            const query = { email }
            const result = await ordersCollection.find().toArray()
            res.send(result)
        })
        //add rating api 
        app.post('/reviews', async (req, res) => {
            const data = req.body;
            const result = await reviewsCollection.insertOne(data)
            res.send(result)
        })
        //get all review
        app.get('/reviews', async (req, res) => {
            const result = await reviewsCollection.find().toArray()
            res.send(result)
        })
        //get user
        app.get('/user', async (req, res) => {
            const email = req.query.email;
            const query = { email }
            const result = await usersCollection.findOne(query)
            res.send(result)
        })
        //get all user
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        })
        //get single order for payment
        app.get('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await ordersCollection.findOne(query)
            res.send(result)
        })
        //payment
        app.post('/create-payment-intent', async (req, res) => {
            const service = req.body;
            const totalPrice = service.totalPrice;
            const amount = totalPrice * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });

        app.put('/order/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: 'paid',
                    transactionId: payment.transactionId
                }
            }
            const update = await ordersCollection.updateOne(filter, updatedDoc)
            const result = await paymentCollection.insertOne(payment)
            res.send(result)
        })

        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await ordersCollection.deleteOne(query)
            res.send(result)
        })
        app.post('/product', async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product)
            res.send(result)
        })



    }
    finally { }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("Hey Man")
});
app.listen(port, () => {
    console.log('testing port', port)
})
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const app = express()
const port = 4000
const admin = require('firebase-admin');
require('dotenv').config()

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())

admin.initializeApp({
    credential: admin.credential.cert({
        "type": process.env.JWT_TYPE,
        "project_id": process.env.PROJECT_ID,
        "private_key_id": process.env.PRIVATE_KEY_ID,
        "private_key": process.env.PRIVATE_KEY,
        "client_email": process.env.CLIENT_EMAIL,
        "client_id": process.env.CLIENT_ID,
        "auth_uri": process.env.AUTH_URI,
        "token_uri": process.env.TOKEN_URI,
        "auth_provider_x509_cert_url": process.env.AUTH_PROVIDER_X509_CERT_URL,
        "client_x509_cert_url": process.env.CLIENT_X509_CERT_URL
    }),
    databaseURL: process.env.DB_URL
});

const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a3ov0.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    const serviceCollection = client.db(process.env.DB_NAME).collection("services");
    const adminCollection = client.db(process.env.DB_NAME).collection("admins");
    const bookingCollection = client.db(process.env.DB_NAME).collection("bookings");
    const testimonialsCollection = client.db(process.env.DB_NAME).collection("testimonials");
  
    app.post('/addService', (req,res) => {
        const service = req.body;
        serviceCollection.insertOne({service})
        .then(result => {
            res.send(result.insertedCount > 0)
        })
    })

    app.post('/addBooking', (req,res) => {
        const booking = req.body;
        bookingCollection.insertOne({booking})
        .then(result => {
            res.send(result.insertedCount > 0)
        })
    })

    app.post('/addTestimonials', (req,res) => {
        const review = req.body;
        testimonialsCollection.insertOne({review})
        .then(result => {
            res.send(result.insertedCount > 0)
        })
    })

    app.get('/services', (req,res) => {
        serviceCollection.find({})
        .toArray((err, documents) => {
            res.send(documents);
        })
    })

    app.get('/testimonials', (req,res) => {
        testimonialsCollection.find({})
        .toArray((err, documents) => {
            res.send(documents);
        })
    })

    app.get('/bookings/:email', (req,res) => {
        const bearer = req.headers.authorization;
        if(bearer && bearer.startsWith('Bearer ')){
            const idToken = bearer.split(' ')[1];
            admin.auth().verifyIdToken(idToken)
            .then((decodedToken) => {
                const decodeEmail = decodedToken.email;
                const reqEmail = req.params.email;
                
                if(decodeEmail === reqEmail){
                    bookingCollection.find({'booking.user.email': req.params.email})
                    .toArray((err, documents) => {
                        res.send(documents);
                    })
                }
                else{
                    res.status(401).send("Unauthorized access")
                }
            })
            .catch((error) => {
                res.status(401).send("Unauthorized access")
            });
        }
        else{
            res.status(401).send("Unauthorized access")
        }
            
    })

    app.get('/bookings/', (req,res) => {
        bookingCollection.find({})
        .toArray((err, documents) => {
            res.send(documents);
        })
    })

    // app.get('/admins', (req,res) => {
    //     adminCollection.find({})
    //     .toArray((err, documents) => {
    //         res.send(documents);
    //     })
    // })

    app.get('/admins/:email', (req,res) => {
        const email = req.params.email;
        adminCollection.find({email})
        .toArray((err, documents) => {
            res.send(documents);
        })
    })

    app.get('/addAdmin/:email', (req,res) => {
        const email = req.params.email;
        adminCollection.insertOne({email})
        .then(result => {
            res.send(result.insertedCount > 0);
        })
    })

    app.delete('/deleteService/:id', (req,res) => {
        serviceCollection.deleteOne({
            _id : ObjectId(req.params.id)
        })
        .then(result => {
            res.send(result.deletedCount > 0);
        })
    })

    app.patch('/modifyBookingStatus/:id', function (req, res) {
        var status = req.body;
        bookingCollection.updateOne({_id: ObjectId(req.params.id)},
        {
            $set: {"booking.status": status.status}
        })
        .then(result => {
            res.send(result.modifiedCount > 0)
        })
    });
});


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(process.env.PORT || port)
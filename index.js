require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require('firebase-admin');

const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8');
const serviceAccount = JSON.parse(decoded);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@repairright.fiikihw.mongodb.net/?retryWrites=true&w=majority&appName=RepairRight`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// Auth Middleware
async function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    const idToken = authHeader.split(' ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
    }
}

// Apply authentication middleware to protected routes
async function run() {
    const db = client.db('repairright');
    const servicesCollection = db.collection('services');
    const bookingsCollection = db.collection('bookings');

    app.post('/services', authenticateToken, async (req, res) => {
        const service = req.body;
        service.provider = {
            name: req.user.name || req.user.displayName || "Unknown",
            email: req.user.email,
            image: req.user.picture || req.user.photoURL || ""
        };
        const result = await servicesCollection.insertOne(service);
        res.send(result);
    });

    app.get('/my-services', authenticateToken, async (req, res) => {
        const email = req.user.email;
        const services = await servicesCollection.find({ 'provider.email': email }).toArray();
        res.send(services);
    });

    app.put('/services/:id', authenticateToken, async (req, res) => {
        const id = req.params.id;
        const update = req.body;
        const result = await servicesCollection.updateOne(
            { _id: new ObjectId(id), 'provider.email': req.user.email },
            { $set: update }
        );
        res.send(result);
    }); app.delete('/services/:id', authenticateToken, async (req, res) => {
        const id = req.params.id;
        const result = await servicesCollection.deleteOne({ _id: new ObjectId(id), 'provider.email': req.user.email });
        res.send(result);
    });

    app.get('/bookings/check/:serviceId/:userEmail', authenticateToken, async (req, res) => {
        try {
            const { serviceId, userEmail } = req.params;

            if (req.user.email !== userEmail) {
                return res.status(403).json({ error: 'Unauthorized access' });
            }

            const existingBooking = await bookingsCollection.findOne({
                serviceId: serviceId,
                currentUserEmail: userEmail
            });

            res.json({
                hasBooked: !!existingBooking,
                booking: existingBooking
            });
        } catch (error) {
            console.error('Error checking booking:', error);
            res.status(500).json({ error: 'Failed to check booking status' });
        }
    });

    app.post('/bookings', authenticateToken, async (req, res) => {
        try {
            const booking = req.body;

            if (req.user.email === booking.providerEmail) {
                return res.status(400).json({
                    error: 'You cannot book your own service'
                });
            }

            const existingBooking = await bookingsCollection.findOne({
                serviceId: booking.serviceId,
                currentUserEmail: req.user.email
            });

            if (existingBooking) {
                return res.status(400).json({
                    error: 'You have already booked this service. You cannot book the same service multiple times.'
                });
            }

            booking.serviceStatus = 'pending';
            booking.currentUserEmail = req.user.email;
            booking.bookedAt = new Date();

            const result = await bookingsCollection.insertOne(booking);
            res.json({
                message: 'Booking created successfully',
                bookingId: result.insertedId
            });
        } catch (error) {
            console.error('Booking creation error:', error);
            res.status(500).json({ error: 'Failed to create booking' });
        }
    });

    app.get('/my-bookings', authenticateToken, async (req, res) => {
        const email = req.user.email;
        const bookings = await bookingsCollection.find({ currentUserEmail: email }).toArray();
        res.send(bookings);
    });

    app.get('/service-to-do', authenticateToken, async (req, res) => {
        const email = req.user.email;
        const bookings = await bookingsCollection.find({ providerEmail: email }).toArray();
        res.send(bookings);
    });

    app.patch('/bookings/:id/status', authenticateToken, async (req, res) => {
        const id = req.params.id;
        const { serviceStatus } = req.body;
        const result = await bookingsCollection.updateOne(
            { _id: new ObjectId(id), providerEmail: req.user.email },
            { $set: { serviceStatus } }
        );
        res.send(result);
    });

    // Public routes (no auth)
    app.get('/services', async (req, res) => {
        const services = await servicesCollection.find().toArray();
        res.send(services);
    });

    app.get('/services/:id', async (req, res) => {
        const id = req.params.id;
        const service = await servicesCollection.findOne({ _id: new ObjectId(id) });
        res.send(service);
    });
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Welcome to RepairRight API!');
});

app.use((req, res, next) => {
    res.status(404).json({ error: 'Not Found' });
});

app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});
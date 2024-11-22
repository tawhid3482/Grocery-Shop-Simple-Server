const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleWare
app.use(cors());
app.use(express.json());

// mongodb url

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s64u1mi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // all collection
    const productCollection = client.db("Grocery-Shop").collection("Products");
    const reviewsCollection = client.db("Grocery-Shop").collection("reviews");
    const cartCollection = client.db("Grocery-Shop").collection("carts");
    const favoriteCollection = client
      .db("Grocery-Shop")
      .collection("favorites");

    // products
    app.get("/products", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });

    // reviews
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    // cart

    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });

    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = {email:email}
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    // favorite

    app.post("/favorites", async (req, res) => {
      const favoriteItem = req.body;
      const result = await favoriteCollection.insertOne(favoriteItem);
      res.send(result);
    });

    app.get("/favorites", async (req, res) => {
      const email = req.query.email;
      const query = {email:email}
      const result = await favoriteCollection.find(query).toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// server running
app.get("/", (req, res) => {
  res.send("Grocery-Shop");
});

app.listen(port, () => {
  console.log(`Grocery-Shop Running on ${port}`);
});

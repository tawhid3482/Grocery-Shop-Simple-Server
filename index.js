const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleWare
app.use(cors());
app.use(express.json());

// mongodb url

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const userCollection = client.db("Grocery-Shop").collection("users");

    




    // user api
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;

      if (!id) {
        return res.status(400).send({ message: "User ID is required." });
      }
      const { lastSignInTime, ...otherUpdates } = req.body; // Get the lastSignInTime from the request body

      if (lastSignInTime && isNaN(Date.parse(lastSignInTime))) {
        return res
          .status(400)
          .send({ message: "Invalid lastSignInTime format." });
      }

      const query = { id: id };

      const updatedUser = {
        $set: {
          ...(lastSignInTime && { "metadata.lastSignInTime": lastSignInTime }),
          ...otherUpdates,
        },
      };
      const result = await userCollection.updateOne(query, updatedUser);
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedUser = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(query, updatedUser);
      res.send(result);
    });

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
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
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
      const query = { email: email };
      const result = await favoriteCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/favorites/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await favoriteCollection.deleteOne(query);
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

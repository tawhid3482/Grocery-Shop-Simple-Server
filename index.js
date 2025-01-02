const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe= require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

// middleWare
app.use(cors());
app.use(express.json());

// mongodb url

const { MongoClient, ServerApiVersion, ObjectId, Admin } = require("mongodb");
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
    const addressCollection = client.db("Grocery-Shop").collection("address");
    const couponCollection = client.db("Grocery-Shop").collection("coupon");
    const checkOutCollection = client.db("Grocery-Shop").collection("checkout");
    const orderCollection = client.db("Grocery-Shop").collection("order");
    const paymentCollection = client.db("Grocery-Shop").collection("payment");

    // jwt api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // middleware
    const verifyToken = (req, res, next) => {
      // console.log("verify", req.headers);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized Access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

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

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
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

    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const updatedUser = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(query, updatedUser);
        res.send(result);
      }
    );

    // products
    app.get("/products", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    app.post("/products", verifyToken, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });
    app.delete("/products/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/products/:id", verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: item.name,
          oldPrice: item.oldPrice,
          newPrice: item.newPrice,
          category: item.category,
          rating: item.rating,
          stock: item.stock,
          description: item.description,
          featured: item.featured,
          offer: item.offer,
          stock_quantity: item.stock_quantity,
          brand: item.brand,
          unit_of_measure: item.unit_of_measure,
          supplier: {
            name: item.supplier?.name || "",
            contact_info: {
              phone: item.supplier?.contact_info?.phone || "",
              email: item.supplier?.contact_info?.email || "",
            },
          },
          img: item.img,
        },
      };
      const result = await productCollection.updateOne(query, updatedDoc);
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

    app.delete("/carts", async (req, res) => {
      const email = req.query.email;
      // console.log(`Deleting carts for email: ${email}`);
      const query = { email: email };
      const result = await cartCollection.deleteMany(query);
      res.send(result);
    });

    app.patch("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const item = req.body;
      const updatedDoc = {
        $set: {
          count: item.count,
          price: item.price,
        },
      };
      const result = await cartCollection.updateOne(query, updatedDoc);
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

    // address
    app.post("/address", async (req, res) => {
      const data = req.body;
      const result = await addressCollection.insertOne(data);
      res.send(result);
    });
    app.get("/address", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await addressCollection.find(query).toArray();
      res.send(result);
    });
    // coupon
    app.post("/coupon", verifyToken, verifyAdmin, async (req, res) => {
      const data = req.body;
      const result = await couponCollection.insertOne(data);
      res.send(result);
    });
    app.get("/coupon", async (req, res) => {
      const result = await couponCollection.find().toArray();
      res.send(result);
    });

    // checkout
    app.post("/checkout", async (req, res) => {
      const checkoutItem = req.body;
      const result = await checkOutCollection.insertOne(checkoutItem);
      res.send(result);
    });

    app.get("/checkout/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await checkOutCollection.findOne(query);
      res.send(result);
    });

    app.get("/checkout", async (req, res) => {
      // const email = req.query.email;
      // const query = { email: email };
      const result = await checkOutCollection.find().toArray();
      res.send(result);
    });

    app.delete("/checkout/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await checkOutCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/checkout/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const item = req.body;
      const updatedDoc = {
        $set: {
          cart: item.cart,
          subtotal: item.subtotal,
          discount: item.discount,
          discountPrice: item.discountPrice,
          total: item.total,
        },
      };
      const result = await checkOutCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    // order
    app.post("/order", async (req, res) => {
      const orderData = req.body;
      const result = await orderCollection.insertOne(orderData);
      res.send(result);
    });
    app.get("/order", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/order/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await orderCollection.findOne(query);
      res.send(result);
    });
    app.patch("/order/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const item = req.body;
      const updatedDoc = {
        $set: {
          cart: item.cart,
          subtotal: item.subtotal,
          discount: item.discount,
          discountPrice: item.discountPrice,
          total: item.total,
        },
      };
      const result = await checkOutCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    // payment
    app.post("/create-payment-intent", async (req, res) => {
      const {price} = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.get("/payment", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await paymentCollection.find(query).toArray();
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

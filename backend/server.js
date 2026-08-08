const db = require("./connection");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
const JWT_SECRET = process.env.JWT_SECRET;
const path = require("path");
const multer = require("multer");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
//new
const http = require("http");
const socketIo = require("socket.io");
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // frontend origin
    methods: ["GET", "POST"],
  },
});
app.set("io", io);
// Example: socket connection
io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

app.use(cors());

//webhook for stripe
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  let event;
  console.log("🔔 Webhook received");

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      endpointSecret
    );
  } catch (err) {
    console.error("Webhook Error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful payment
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const userId = session.metadata.user_id;
    const name = session.metadata.name;
    const email = session.metadata.email;
    const address = session.metadata.address;
    const phone = session.metadata.phone;
    const total = session.amount_total / 100; // Stripe uses cents
    const cartItems = JSON.parse(session.metadata.cartItems); // stored as stringified JSON

    // Insert order
    const orderQuery = `
      INSERT INTO orders (user_id, name, email, address,phone, payment_method, total_price)
      VALUES (?, ?, ?, ?, ?, ?,?)
    `;

    db.query(
      orderQuery,
      [userId, name, email, address, phone, "online", total],
      (err, orderResult) => {
        if (err) {
          console.error("Insert order error:", err);
          return res.status(500).end();
        }

        const orderId = orderResult.insertId;

        // Insert order items
        const itemsData = cartItems.map((item) => [
          orderId,
          item.product_id,
          item.title,
          item.price,
          item.quantity,
        ]);

        const orderItemsQuery = `
        INSERT INTO order_items (order_id, product_id, title, price, quantity)
        VALUES ?
      `;

        db.query(orderItemsQuery, [itemsData], (err) => {
          if (err) {
            console.error("Insert order items error:", err);
            return res.status(500).end();
          }

          // Insert payment record
          const paymentQuery = `
          INSERT INTO payments (user_id, order_id, amount, payment_method, payment_status)
          VALUES (?, ?, ?, ?, ?)
        `;

          db.query(
            paymentQuery,
            [userId, orderId, total, "Stripe", "completed"],
            (err) => {
              if (err) {
                console.error("Insert payment error:", err);
                return res.status(500).end();
              }

              // Update product quantities
              let updateCount = 0;
              let failedUpdate = false;

              cartItems.forEach((item) => {
                const updateProductQuery = `
              UPDATE products
              SET quantity = quantity - ?
              WHERE id = ? AND quantity >= ?
            `;

                db.query(
                  updateProductQuery,
                  [item.quantity, item.product_id, item.quantity],
                  (err) => {
                    if (err) {
                      console.error(
                        `❌ Error updating product ${item.product_id}:`,
                        err
                      );
                      failedUpdate = true;
                    }

                    updateCount++;

                    // Once all updates are done
                    if (updateCount === cartItems.length) {
                      if (failedUpdate) {
                        return res.status(500).end(); // Optional: rollback other changes
                      }

                      // Clear user's cart
                      const clearCartQuery = `DELETE FROM carts WHERE user_id = ?`;
                      db.query(clearCartQuery, [userId], (err) => {
                        if (err) {
                          console.error("Clear cart error:", err);
                          return res.status(500).end();
                        }
                        const io = req.app.get("io");
                        io.emit("update-summary");
                        io.emit("product_added");
                        console.log(
                          "✅ Order, payment saved, product stock updated, and cart cleared."
                        );
                        res.status(200).json({ received: true });
                      });
                    }
                  }
                );
              });
            }
          );
        });
      }
    );
  } else {
    res.status(200).json({ received: true });
  }
});

app.use(express.json());

// Serve static files from the "uploads" directory
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.post("/signup", async (req, res) => {
  const { name, password, phone, email } = req.body;

  // Validation checks
  if (!name || !password || !phone || !email) {
    return res.status(400).json({ error: "All fields are required." });
  }
const nameRegex = /^[a-zA-Z\s]{3,50}$/;
if (!nameRegex.test(name)) {
  return res.status(400).json({
    error: "Name must contain only letters and spaces (2–50 characters).",
  });
}
  // if (!email.endsWith("@gmail.com")) {
  //   return res
  //     .status(400)
  //     .json({ error: "Email must be a gmail.com address." });
  // }
  // Strict Gmail email validation
const gmailRegex = /^[a-zA-Z0-9](\.?[a-zA-Z0-9]){5,29}@gmail\.com$/;
if (!gmailRegex.test(email)) {
  return res.status(400).json({
    error: "Email must be a valid Gmail address (e.g. johndoe@gmail.com).",
  });
}

const passwordRegex = /^(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
if (!passwordRegex.test(password)) {
  return res.status(400).json({
    error:
      "Password must be at least 8 characters long and contain at least 1 special character.",
  });}
  
  if (!/^\d{11}$/.test(phone)) {
    return res
      .status(400)
      .json({ error: "Phone number must be exactly 11 digits." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 5);
    const sql =
      "INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)";
    const values = [name, email, hashedPassword, phone];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Error inserting user:", err);
        return res.status(500).json({ error: "Database error" });
      }
      const io = req.app.get("io");
      io.emit("update-summary");
      res.status(200).json({ message: "User inserted successfully" });
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Something went wrong, internal server error" });
  }
});

// ✅ Login route
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ?"
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0)
      return res.status(401).json({ error: "Invalid credentials" });

    const user = results[0];
    console.log(user);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });
    // const data={ userId: user.id, email: user.email };
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    res.json({ message: "Login successful", token });
  });
});

app.get("/home", authenticateToken, (req, res) => {
  console.log(req.user);
  res.json({ message: `Welcome, ${req.user.name}` });
});

// ✅ Middleware for token verification
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>
  console.log("Received token:", token); // ✅
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Invalid token
    req.user = user;
    next();
  });
}
/// ✅ Middleware for token verification that it is admin role
function verifyRoot(req, res, next) {
  console.log("Checking if user is root:", req.user); // ✅
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Root only." });
  }
  next();
}

//get all products to display on listing page

app.get("/listing", authenticateToken, (req, res) => {
  const sql = "SELECT * FROM products where status='available' ";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ products: results });
  });
});

//get all products to display on dashborad

app.get("/my-products", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const sql =
    "SELECT * FROM products WHERE user_id = ? AND status='available' ";

  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ products: results });
  });
});

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });
// Add new product

app.post("/add-car", authenticateToken, upload.single("image"), (req, res) => {
  console.log(req.body);
  const userId = req.user.userId;
  const { title, description, category, brand, model, year, price } = req.body;

  // Handle file upload (you'll need multer for this)
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  const sql = `INSERT INTO products 
    (user_id, title, description, category, brand, model, year, price, image) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?,?)`;

  const values = [
    userId,
    title,
    description,
    category,
    brand,
    model,
    year,
    price,
    image,
  ];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });
    const io = req.app.get("io");
    io.emit("update-summary");
    io.emit("product_added");
    res.status(201).json({
      message: "Product added successfully",
      productId: result.insertId,
    });
  });
});

app.post(
  "/add-spare-part",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    {
      const {
        title,
        description,
        price,
        quantity,
        category,
        brand,
        model,
        year,
      } = req.body;
      const userId = req.user.userId;
      console.log(userId);
      // Basic validation
      if (
        !title ||
        !description ||
        !price ||
        !quantity ||
        !category ||
        !brand ||
        !model ||
        !year
      ) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const parsedPrice = parseFloat(price);
      const parsedQuantity = parseInt(quantity, 10);
      const parsedYear = parseInt(year, 10);

      if (isNaN(parsedPrice) || isNaN(parsedQuantity) || isNaN(parsedYear)) {
        return res.status(400).json({ error: "Invalid number fields" });
      }

      const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

      const insertQuery = `
      INSERT INTO products
      (title, description, price, quantity, category, brand, model, year, image, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
      const values = [
        title,
        description,
        parsedPrice,
        parsedQuantity,
        category,
        brand,
        model,
        parsedYear,
        imagePath,
        userId,
      ];

      db.query(insertQuery, values, (err, result) => {
        if (err) {
          console.error("Database insert error:", err);
          return res.status(500).json({ error: "Database error" });
        }
        const io = req.app.get("io");
        io.emit("update-summary");
        io.emit("product_added");
        return res
          .status(201)
          .json({ message: "Sparepart added successfully" });
      });
    }
  }
);

// ✅ Delete product route

app.delete("/delete-product/:id", authenticateToken, (req, res) => {
  const productId = req.params.id;
  const userId = req.user.userId;

  // First, check if the product belongs to the user
  const checkSql = "SELECT * FROM products WHERE id = ? AND user_id = ?";
  db.query(checkSql, [productId, userId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res
        .status(404)
        .json({ error: "Product not found or unauthorized" });
    }

    // If found, delete it
    const deleteSql = "DELETE FROM products WHERE id = ? AND user_id = ?";
    db.query(deleteSql, [productId, userId], (err, result) => {
      if (err) {
        console.error("Error deleting product:", err);
        return res.status(500).json({ error: "Failed to delete product" });
      }
      const io = req.app.get("io");
      io.emit("update-summary");
      io.emit("product-deleted");
      io.emit("product_deleted");
      io.emit("productUpdated");
      res.json({ message: "Product deleted successfully" });
    });
  });
});

app.put(
  "/UpdateProduct/:id",
  authenticateToken,
  upload.single("image"),
  (req, res) => {
    const productId = req.params.id;
    const userId = req.user.userId;
    const {
      title,
      description,
      category,
      brand,
      model,
      year,
      price,
      quantity,
    } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    let sql = `
    UPDATE products 
    SET title = ?, description = ?, category = ?, brand = ?, model = ?, year = ?, price = ?,quantity= ?
  `;

    const values = [
      title,
      description,
      category,
      brand,
      model,
      year,
      price,
      quantity,
    ];

    if (image) {
      sql += `, image = ?`;
      values.push(image);
    }

    sql += ` WHERE id = ? AND user_id = ?`;
    values.push(productId, userId);

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Error updating product:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ error: "Product not found or not authorized" });
      }
      const io = req.app.get("io");
      io.emit("productUpdated");
      res.status(200).json({ message: "Product updated successfully" });
    });
  }
);

//API to show the product details
app.get("/products/:id", (req, res) => {
  const productId = req.params.id;

  const query = `
    SELECT 
      p.*, 
      u.name AS seller_name, 
      u.phone AS seller_phone 
    FROM products p 
    JOIN users u ON p.user_id = u.id 
    WHERE p.id = ?
  `;

  db.query(query, [productId], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0)
      return res.status(404).json({ error: "Product not found" });
    //console.log(results[0]);
    res.json({ product: results[0] });
  });
});

/// PATCH /mark-as-sold/:productId

app.patch("/mark-as-sold/:productId", authenticateToken, (req, res) => {
  const productId = req.params.productId;

  const query = `UPDATE products SET status = 'sold' WHERE id = ? AND category = 'car'`;
  db.query(query, [productId], (err, result) => {
    if (err) {
      console.error("Error marking product as sold:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Product not found or not a car" });
    }
    const io = req.app.get("io");
    io.emit("update-summary");
    io.emit("product_deleted");
    io.emit("product-sold");
    res.json({ message: "Product marked as sold" });
  });
});

///////////////////////////////////
//cart apiis /////////////////=======
// Correct route: /add-to-cart (POST)
app.post("/add-to-cart", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { product: productId } = req.body;
  console.log(productId);
  if (!productId) {
    return res.status(400).json({ error: "Product ID is required" });
  }

  const checkSql = "SELECT * FROM carts WHERE user_id = ? AND product_id = ?";
  db.query(checkSql, [userId, productId], (err, results) => {
    if (err) {
      console.error("Check SQL Error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length > 0) {
      const updateSql =
        "UPDATE carts SET quantity = quantity + 1 WHERE user_id = ? AND product_id = ?";
      db.query(updateSql, [userId, productId], (err2) => {
        if (err2) {
          console.error("Update SQL Error:", err2);
          return res.status(500).json({ error: "Failed to update quantity" });
        }
        return res.json({ message: "Quantity updated in cart" });
      });
    } else {
      const insertSql =
        "INSERT INTO carts (user_id, product_id, quantity) VALUES (?, ?, 1)";
      db.query(insertSql, [userId, productId], (err3) => {
        if (err3) {
          console.error("Insert SQL Error:", err3);
          return res.status(500).json({ error: "Failed to add to cart" });
        }
        return res.json({ message: "Product added to cart" });
      });
    }
  });
});

/// Api for update cart

app.patch("/cart/update-quantity", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { productId, change } = req.body;

  if (!productId || ![1, -1].includes(change)) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const getCartQtySql =
    "SELECT quantity FROM carts WHERE user_id = ? AND product_id = ?";
  db.query(getCartQtySql, [userId, productId], (err, cartResults) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (cartResults.length === 0)
      return res.status(404).json({ error: "Item not found in cart" });

    const currentQty = cartResults[0].quantity;
    const newQty = currentQty + change;

    if (newQty < 1)
      return res.status(400).json({ error: "Quantity cannot be less than 1" });

    // Check available stock in products table
    const getStockSql = "SELECT quantity FROM products WHERE id = ?";
    db.query(getStockSql, [productId], (err2, productResults) => {
      if (err2) return res.status(500).json({ error: "Database error" });
      if (productResults.length === 0)
        return res.status(404).json({ error: "Product not found" });

      const availableStock = productResults[0].quantity;

      if (newQty > availableStock) {
        return res.status(400).json({
          error: `Only ${availableStock} items in stock. Cannot increase beyond this.`,
        });
      }

      // Update cart quantity
      const updateSql =
        "UPDATE carts SET quantity = ? WHERE user_id = ? AND product_id = ?";
      db.query(updateSql, [newQty, userId, productId], (err3) => {
        if (err3) return res.status(500).json({ error: "Update failed" });

        res.json({
          message: "Quantity updated",
          quantity: newQty,
        });
      });
    });
  });
});

// Get user's cart
app.get("/cart", authenticateToken, (req, res) => {
  console.log("Decoded JWT payload:", req.user); // Add this
  const userId = req.user.userId;
  console.log(userId);
  const sql = `SELECT p.*, c.quantity FROM carts c 
JOIN products p ON c.product_id = p.id 
WHERE c.user_id = ?`;
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    console.log(results);
    res.json({ cart: results });
  });
});

// DELETE /cart/remove/:productId
app.delete("/cart/remove/:productId", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const productId = req.params.productId;

  const sql = "DELETE FROM carts WHERE user_id = ? AND product_id = ?";

  db.query(sql, [userId, productId], (err, result) => {
    if (err) {
      console.error("Error removing from cart:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    res.json({ message: "Item removed from cart" });
  });
});

//checkout for cod ordere

app.post("/checkout", authenticateToken, (req, res) => {
  const { name, email, address, phone, paymentMethod, cartItems } = req.body;
  const userId = req.user.userId;

  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Step 1: Insert into orders table
  db.query(
    "INSERT INTO orders (user_id, name, email, address, phone, payment_method, total_price) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [userId, name, email, address, phone, paymentMethod, total],
    (err, orderResult) => {
      if (err) {
        console.error("Error inserting into orders:", err);
        return res.status(500).json({ error: "Failed to place order." });
      }

      const orderId = orderResult.insertId;

      // ✅ Step 1.5: Insert into payments table
      db.query(
        "INSERT INTO payments (user_id, order_id, amount, payment_method, payment_status) VALUES (?, ?, ?, ?, ?)",
        [userId, orderId, total, paymentMethod, "pending"],
        (err) => {
          if (err) {
            console.error("Error inserting into payments:", err);
            return res
              .status(500)
              .json({ error: "Order created but payment record failed." });
          }

          let completed = 0;
          let hasError = false;

          // Step 2: Insert into order_items
          cartItems.forEach((item) => {
            db.query(
              "INSERT INTO order_items (order_id, product_id, title, price, quantity) VALUES (?, ?, ?, ?, ?)",
              [orderId, item.id, item.title, item.price, item.quantity],
              (err) => {
                if (hasError) return;

                if (err) {
                  hasError = true;
                  console.error("Error inserting into order_items:", err);
                  return res
                    .status(500)
                    .json({ error: "Failed to insert order items." });
                }

                // Step 3: Update product stock
                db.query(
                  "UPDATE products SET quantity = quantity - ? WHERE id = ?",
                  [item.quantity, item.id],
                  (err) => {
                    if (hasError) return;

                    if (err) {
                      hasError = true;
                      console.error("Error updating product quantity:", err);
                      return res
                        .status(500)
                        .json({ error: "Failed to update product stock." });
                    }

                    completed++;
                    if (completed === cartItems.length) {
                      // Step 4: Clear cart
                      db.query(
                        "DELETE FROM carts WHERE user_id = ?",
                        [userId],
                        (err) => {
                          if (err) {
                            console.error("Error clearing cart:", err);
                            return res
                              .status(500)
                              .json({
                                error: "Order placed but failed to clear cart.",
                              });
                          }
                          const io = req.app.get("io");
                          io.emit("update-summary");
                          io.emit("product_added");
                          return res.status(200).json({
                            message: "Order  successfully.",
                          });
                        }
                      );
                    }
                  }
                );
              }
            );
          });
        }
      );
    }
  );
});

//stripe payment session creation webhook is on top

app.post(
  "/api/create-checkout-session",
  authenticateToken,
  async (req, res) => {
    try {
      const { items, name, email, address, phone } = req.body;
      const userId = req.user.userId;
      console.log(items);
      if (!items || !items.length) {
        return res.status(400).json({ error: "Cart is empty" });
      }

      const lineItems = items.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: { name: item.title },
          unit_amount: Math.round(Number(item.price) * 100),
        },
        quantity: item.quantity,
      }));
      const minimalCartItems = items.map((item) => ({
        product_id: item.id, // use 'id' if that's your key
        price: item.price,
        title: item.title,
        quantity: item.quantity,
      }));
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: lineItems,
        success_url: "http://localhost:3000/PaymentSuccess",
        cancel_url: "http://localhost:3000/checkout",
        metadata: {
          user_id: userId,
          name,
          email,
          address,
          phone,
          cartItems: JSON.stringify(minimalCartItems),
        },
      });

      res.json({ id: session.id });
    } catch (err) {
      console.error("🔥 Stripe session creation error:", err); // Show the actual error in backend console
      res
        .status(500)
        .json({ error: "Failed to create Stripe Checkout session" });
    }
  }
);

// CURRENT SHOOPING
// GET /orders
app.get("/my-orders", authenticateToken, (req, res) => {
  const userId = req.user.userId;

  const sql = `
    SELECT o.id AS orderId, o.status, o.created_at,oi.product_id,oi.product_status, oi.quantity, p.title, p.price, p.image
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });

    // Group items by order ID
    const orders = {};
    results.forEach((row) => {
      if (!orders[row.orderId]) {
        orders[row.orderId] = {
          orderId: row.orderId,
          productId: row.productId,
          status: row.status,
          product_status: row.product_status,
          created_at: row.created_at,
          items: [],
        };
      }
      orders[row.orderId].items.push({
        title: row.title,
        product_status: row.product_status,
        price: row.price,
        image: row.image,
        quantity: row.quantity,
      });
    });

    res.json({ orders: Object.values(orders) });
  });
});

//cancel order

app.patch("/cancel-order/:id", authenticateToken, (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.userId;

  const getStatusSql = "SELECT status FROM orders WHERE id = ? AND user_id = ?";
  db.query(getStatusSql, [orderId, userId], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0)
      return res.status(404).json({ error: "Order not found" });

    const currentStatus = results[0].status;
    if (currentStatus !== "pending") {
      return res
        .status(400)
        .json({ error: "Only pending orders can be canceled" });
    }

    // Step 1: Get items from order_items
    const getOrderItemsSql =
      "SELECT product_id, quantity FROM order_items WHERE order_id = ?";
    db.query(getOrderItemsSql, [orderId], (err2, items) => {
      if (err2)
        return res.status(500).json({ error: "Error fetching order items" });

      // Step 2: Update product stock for each item
      let updated = 0;
      items.forEach((item, index) => {
        const updateProductQtySql = `
          UPDATE products 
          SET quantity = quantity + ? 
          WHERE id = ?
        `;
        db.query(
          updateProductQtySql,
          [item.quantity, item.product_id],
          (err3) => {
            if (err3) console.error("Error updating product quantity:", err3);

            updated++;

            // When all product updates are done
            if (updated === items.length) {
              // Step 3: Mark the order as cancelled
              const updateOrderSql =
                "UPDATE orders SET status = 'cancelled' WHERE id = ? AND user_id = ?";
              db.query(updateOrderSql, [orderId, userId], (err4) => {
                if (err4)
                  return res.status(500).json({ error: "Cancel failed" });
                //  res.json({ message: "Order cancelled and stock restored" });
              });
            }
            if (updated === items.length) {
              // Step 3: Mark the orderItems as cancelled
              const updateOrderSql =
                "UPDATE order_items SET product_status = 'cancelled' WHERE order_id = ?";
              db.query(updateOrderSql, [orderId], (err4) => {
                if (err4)
                  return res.status(500).json({ error: "Cancel failed" });
                res.json({ message: "Order cancelled and stock restored" });
              });
            }
          }
        );
      });
    });
  });
});

//orders of users listed products

app.get("/orders-for-my-products", authenticateToken, (req, res) => {
  const userId = req.user.userId;

  // const sql = `
  //   SELECT
  //     o.id as orderId,
  //     o.status,
  //     o.address,
  //     u.name as buyerName,
  //     oi.id as orderItemId,
  //     oi.product_status,
  //     oi.product_id,
  //     oi.quantity,
  //     p.title,
  //     p.model,
  //     p.price,
  //     p.image,
  //     pay.payment_status
  //   FROM orders o
  //   JOIN users u ON o.user_id = u.id
  //   JOIN order_items oi ON oi.order_id = o.id
  //   JOIN products p ON p.id = oi.product_id
  //   LEFT JOIN payments pay ON pay.order_id = o.id
  //   WHERE p.user_id = ?
  //   ORDER BY o.created_at DESC
  // `;
  const sql = `SELECT 
  o.id AS orderId,
  o.status,
  o.address,
  u.name AS buyerName,
  oi.id AS orderItemId,
  oi.product_status,
  oi.product_id,
  oi.quantity,
  p.title,
  p.model,
  p.price,
  p.image,
  pay.payment_status
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
LEFT JOIN payments pay ON pay.order_id = o.id
WHERE p.user_id = ?
  AND (
    oi.product_status != 'shipped'
    OR pay.payment_status = 'unpaid'
    OR pay.payment_status ='pending'
  )
ORDER BY o.created_at DESC;
`;

  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch orders" });

    // Group by orderId
    const grouped = {};
    results.forEach((row) => {
      if (!grouped[row.orderId]) {
        grouped[row.orderId] = {
          orderItem_id: row.orderItemId,
          orderId: row.orderId,
          status: row.status,
          product_status: row.product_status,
          buyerName: row.buyerName,
          address: row.address,
          payment_status: row.payment_status || "unpaid", // default if null
          items: [],
        };
      }

      grouped[row.orderId].items.push({
        orderItem_id: row.orderItemId,
        productId: row.product_id,
        title: row.title,
        model: row.model,
        price: row.price,
        quantity: row.quantity,
        image: row.image,
        product_status: row.product_status,
      });
    });

    res.json({ orders: Object.values(grouped) });
  });
});

//shipped status

app.patch("/order-item/:itemId/shipped", authenticateToken, (req, res) => {
  const itemId = req.params.itemId;
  console.log(itemId);
  // Step 1: Check item status
  db.query(
    "SELECT product_status, order_id FROM order_items WHERE id = ?",
    [itemId],
    (err, results) => {
      if (err) {
        console.error("Error fetching order item:", err);
        return res.status(500).json({ message: "Internal server error" });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "Order item not found" });
      }

      const item = results[0];

      if (item.product_status !== "pending") {
        return res
          .status(400)
          .json({ message: "Item is not in pending state" });
      }

      // Step 2: Update item to shipped
      db.query(
        "UPDATE order_items SET product_status = ? WHERE id = ?",
        ["shipped", itemId],
        (err2) => {
          if (err2) {
            console.error("Error updating order item:", err2);
            return res
              .status(500)
              .json({ message: "Failed to update product status" });
          }

          // Step 3: Check if all items in the same order are now shipped
          db.query(
            'SELECT COUNT(*) AS pendingCount FROM order_items WHERE order_id = ? AND product_status = "pending"',
            [item.order_id],
            (err3, results2) => {
              if (err3) {
                console.error("Error checking remaining items:", err3);
                return res
                  .status(500)
                  .json({ message: "Internal server error" });
              }

              const { pendingCount } = results2[0];

              if (pendingCount === 0) {
                // Step 4: Update order status to shipped
                db.query(
                  "UPDATE orders SET status = ? WHERE id = ?",
                  ["shipped", item.order_id],
                  (err4) => {
                    if (err4) {
                      console.error("Error updating order status:", err4);
                      return res
                        .status(500)
                        .json({ message: "Failed to update order status" });
                    }

                    return res.json({
                      message: "Item and order marked as shipped",
                    });
                  }
                );
              } else {
                return res.json({ message: "Item marked as shipped" });
              }
            }
          );
        }
      );
    }
  );
});

//paid status to mark
app.patch("/mark-order-paid/:orderId", authenticateToken, (req, res) => {
  const orderId = req.params.orderId;
  const sql = `UPDATE payments SET payment_status = 'completed' WHERE order_id = ?`;

  db.query(sql, [orderId], (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Payment marked as paid" });
  });
});

//sales report for users

// app.get("/sales-report", authenticateToken, (req, res) => {
//   const userId = req.user.userId;
//   const selectedMonth = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM

//   const sql = `
//     SELECT 
//       p.title AS product,
//       oi.product_status AS item_status,
//       SUM(oi.quantity) AS quantity,
//       oi.price,
//       SUM(oi.price * oi.quantity) AS total_price,
//       MAX(o.created_at) AS created_at
//     FROM 
//       order_items oi
//     JOIN 
//       orders o ON oi.order_id = o.id
//     JOIN 
//       products p ON oi.product_id = p.id
//     WHERE 
//       p.user_id = ?
//       AND DATE_FORMAT(o.created_at, '%Y-%m') = ?
//       AND oi.product_status IN ('pending', 'shipped')
//     GROUP BY 
//       p.title, oi.product_status, oi.price
//     ORDER BY 
//       created_at DESC
//   `;

//   db.query(sql, [userId, selectedMonth], (err, results) => {
//     if (err) return res.status(500).json({ error: "Database error" });

//     const formatted = results.map((r) => ({
//       ...r,
//       total_price: Number(r.total_price),
//       price: Number(r.price),
//       quantity: Number(r.quantity),
//     }));

//     res.json({ items: formatted, month: selectedMonth });
//   });
// });

app.get("/sales-report", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const selectedMonth = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM

  const sql = `
    SELECT 
      p.title AS product,
      oi.product_status AS item_status,
      SUM(oi.quantity) AS quantity,
      oi.price,
      SUM(oi.price * oi.quantity) AS total_price,
      MAX(o.created_at) AS created_at,
      MAX(pay.payment_status) AS payment_status
    FROM 
      order_items oi
    JOIN 
      orders o ON oi.order_id = o.id
    JOIN 
      products p ON oi.product_id = p.id
    LEFT JOIN 
      payments pay ON pay.order_id = o.id
    WHERE 
      p.user_id = ?
      AND DATE_FORMAT(o.created_at, '%Y-%m') = ?
      AND oi.product_status IN ('pending', 'shipped')
    GROUP BY 
      p.title, oi.product_status, oi.price
    ORDER BY 
      created_at DESC
  `;

  db.query(sql, [userId, selectedMonth], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });

    const formatted = results.map((r) => ({
      ...r,
      total_price: Number(r.total_price),
      price: Number(r.price),
      quantity: Number(r.quantity),
      payment_status: r.payment_status || 'unknown'
    }));

    res.json({ items: formatted, month: selectedMonth });
  });
});


// ===========================
// Admin Panel Routes (ROOT ONLY)
// ===========================

// Summary: total revenue, sales, orders

app.get("/admin/summary", authenticateToken, verifyRoot, (req, res) => {
  const summary = {};

  const queries = {
    users: "SELECT COUNT(*) AS totalUsers FROM users",
    cars: "SELECT COUNT(*) AS totalCars FROM products WHERE category = 'car' AND status='available'",
    spareParts:
      "SELECT COUNT(*) AS totalSpareParts FROM products WHERE category = 'spare_part'",
    sales:
      "SELECT COUNT(*) AS totalSales, SUM(total_price) AS totalRevenue FROM orders",
    cars_sold:
      "SELECT COUNT(*) AS total_cars_sold FROM products WHERE category = 'car' AND status = 'sold'",
    spare_part_sold:
    "SELECT SUM(quantity) AS total_spare_part_sold FROM order_items "  
  };

  db.query(queries.users, (err, userResult) => {
    if (err)
      return res.status(500).json({ error: "Failed to fetch user count" });
    summary.totalUsers = userResult[0].totalUsers;

    db.query(queries.cars, (err, carResult) => {
      if (err)
        return res.status(500).json({ error: "Failed to fetch car count" });
      summary.totalCars = carResult[0].totalCars;

      db.query(queries.spareParts, (err, spareResult) => {
        if (err)
          return res
            .status(500)
            .json({ error: "Failed to fetch spare part count" });
        summary.totalSpareParts = spareResult[0].totalSpareParts;

        db.query(queries.sales, (err, salesResult) => {
          if (err)
            return res
              .status(500)
              .json({ error: "Failed to fetch sales summary" });

          db.query(queries.cars_sold, (err, carSalesResult) => {
            if (err)
              return res
                .status(500)
                .json({ error: "Failed to fetch sales summary" });
            summary.totalCarsSold = carSalesResult[0].total_cars_sold || 0;
            //summary.totalSales = salesResult[0].totalSales;
            summary.totalRevenue = salesResult[0].totalRevenue || 0;
            
            db.query(queries.spare_part_sold, (err, sparePatsSoldResult) => {
            if (err)
              return res
                .status(500)
                .json({ error: "Failed to fetch sales summary" });
            summary.totalSparePartsSold = sparePatsSoldResult[0].total_spare_part_sold ;    
            return res.json(summary);
          });
         });
        });
      });
    });
  });
});

// Get all products with listing user and creation date
app.get("/admin/products", authenticateToken, verifyRoot, (req, res) => {
  const query = `
    SELECT 
      p.id, p.title, p.status,p.category, p.price, p.quantity, p.created_at,
      u.name AS user_name, u.email AS user_email
    FROM products p
    LEFT JOIN users u ON p.user_id = u.id
    Where p.status='available'
    ORDER BY p.created_at DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching products for admin:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
    console.log("hye");
    const products = results.map((row) => {
      return {
        id: row.id,
        title: row.title || "Untitled",
        category: row.category || "Uncategorized",
        price: row.price != null ? row.price : 0,
        quantity: row.quantity != null ? row.quantity : 0,
        created_at: row.created_at,
        user: {
          name: row.user_name || "Unknown User",
          email: row.user_email || "No email",
        },
      };
    });
    console.log("hi");
    res.json({ products });
  });
});

// GET /admin/user-sales
// app.get("/admin/user-sales", authenticateToken, verifyRoot, (req, res) => {
//   const query = `
//     SELECT 
//       u.id AS userId,
//       u.name,
//       u.email,
//       p.title AS productTitle,
//       oi.quantity,
//       oi.price,
//       o.created_at AS createdAt
//     FROM users u
//     JOIN products p ON p.user_id = u.id
//     JOIN order_items oi ON oi.product_id = p.id
//     JOIN orders o ON o.id = oi.order_id
//     ORDER BY o.created_at DESC
//   `;

//   db.query(query, (err, results) => {
//     if (err) {
//       console.error("Error fetching user sales:", err);
//       return res.status(500).json({ error: "Internal server error" });
//     }

//     // Organize data by user
//     const userMap = {};

//     results.forEach((row) => {
//       if (!userMap[row.userId]) {
//         userMap[row.userId] = {
//           userId: row.userId,
//           name: row.name,
//           email: row.email,
//           totalSales: 0,
//           totalOrders: 0,
//           orders: [],
//         };
//       }

//       const user = userMap[row.userId];
//       user.totalSales += row.quantity * row.price;
//       user.totalOrders += 1;
//       user.orders.push({
//         productTitle: row.productTitle,
//         quantity: row.quantity,
//         price: row.price,
//         createdAt: row.createdAt,
//       });
//     });

//     const userSales = Object.values(userMap);
//     res.json(userSales);
//   });
// });
// app.get("/admin/user-sales", authenticateToken, verifyRoot, (req, res) => {
//   const { month } = req.query;

//   // Build base SQL query
//   let query = `
//     SELECT 
//       u.id AS userId,
//       u.name,
//       u.email,
//       p.title AS productTitle,
//       oi.quantity,
//       oi.price,
//       o.created_at AS createdAt
//     FROM users u
//     JOIN products p ON p.user_id = u.id
//     JOIN order_items oi ON oi.product_id = p.id
//     JOIN orders o ON o.id = oi.order_id
//   `;

//   // Optional WHERE clause for month filtering
//   const params = [];
//   if (month) {
//     query += ` WHERE DATE_FORMAT(o.created_at, '%Y-%m') = ?`;
//     params.push(month); // e.g., "2025-06"
//   }

//   query += ` ORDER BY o.created_at DESC`;

//   db.query(query, params, (err, results) => {
//     if (err) {
//       console.error("Error fetching user sales:", err);
//       return res.status(500).json({ error: "Internal server error" });
//     }

//     // Organize data by user
//     const userMap = {};

//     results.forEach((row) => {
//       if (!userMap[row.userId]) {
//         userMap[row.userId] = {
//           userId: row.userId,
//           name: row.name,
//           email: row.email,
//           totalSales: 0,
//           totalOrders: 0,
//           orders: [],
//         };
//       }

//       const user = userMap[row.userId];
//       user.totalSales += row.quantity * row.price;
//       user.totalOrders += 1;
//       user.orders.push({
//         productTitle: row.productTitle,
//         quantity: row.quantity,
//         price: row.price,
//         createdAt: row.createdAt,
//       });
//     });

//     const userSales = Object.values(userMap);
//     res.json(userSales);
//   });
// });

app.get("/admin/user-sales", authenticateToken, verifyRoot, (req, res) => {
  const { month, day } = req.query;

  let query = `
    SELECT 
      u.id AS userId,
      u.name,
      u.email,
      p.title AS productTitle,
      oi.quantity,
      oi.price,
      o.created_at AS createdAt
    FROM users u
    JOIN products p ON p.user_id = u.id
    JOIN order_items oi ON oi.product_id = p.id
    JOIN orders o ON o.id = oi.order_id
  `;

  const params = [];

  // Apply filters if provided
  if (day) {
    query += ` WHERE DATE(o.created_at) = ?`;
    params.push(day); // e.g., "2025-06-15"
  } else if (month) {
    query += ` WHERE DATE_FORMAT(o.created_at, '%Y-%m') = ?`;
    params.push(month); // e.g., "2025-06"
  }

  query += ` ORDER BY o.created_at DESC`;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error("Error fetching user sales:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    const userMap = {};

    results.forEach((row) => {
      if (!userMap[row.userId]) {
        userMap[row.userId] = {
          userId: row.userId,
          name: row.name,
          email: row.email,
          totalSales: 0,
          totalOrders: 0,
          orders: [],
        };
      }

      const user = userMap[row.userId];
      user.totalSales += row.quantity * row.price;
      user.totalOrders += 1;
      user.orders.push({
        productTitle: row.productTitle,
        quantity: row.quantity,
        price: row.price,
        createdAt: row.createdAt,
      });
    });

    const userSales = Object.values(userMap);
    res.json(userSales);
  });
});

app.get("/admin/users", authenticateToken, (req, res) => {
  const sql = "SELECT id, name, email, phone, role FROM users";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching users:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    res.json(results);
  });
});

app.patch("/admin/update-user/:userId", authenticateToken, (req, res) => {
  const userId = req.params.userId;
  const { email, phone } = req.body;

  if (!email || !phone) {
    return res.status(400).json({ error: "Email and phone are required" });
  }
const gmailRegex = /^[a-zA-Z0-9](\.?[a-zA-Z0-9]){5,29}@gmail\.com$/;
if (!gmailRegex.test(email)) {
  return res.status(400).json({
    error: "Email must be a valid Gmail address (e.g. johndoe@gmail.com).",
  });
}

  if (!/^\d{11}$/.test(phone)) {
    return res
      .status(400)
      .json({ error: "Phone number must be exactly 11 digits." });
  }
  const sql = "UPDATE users SET email = ?, phone = ? WHERE id = ?";

  db.query(sql, [email, phone, userId], (err, result) => {
    if (err) {
      console.error("Error updating user:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User updated successfully" });
  });
});

////

// app.get('/admin/orders', authenticateToken, verifyRoot, (req, res) => {
//   const query = `
//     SELECT 
//       o.id,
//       u.name AS user_name,
//       o.total_price AS total_amount,
//       o.status AS payment_status,
//       o.created_at
//     FROM orders o
//     JOIN users u ON o.user_id = u.id
//     ORDER BY o.created_at DESC
//   `;

//   db.query(query, (err, results) => {
//     if (err) {
//       console.error("Error fetching orders:", err);
//       return res.status(500).json({ error: "Internal server error" });
//     }
//     res.json(results);
//   });
// });
app.get('/admin/orders', authenticateToken, verifyRoot, (req, res) => {
  const query = `
    SELECT 
      o.id,
      u.name AS user_name,
      o.total_price AS total_amount,
      o.status AS order_status,
      p.payment_status,
      o.created_at
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN payments p ON p.order_id = o.id
    ORDER BY o.created_at DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching orders:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
    res.json(results);
  });
});

// app.put('/admin/orders/:id', authenticateToken, verifyRoot, (req, res) => {
//   const { id } = req.params;
//   const { payment_status } = req.body;

//   const allowedStatuses = ['paid', 'pending', 'failed', 'refunded'];

//   if (!allowedStatuses.includes(payment_status)) {
//     return res.status(400).json({ error: "Invalid payment status" });
//   }

//   const query = `UPDATE orders SET payment_status = ? WHERE id = ?`;

//   db.query(query, [payment_status, id], (err, result) => {
//     if (err) {
//       console.error("Error updating payment status:", err);
//       return res.status(500).json({ error: "Internal server error" });
//     }

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ error: "Order not found" });
//     }

//     res.json({ message: "Payment status updated successfully" });
//   });
// });
app.put('/admin/orders/:id', authenticateToken, verifyRoot, (req, res) => {
  const { id } = req.params;
  const { payment_status } = req.body;
//console.log(payment_status)
  const allowedStatuses = ['completed', 'pending', 'failed'];

  if (!allowedStatuses.includes(payment_status)) {
    return res.status(400).json({ error: "Invalid payment status" });
  }

  const query = `
    UPDATE payments 
    SET payment_status = ? 
    WHERE order_id = ?
  `;

  db.query(query, [payment_status, id], (err, result) => {
    if (err) {
      console.error("Error updating payment status:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Payment record not found for this order" });
    }

    res.json({ message: "Payment status updated successfully" });
  });
});


// app.listen(5000, () => {
//   console.log("Server is running on http://localhost:5000");
// });
server.listen(5000, () => {
  console.log("Server with Socket.IO running on http://localhost:5000");
});

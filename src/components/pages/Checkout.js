import React, { useEffect, useState } from "react";
import { Container, Row, Col, Form, Button, Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const stripePromise = loadStripe("pk_test_51RYn3KPsGHKIjIiSmqHiBD8vTxuR2nD43fUPcjcRt3TfH4qzrWENm4uDmDZzrgXJbAezlVjQycLWCDOBde7yqkkL00RBy21xCW");

const Checkout = () => {
  const [cartItems, setCartItems] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    phone: "",
    paymentMethod: "cod", // default to Cash on Delivery
  });

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // Fetch cart items
  useEffect(() => {
    const fetchCart = async () => {
      try {
        const res = await fetch("http://localhost:5000/cart", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setCartItems(data.cart || []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchCart();
  }, [token]);

  // Calculate total price
  const calculateTotal = () =>
    cartItems.reduce(
      (total, item) => total + Number(item.price) * item.quantity,
      0
    );

  // Handle form input changes
  const handleInputChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // Handle Stripe Checkout
  const handleStripeCheckout = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/create-checkout-session",
        {
          method: "POST",
          headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
},
          body: JSON.stringify({
            items: cartItems,
            name: formData.name,
            email: formData.email,
            address: formData.address,
            phone: formData.phone,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("Stripe session creation failed:", error);
        alert("Stripe session creation failed.");
        return;
      }

      const session = await response.json();

      const stripe = await stripePromise;
      const result = await stripe.redirectToCheckout({ sessionId: session.id });

      if (result.error) {
        console.error("Stripe redirect error:", result.error);
        alert("Stripe checkout failed.");
      }
    } catch (err) {
      console.error("Stripe checkout failed:", err);
      alert("Stripe checkout failed.");
    }
  };

  // Handle COD order placement
  const handlePlaceOrder = async () => {
    const { name, email, address, phone, paymentMethod } = formData;
    if (!name || !email || !address || !phone || !paymentMethod) {
      return alert("Please fill in all fields and select a payment method.");
    }

    try {
      const res = await fetch("http://localhost:5000/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...formData, cartItems }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("order placed successfully", {
                  position: 'top-right',
                  autoClose: 2500,
                  theme: 'dark'
                });
        setTimeout(()=>{navigate("/")},2700);
      } else {
        toast.error(data.error || "Something went wrong during checkout.", {
                  position: 'top-right',
                  autoClose: 2500,
                  theme: 'dark'
                });
      }
    } catch (err) {
      console.error(err);
       toast.error("Something went wrong during checkout.", {
                  position: 'top-right',
                  autoClose: 2500,
                  theme: 'dark'
                });
    }
  };

  return (
    <div className="app-page app-page--soft commerce-page">
      <ToastContainer/>
      <Container className="page-container">
        <div className="page-header"><div><span className="page-header__eyebrow">Secure checkout</span><h1 className="page-title">Complete your order</h1><p className="page-description">Enter delivery details and select your preferred payment method.</p></div></div>
        <Row className="g-4">
          <Col md={6}>
            <Card
              className="checkout-card p-4 mb-4"
            >
              <h2 className="section-title mb-4">Billing details</h2>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Phone</Form.Label>
                  <Form.Control
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Shipping Address</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="address"
                    rows={3}
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Complete shipping address"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Payment Method</Form.Label>
                  <Form.Select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                  >
                    <option value="cod">Cash on Delivery</option>
                    <option value="stripe">Pay with Card</option>
                  </Form.Select>
                </Form.Group>

                {formData.paymentMethod === "stripe" ? (
                  <Button variant="primary" className="w-100" onClick={handleStripeCheckout}>
                    Proceed to card payment
                  </Button>
                ) : (
                  <Button variant="primary" className="w-100" onClick={handlePlaceOrder}>
                    Place Order (COD)
                  </Button>
                )}
              </Form>
            </Card>
          </Col>

          <Col md={6}>
            <Card
              className="checkout-card order-summary p-4 mb-4"
            >
              <h2 className="section-title mb-4">Order summary</h2>
              <div className="order-summary__items">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="d-flex justify-content-between mb-3 gap-3"
                  >
                    <span>
                      {item.title} × {item.quantity}
                    </span>
                    <span>PKR {(item.quantity * item.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <hr />
              <div className="order-summary__total">
                <span>Total</span>
                <span>PKR {calculateTotal().toFixed(2)}</span>
              </div>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Checkout;

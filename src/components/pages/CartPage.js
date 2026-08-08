import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const fetchCartItems = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:5000/cart', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setCartItems(data.cart || []);
    } catch (err) {
      console.error('Error fetching cart items:', err);
    }
  }, [token]);

  const updateQuantity = async (productId, change) => {
    const product = cartItems.find(item => item.id === productId);
    if (!product || (product.quantity <= 1 && change === -1)) return;
    try {
      const res = await fetch('http://localhost:5000/cart/update-quantity', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId, change }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Failed to update quantity');
      setCartItems(prev => prev.map(item => item.id === productId ? { ...item, quantity: data.quantity } : item));
    } catch (err) {
      console.error('Update quantity error:', err.message);
      alert('Something went wrong. Please try again.');
    }
  };

  const handleRemoveFromCart = async (productId) => {
    try {
      await fetch(`http://localhost:5000/cart/remove/${productId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setCartItems(prev => prev.filter(item => item.id !== productId));
    } catch (err) {
      console.error('Failed to remove item from cart:', err);
    }
  };

  const calculateTotal = () => cartItems.reduce((total, item) => total + Number(item.price) * item.quantity, 0);
  useEffect(() => { fetchCartItems(); }, [fetchCartItems]);

  return (
    <div className="app-page app-page--soft commerce-page">
      <Container className="page-container">
        <motion.div className="page-header" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div><span className="page-header__eyebrow">Shopping</span><h1 className="page-title">My cart</h1><p className="page-description">Review quantities and order totals before checkout.</p></div>
          <span className="result-count">{cartItems.length} items</span>
        </motion.div>

        {cartItems.length === 0 ? (
          <div className="empty-state"><div><i className="bi bi-cart"></i><h3>Your cart is empty</h3><p>Add spare parts from the marketplace to begin an order.</p><Button size="sm" onClick={() => navigate('/Home')}>Browse marketplace</Button></div></div>
        ) : (
          <Row className="g-4">
            <Col lg={8}>
              <div className="d-grid gap-3">
                {cartItems.map(product => (
                  <motion.article key={product.id} className="cart-item" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}>
                    {product.image && <img src={`http://localhost:5000${product.image}`} alt={product.title} className="cart-item__image" />}
                    <div className="cart-item__content">
                      <div><h3>{product.title}</h3><span>{product.model}</span><p className="cart-item__price">PKR {Number(product.price).toFixed(2)}</p></div>
                      <div className="cart-item__actions">
                        <div className="quantity-control">
                          <Button size="sm" variant="outline-light" onClick={() => updateQuantity(product.id, -1)} disabled={product.quantity <= 1} aria-label="Decrease quantity">−</Button>
                          <span>{product.quantity}</span>
                          <Button size="sm" variant="outline-light" onClick={() => updateQuantity(product.id, 1)} aria-label="Increase quantity">+</Button>
                        </div>
                        <Button size="sm" variant="outline-danger" onClick={() => handleRemoveFromCart(product.id)}><i className="bi bi-trash3 me-1"></i>Remove</Button>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            </Col>
            <Col lg={4}>
              <Card className="order-summary p-4">
                <h2 className="section-title mb-4">Order summary</h2>
                <div className="order-summary__items">
                  {cartItems.map(item => <div key={item.id}><span>{item.title} × {item.quantity}</span><strong>PKR {(Number(item.price) * item.quantity).toFixed(2)}</strong></div>)}
                </div>
                <div className="order-summary__total"><span>Total</span><strong>PKR {calculateTotal().toFixed(2)}</strong></div>
                <Button variant="primary" className="w-100 mt-4" onClick={() => navigate('/checkout')}>Proceed to checkout <i className="bi bi-arrow-right ms-2"></i></Button>
              </Card>
            </Col>
          </Row>
        )}
      </Container>
    </div>
  );
};

export default Cart;

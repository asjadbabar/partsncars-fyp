import React, { useEffect, useState, useCallback } from 'react';
import { Container, Card, Row, Col, Button } from 'react-bootstrap';
import { motion } from 'framer-motion';

const MyShoppings = () => {
  const [orders, setOrders] = useState([]);
  const token = localStorage.getItem('token');

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:5000/my-orders', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  }, [token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const cancelOrder = async (orderId) => {
    const confirmCancel = window.confirm("Are you sure you want to cancel this order?");
    if (!confirmCancel) return;
    try {
      const res = await fetch(`http://localhost:5000/cancel-order/${orderId}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const errorData = await res.json();
        alert(`Cancel failed: ${errorData.error}`);
        return;
      }
      alert("Order cancelled successfully");
      fetchOrders();
    } catch (err) {
      console.error('Cancel request failed:', err);
    }
  };

  return (
    <div className="app-page app-page--soft orders-page">
      <Container className="page-container">
        <motion.div className="page-header" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div><span className="page-header__eyebrow">Purchases</span><h1 className="page-title">My orders</h1><p className="page-description">Track purchases, item progress, and order totals.</p></div><span className="result-count">{orders.length} orders</span>
        </motion.div>

        {orders.length === 0 ? <div className="empty-state"><div><i className="bi bi-bag"></i><h3>No purchases yet</h3><p className="mb-0">Orders you place will appear here.</p></div></div>
          : <div className="d-grid gap-4">{orders.map((order, index) => (
              <Card key={order.orderId} className="order-card">
                <Card.Body>
                  <div className="order-card__header">
                    <div><span className="order-card__label">Order</span><h2>#{order.orderId || index + 1}</h2></div>
                    <span className={`badge ${order.status === 'pending' ? 'bg-warning' : 'bg-success'} text-capitalize`}>{order.status}</span>
                  </div>
                  <Row className="g-3">
                    {order.items.map((item) => (
                      <Col xs={12} md={6} key={`${item.productId || item.title}-${index}`}>
                        <div className="order-item">
                          <img src={`http://localhost:5000${item.image}`} alt={item.title} />
                          <div><h3>{item.title}</h3><span>{item.model}</span><p>PKR {Number(item.price).toFixed(2)} × {item.quantity}</p><span className={`badge ${item.product_status === 'pending' ? 'bg-warning' : 'bg-success'} text-capitalize`}>{item.product_status}</span></div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                  <div className="order-card__footer">
                    {!order.items.some((item) => item.product_status === 'shipped') && <Button size="sm" variant="outline-danger" onClick={() => cancelOrder(order.orderId)}>Cancel order</Button>}
                    <div><span>Total</span><strong>PKR {order.items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0).toFixed(2)}</strong></div>
                  </div>
                </Card.Body>
              </Card>
            ))}</div>}
      </Container>
    </div>
  );
};

export default MyShoppings;

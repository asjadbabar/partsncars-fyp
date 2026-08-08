import React, { useEffect, useState, useCallback } from 'react';
import { Container, Card, Row, Col } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loadingIds, setLoadingIds] = useState({});
  const token = localStorage.getItem('token');

  const fetchMyProductOrders = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:5000/orders-for-my-products', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      toast.error('Failed to fetch orders.');
    }
  }, [token]);

  useEffect(() => { fetchMyProductOrders(); }, [fetchMyProductOrders]);

  const handleShipItem = async (itemId) => {
    setLoadingIds((prev) => ({ ...prev, [`ship-${itemId}`]: true }));
    try {
      const res = await fetch(`http://localhost:5000/order-item/${itemId}/shipped`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) { toast.success('Item marked as shipped!'); fetchMyProductOrders(); }
      else toast.error(data.message || 'Failed to mark shipped.');
    } catch (err) {
      toast.error('Error marking item as shipped.');
    } finally {
      setLoadingIds((prev) => ({ ...prev, [`ship-${itemId}`]: false }));
    }
  };

  return (
    <div className="app-page app-page--soft orders-page">
      <ToastContainer position="top-right" theme="dark" />
      <Container className="page-container">
        <motion.div className="page-header" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div><span className="page-header__eyebrow">Fulfillment</span><h1 className="page-title">Orders for my products</h1><p className="page-description">Review buyer details and move purchased items through fulfillment.</p></div><span className="result-count">{orders.length} orders</span>
        </motion.div>

        {orders.length === 0 ? <div className="empty-state"><div><i className="bi bi-box-seam"></i><h3>No incoming orders</h3><p className="mb-0">Orders for your listed products will appear here.</p></div></div>
          : <div className="d-grid gap-4">{orders.map((order, index) => (
              <Card key={order.orderId} className="order-card">
                <Card.Body>
                  <div className="order-card__header">
                    <div><span className="order-card__label">Order</span><h2>#{order.orderId || index + 1}</h2><p className="mb-0">Buyer: {order.buyerName || 'N/A'} · {order.address}</p></div>
                    <div className="d-flex flex-wrap gap-2"><span className={`badge ${order.status === 'pending' ? 'bg-warning' : 'bg-success'} text-capitalize`}>{order.status}</span><span className={`badge ${order.payment_status === 'paid' ? 'bg-success' : 'bg-danger'} text-capitalize`}>{order.payment_status}</span></div>
                  </div>
                  <Row className="g-3">
                    {order.items.map((item, idx) => (
                      <Col xs={12} lg={6} key={`${item.productId}-${idx}`}>
                        <div className="order-item order-item--seller">
                          <img src={`http://localhost:5000${item.image}`} alt={item.title} />
                          <div className="flex-grow-1"><h3>{item.title}</h3><span>{item.model}</span><p>PKR {Number(item.price).toFixed(2)} × {item.quantity}</p><span className={`badge ${item.product_status === 'pending' ? 'bg-warning' : 'bg-success'} text-capitalize`}>{item.product_status}</span></div>
                          {item.product_status === 'pending' && <button className="btn btn-sm btn-outline-success" onClick={() => handleShipItem(item.orderItem_id)} disabled={loadingIds[`ship-${item.orderItem_id}`]}>{loadingIds[`ship-${item.orderItem_id}`] ? 'Shipping...' : 'Mark shipped'}</button>}
                        </div>
                      </Col>
                    ))}
                  </Row>
                  <div className="order-card__footer justify-content-end"><div><span>Order total</span><strong>PKR {order.items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0).toFixed(2)}</strong></div></div>
                </Card.Body>
              </Card>
            ))}</div>}
      </Container>
    </div>
  );
};

export default MyOrders;

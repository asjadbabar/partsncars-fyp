import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Button, Card, Alert, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [notifiedProducts, setNotifiedProducts] = useState(new Set());
  const navigate = useNavigate();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/my-products', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const fetchedProducts = data.products || [];
      setProducts(fetchedProducts);

      fetchedProducts.forEach((product) => {
        const isSparepart = product.category?.toLowerCase() === 'spare_part';
        const quantity = Number(product.quantity);
        if (isSparepart && quantity < 10 && !notifiedProducts.has(product.id)) {
          toast.warn(`Low stock: ${product.title} (Qty: ${quantity})`, { position: 'top-right', autoClose: 5000, theme: 'dark' });
          setNotifiedProducts((prev) => new Set(prev).add(product.id));
        }
      });
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [notifiedProducts]);

  useEffect(() => {
    fetchProducts();
    socket.on('product-deleted', fetchProducts);
    socket.on('product-sold', fetchProducts);
    return () => {
      socket.off('product-deleted', fetchProducts);
      socket.off('product-sold', fetchProducts);
    };
  }, [fetchProducts]);

  const handleMarkAsSold = async (productId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/mark-as-sold/${productId}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        toast.success('Marked as sold!');
        setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, status: 'sold' } : p));
        socket.emit('product-sold');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to mark as sold');
      }
    } catch (err) {
      toast.error('Error updating product status');
    }
  };

  const handleDelete = async (productId) => {
    const confirm = window.confirm('Are you sure you want to delete this product?');
    if (!confirm) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/delete-product/${productId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        socket.emit('product-deleted');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete product');
      }
    } catch (err) {
      alert('An error occurred while deleting the product.');
    }
  };

  const ProductCard = ({ product }) => {
    const isSparepart = product.category?.toLowerCase() === 'spare_part';
    const isLowStock = isSparepart && Number(product.quantity) < 10;
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Card className={`dashboard-product mb-3 ${isLowStock ? 'dashboard-product--warning' : ''}`}>
          <Row className="g-0">
            <Col md={4} xl={3}>
              {product.image ? <Card.Img src={`http://localhost:5000${product.image}`} alt={product.title} className="dashboard-product__image" /> : <div className="dashboard-product__placeholder"><i className="bi bi-image"></i></div>}
            </Col>
            <Col md={8} xl={9}>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <div>
                    <Card.Title className="mb-2">{product.title}</Card.Title>
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      <Badge bg="secondary">Qty: {product.quantity ?? 'N/A'}</Badge>
                      {isLowStock && <Badge bg="danger">Low stock</Badge>}
                      {product.status === 'sold' && <Badge bg="success">Sold</Badge>}
                    </div>
                  </div>
                  <span className="dashboard-product__type"><i className={`bi ${product.category === 'car' ? 'bi-car-front' : 'bi-tools'}`}></i></span>
                </div>
                <Card.Subtitle className="mb-2 text-muted">{product.brand} · {product.model} · {product.year}</Card.Subtitle>
                <Card.Text className="small text-secondary">{product.description}</Card.Text>
                <div className="dashboard-product__footer">
                  <span className="dashboard-product__price">PKR {Number(product.price).toLocaleString()}</span>
                  <div className="d-flex flex-wrap gap-2">
                    <Button variant="outline-warning" size="sm" onClick={() => navigate(`/UpdateProduct/${product.id}`)}><i className="bi bi-pencil me-1"></i>Update</Button>
                    {product.category === 'car' && product.status !== 'sold' && <Button variant="outline-success" size="sm" onClick={() => handleMarkAsSold(product.id)}><i className="bi bi-check2-circle me-1"></i>Mark sold</Button>}
                    <Button variant="outline-danger" size="sm" onClick={() => handleDelete(product.id)}><i className="bi bi-trash3 me-1"></i>Delete</Button>
                  </div>
                </div>
              </Card.Body>
            </Col>
          </Row>
        </Card>
      </motion.div>
    );
  };

  const carCount = products.filter((product) => product.category === 'car').length;
  const lowStockCount = products.filter((product) => product.category === 'spare_part' && Number(product.quantity) < 10).length;

  return (
    <div className="app-page app-page--soft dashboard-page">
      <Container className="page-container">
        <ToastContainer />
        <div className="page-header">
          <div><span className="page-header__eyebrow">Seller workspace</span><h1 className="page-title">My dashboard</h1><p className="page-description">Manage listings, inventory, purchases, and incoming orders from one place.</p></div>
          <Button variant="primary" onClick={() => navigate('/AddCar')}><i className="bi bi-plus-lg me-2"></i>Add listing</Button>
        </div>

        <Row className="g-3 mb-4">
          <Col sm={6} lg={4}><div className="metric-card"><span className="metric-card__icon"><i className="bi bi-box-seam"></i></span><div><span>Total listings</span><strong>{products.length}</strong></div></div></Col>
          <Col sm={6} lg={4}><div className="metric-card"><span className="metric-card__icon"><i className="bi bi-car-front"></i></span><div><span>Vehicles</span><strong>{carCount}</strong></div></div></Col>
          <Col sm={6} lg={4}><div className="metric-card"><span className={`metric-card__icon ${lowStockCount ? 'metric-card__icon--warning' : ''}`}><i className="bi bi-exclamation-triangle"></i></span><div><span>Low stock</span><strong>{lowStockCount}</strong></div></div></Col>
        </Row>

        <Row className="g-4">
          <Col lg={3}>
            <Card className="quick-actions p-3">
              <Card.Title className="mb-3 section-title"><i className="bi bi-lightning-charge text-danger me-2"></i>Quick actions</Card.Title>
              <div className="d-grid gap-2">
                <Button variant="primary" onClick={() => navigate('/AddCar')}><i className="bi bi-car-front me-2"></i>Add car</Button>
                <Button variant="secondary" onClick={() => navigate('/AddSparepart')}><i className="bi bi-tools me-2"></i>Add spare part</Button>
                <Button variant="secondary" onClick={() => navigate('/MyShoppings')}><i className="bi bi-bag me-2"></i>My purchases</Button>
                <Button variant="secondary" onClick={() => navigate('/MyOrders')}><i className="bi bi-box-seam me-2"></i>Sales orders</Button>
                <Button variant="secondary" onClick={() => navigate('/MyReports')}><i className="bi bi-bar-chart me-2"></i>Sales report</Button>
              </div>
            </Card>
          </Col>
          <Col lg={9}>
            <Card className="products-panel">
              <Card.Body>
                <div className="panel-header"><div><Card.Title className="section-title mb-1">My products</Card.Title><p className="mb-0">Your active marketplace inventory</p></div><Badge bg="secondary">{products.length}</Badge></div>
                {loading && products.length === 0 ? <div className="loading-panel"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div>
                  : error ? <Alert variant="danger">Error fetching products</Alert>
                  : products.length === 0 ? <div className="empty-state"><div><i className="bi bi-box-seam"></i><h3>No products yet</h3><p>Add your first listing to start selling.</p><Button size="sm" onClick={() => navigate('/AddCar')}>Add a listing</Button></div></div>
                  : <div className="product-list">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Dashboard;

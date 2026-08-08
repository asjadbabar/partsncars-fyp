import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Container, Row, Col, Button, Spinner } from "react-bootstrap";

const Product = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
const handleAddToCart = async (product) => {
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('http://localhost:5000/add-to-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('Added to cart!');
      } else {
        alert(data.error || 'Failed to add to cart');
      }
    } catch (err) {
      console.error('Add to cart error:', err);
      alert('Error adding to cart');
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`http://localhost:5000/products/${id}`);
        const data = await res.json();
        setProduct(data.product);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load product:", err);
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <Container className="app-page loading-state" fluid>
        <Spinner animation="border" variant="danger" />
      </Container>
    );
  }

  if (!product) {
    return (
      <div className="app-page"><Container className="page-container"><div className="empty-state"><div><i className="bi bi-exclamation-circle"></i><h3>Product not found</h3><p className="mb-0">This listing may no longer be available.</p></div></div></Container></div>
    );
  }

  return (
    <div className="app-page app-page--soft product-detail-page">
      <Container className="page-container">
        <Row className="align-items-center g-5">
          <Col md={6}>
            <img
              src={`http://localhost:5000${product.image}`}
              alt={product.title}
              className="product-detail__image"
            />
          </Col>
          <Col md={6}>
            <span className="page-header__eyebrow">{product.category === 'car' ? 'Vehicle listing' : 'Spare part'}</span>
            <h1 className="product-detail__title">{product.title}</h1>
            <p className="product-detail__meta">{product.model}</p>
            <div className="product-detail__price">PKR {Number(product.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="product-detail__description">{product.description}</p>
            <div className="product-detail__facts"><div><span>In stock</span><strong>{product.quantity}</strong></div><div><span>Seller</span><strong>{product.seller_name}</strong></div><div><span>Contact</span><strong>{product.seller_phone}</strong></div></div>

            {product.category === "spare_part" && (
              <Button variant="primary" className="mt-4"
              onClick={() => handleAddToCart(product.id)}>
                <i className="bi bi-cart-plus me-2"></i>Add to cart
              </Button>
            )}
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Product;

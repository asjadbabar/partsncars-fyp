import React, { useState } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';


const AddSparepart = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    quantity: '',
    category: 'spare_part',
    brand: '',
    model: '',
    year: '',
    image: null
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    setFormData({
      ...formData,
      image: e.target.files[0]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });

      const res = await fetch('http://localhost:5000/add-spare-part', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Sparepart added successfully!');
        setTimeout(() => navigate('/UserDashboard'), 1500);
      } else {
        throw new Error(data.error || 'Failed to add sparepart');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-page app-page--soft form-page">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7 }}
        className="w-100"
      >
        <Container className="page-container--narrow">
          <Card className="form-card">
            <Card.Body className="p-4 p-md-5">
              <motion.div
                className="form-card__header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="form-card__icon"><i className="bi bi-tools"></i></span>
                <span className="page-header__eyebrow">New listing</span>
                <h1>Add a spare part</h1>
                <p>Add product and inventory details for buyers to review.</p>
              </motion.div>

              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Form onSubmit={handleSubmit}>
                {[
                  { label: 'Title*', name: 'title', type: 'text' },
                  { label: 'Description*', name: 'description', as: 'textarea', rows: 2 },
                  { label: 'Brand*', name: 'brand', type: 'text' },
                  { label: 'Model/Type*', name: 'model', type: 'text' },
                  { label: 'Year*', name: 'year', type: 'number', min: 1900, max: new Date().getFullYear() },
                ].map((field, i) => (
                  <Form.Group className="mb-3" key={i}>
                    <Form.Label>{field.label}</Form.Label>
                    <motion.div whileFocus={{ scale: 1.02 }} whileHover={{ scale: 1.01 }}>
                      <Form.Control
                        {...field}
                        value={formData[field.name]}
                        onChange={handleChange}
                        required
                      />
                    </motion.div>
                  </Form.Group>
                ))}

                <Row className="mb-3 g-3">
                  <Col xs={12} md={6}>
                    <Form.Group>
                      <Form.Label>Price (PKR)*</Form.Label>
                      <motion.div whileHover={{ scale: 1.01 }}>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          max="100000000"
                          name="price"
                          value={formData.price}
                          onChange={handleChange}
                          required
                        />
                      </motion.div>
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Group>
                      <Form.Label>Quantity*</Form.Label>
                      <motion.div whileHover={{ scale: 1.01 }}>
                        <Form.Control
                          type="number"
                          min="1"
                          max="1000000"
                          name="quantity"
                          value={formData.quantity}
                          onChange={handleChange}
                          required
                        />
                      </motion.div>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Category*</Form.Label>
                  <motion.div whileHover={{ scale: 1.01 }}>
                    <Form.Select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                    >
                      <option value="spare_part">Spare Part</option>
                      <option value="car">Car</option>
                    </Form.Select>
                  </motion.div>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Product Image*</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    required
                  />
                  <Form.Text className="text-muted">Upload a clear image (JPEG/PNG)</Form.Text>
                </Form.Group>

                <motion.div whileHover={{ scale: 1.03 }}>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                    className="w-100"
                  >
                    {loading ? 'Uploading...' : 'Add Sparepart'}
                  </Button>
                </motion.div>
              </Form>
            </Card.Body>
          </Card>
        </Container>
      </motion.div>
    </div>
  );
};

export default AddSparepart;

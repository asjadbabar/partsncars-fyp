import React, { useEffect, useState } from 'react';
import { Card, Button, Modal, Form, Container, Row, Col, Badge, Alert } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updatedData, setUpdatedData] = useState({ phone: '', email: '' });
  const [error, setError] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/admin/users', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
      else { setUsers([]); setError(true); }
    } catch (err) {
      console.error(err);
      setError(true);
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setUpdatedData({ phone: user.phone || '', email: user.email || '' });
    setShowModal(true);
  };

  const handleUpdate = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:5000/admin/update-user/${selectedUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updatedData),
    });
    const data = await res.json();
    if (res.ok) {
      fetchUsers();
      setShowModal(false);
      toast.success("User updated successfully", { position: 'top-right', autoClose: 2500, theme: 'dark' });
    } else {
      toast.error(data.error || 'Update failed', { position: 'top-right', autoClose: 2500, theme: 'dark' });
    }
  };

  return (
    <div className="app-page app-page--soft">
      <Container className="page-container">
        <ToastContainer />
        <motion.div className="page-header" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
          <div><span className="page-header__eyebrow">Administration</span><h1 className="page-title">Manage users</h1><p className="page-description">Review registered accounts and update contact information.</p></div>
          <span className="result-count">{users.length} users</span>
        </motion.div>

        {error ? <Alert variant="danger">Failed to load users</Alert>
          : users.length === 0 ? <div className="empty-state"><div><i className="bi bi-people"></i><h3>No users found</h3><p className="mb-0">Registered users will appear here.</p></div></div>
          : <Row xs={1} md={2} lg={3} className="g-4">
              {users.map((user) => (
                <Col key={user.id}>
                  <motion.div className="h-100" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    <Card className="user-card h-100"><Card.Body>
                      <div className="user-card__avatar">{user.name?.charAt(0)?.toUpperCase() || 'U'}</div>
                      <Card.Title>{user.name}</Card.Title>
                      <Card.Subtitle className="mb-3 text-muted">User ID <Badge bg="secondary">{user.id}</Badge></Card.Subtitle>
                      <Card.Text className="user-card__details"><span><i className="bi bi-envelope"></i>{user.email || 'N/A'}</span><span><i className="bi bi-telephone"></i>{user.phone || 'N/A'}</span></Card.Text>
                      <Button variant="outline-primary" size="sm" onClick={() => handleEditClick(user)}><i className="bi bi-pencil me-1"></i>Update info</Button>
                    </Card.Body></Card>
                  </motion.div>
                </Col>
              ))}
            </Row>}

        <Modal show={showModal} onHide={() => setShowModal(false)} centered>
          <Modal.Header closeButton><div><span className="page-header__eyebrow mb-1">User profile</span><Modal.Title>Update contact info</Modal.Title></div></Modal.Header>
          <Modal.Body><Form>
            <Form.Group className="mb-3"><Form.Label>Email</Form.Label><Form.Control type="email" value={updatedData.email} onChange={(e) => setUpdatedData({ ...updatedData, email: e.target.value })} /></Form.Group>
            <Form.Group><Form.Label>Phone</Form.Label><Form.Control type="text" value={updatedData.phone} onChange={(e) => setUpdatedData({ ...updatedData, phone: e.target.value })} /></Form.Group>
          </Form></Modal.Body>
          <Modal.Footer><Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button><Button variant="primary" onClick={handleUpdate}>Save changes</Button></Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
};

export default ManageUsers;

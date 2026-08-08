import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Signup = () => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match!");
      return;
    }
    try {
      const response = await fetch("http://localhost:5000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.name, email: formData.email, phone: formData.phone, password: formData.password })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage("Signup successful! Redirecting to login...");
        setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
        setTimeout(() => navigate('/Login'), 2000);
      } else {
        setErrorMessage(data.error || "Signup failed.");
      }
    } catch (error) {
      console.error("Error during signup:", error);
      setErrorMessage("Something went wrong. Please try again.");
    }
  };

  const fields = [
    { name: 'name', type: 'text', label: 'Full name', placeholder: 'Enter your full name', icon: 'bi-person' },
    { name: 'email', type: 'email', label: 'Email address', placeholder: 'you@example.com', icon: 'bi-envelope' },
    { name: 'phone', type: 'text', label: 'Phone number', placeholder: 'Enter your phone number', icon: 'bi-telephone' },
    { name: 'password', type: 'password', label: 'Password', placeholder: 'Create a password', icon: 'bi-lock' },
    { name: 'confirmPassword', type: 'password', label: 'Confirm password', placeholder: 'Repeat your password', icon: 'bi-shield-check' },
  ];

  return (
    <div className="auth-page auth-page--signup">
      <div className="auth-card">
        <div className="auth-card__header">
          <span className="auth-icon"><i className="bi bi-person-plus"></i></span>
          <span className="page-header__eyebrow">Join the marketplace</span>
          <h1>Create your account</h1>
          <p>Start buying, selling, and managing automotive listings.</p>
        </div>
        {successMessage && <div className="alert alert-success">{successMessage}</div>}
        {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}
        <form onSubmit={handleSubmit} autoComplete="off">
          {fields.map((field) => (
            <div className="mb-3" key={field.name}>
              <label className="form-label" htmlFor={field.name}>{field.label}</label>
              <div className="input-group">
                <span className="input-group-text"><i className={`bi ${field.icon}`}></i></span>
                <input id={field.name} type={field.type} name={field.name} className="form-control" placeholder={field.placeholder} value={formData[field.name]} onChange={handleChange} required />
              </div>
            </div>
          ))}
          <button type="submit" className="btn btn-primary w-100 mt-1">Create account <i className="bi bi-arrow-right ms-2"></i></button>
          <p className="auth-switch mb-0">Already have an account? <Link to="/Login">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
};

export default Signup;

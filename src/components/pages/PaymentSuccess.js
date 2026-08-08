import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const PaymentSuccess = () => {
  return (
    <div className="app-page success-page">
      <div className="success-card">
      <span className="success-card__icon"><CheckCircle size={38} /></span>
      <span className="page-header__eyebrow">Order confirmed</span>
      <h1>Payment successful</h1>
      <p>Thank you for your purchase. Your order has been placed successfully.</p>
      <Link
        to="/MyShoppings"
        className="btn btn-primary"
      >
        View my orders <i className="bi bi-arrow-right ms-2"></i>
      </Link>
      </div>
    </div>
  );
};

export default PaymentSuccess;

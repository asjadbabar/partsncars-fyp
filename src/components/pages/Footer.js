import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-5">
            <Link className="brand-mark mb-3" to="/">
              <span className="brand-icon"><i className="bi bi-car-front-fill"></i></span>
              <span>Parts<span className="text-danger">N</span>Cars</span>
            </Link>
            <p className="mb-0 pe-lg-5">
              A trusted marketplace for discovering cars, sourcing spare parts, and managing every transaction in one place.
            </p>
          </div>
          <div className="col-6 col-lg-3">
            <h5 className="mb-3">Marketplace</h5>
            <ul className="list-unstyled d-grid gap-2 mb-0">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/Home">Browse listings</Link></li>
              <li><Link to="/Cart">My cart</Link></li>
            </ul>
          </div>
          <div className="col-6 col-lg-4">
            <h5 className="mb-3">Your account</h5>
            <ul className="list-unstyled d-grid gap-2 mb-0">
              <li><Link to="/UserDashboard">Dashboard</Link></li>
              <li><Link to="/MyShoppings">Purchases</Link></li>
              <li><Link to="/MyOrders">Sales orders</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom d-flex flex-column flex-sm-row justify-content-between gap-2">
          <p className="mb-0">© {new Date().getFullYear()} PartsNCars. All rights reserved.</p>
          <p className="mb-0">Cars and parts, handled with confidence.</p>
        </div>
      </div>
    </footer>
  );
}

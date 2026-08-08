
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { jwtDecode } from 'jwt-decode';

const Navbar = () => {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [role, setRole] = useState(null);

  // Decode token to get role
  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setRole(decoded.role);
      } catch (err) {
        console.error('Invalid token:', err);
      }
    }
  }, [token]);

  // Close menu on window resize to large screen
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark fixed-top app-navbar">
      <div className="container">
        <Link className="navbar-brand fw-bold brand-mark" to="/">
          <span className="brand-icon"><i className="bi bi-car-front-fill"></i></span>
          <span>Parts<span className="text-danger">N</span>Cars</span>
        </Link>

        {/* Toggle button */}
        <button
          className="navbar-toggler border-0"
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <motion.div
            animate={menuOpen ? { rotate: 90 } : { rotate: 0 }}
            transition={{ duration: 0.3 }}
          >
            <i className="bi bi-list fs-2 text-light"></i>
          </motion.div>
        </button>

        {/* Menu */}
        <div className={`collapse navbar-collapse ${menuOpen ? 'show' : ''}`} id="navbarContent">
          <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-3 mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} to="/" onClick={() => setMenuOpen(false)}>
                <i className="bi bi-house-door me-1"></i> Home
              </Link>
            </li>

            

            {token ? (
              <>
                <li className="nav-item">
                  <Link
                    className={`nav-link ${location.pathname === '/Home' ? 'active' : ''}`}
                    to="/Home"
                    onClick={() => setMenuOpen(false)}
                  >
                    <i className="bi bi-list-check me-1"></i> Listing
                  </Link>
                </li>

                <li className="nav-item">
                  <Link
                    className={`nav-link ${location.pathname === '/UserDashboard' ? 'active' : ''}`}
                    to="/UserDashboard"
                    onClick={() => setMenuOpen(false)}
                  >
                    <i className="bi bi-speedometer2 me-1"></i> Dashboard
                  </Link>
                </li>

               <li className="nav-item">
                  <Link
                    to="/Cart"
                    className={`nav-link ${location.pathname === '/Cart' ? 'active' : ''}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    <i
                      className="bi bi-cart-fill me-1"
                    ></i>
                    Cart
                  </Link>
                </li>
                {/* ✅ Admin Panel button only for admin users */}
                {role === 'admin' && (
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${location.pathname === '/AdminPanel' ? 'active' : ''}`}
                      to="/AdminPanel"
                      onClick={() => setMenuOpen(false)}
                    >
                      <i className="bi bi-person-gear me-1"></i> Admin Panel
                    </Link>
                  </li>
                )}

               

                <li className="nav-item">
                  <button
                    className="btn px-3"
                    onClick={() => {
                      handleLogout();
                      setMenuOpen(false);
                    }}
                  >
                    <i className="bi bi-box-arrow-right me-1"></i> Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link
                    className="nav-link"
                    to="/Login"
                    onClick={() => setMenuOpen(false)}
                  >
                    <i className="bi bi-box-arrow-in-right me-1"></i> Login
                  </Link>
                </li>

                <li className="nav-item">
                  <Link
                    className="btn nav-primary px-3"
                    to="/Signup"
                    onClick={() => setMenuOpen(false)}
                  >
                    <i className="bi bi-person-plus-fill me-1"></i> SignUp
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

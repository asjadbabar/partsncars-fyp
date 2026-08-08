
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'animate.css';

const AllProductsAdmin = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notified, setNotified] = useState(false); // prevent duplicate toasts

  useEffect(() => {
    const fetchProducts = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('http://localhost:5000/admin/products', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        const fetchedProducts = data.products || [];
        setProducts(fetchedProducts);

        // Show toast for low stock spare parts only once
        if (!notified) {
          fetchedProducts.forEach(prod => {
            if (prod.category === 'spare_part' && prod.quantity < 10) {
              toast.warn(`Low stock alert: "${prod.title}" has only ${prod.quantity} left!`, {
                position: 'top-right',
                autoClose: 5000,
              });
            }
          });
          setNotified(true);
        }
      } catch (err) {
        console.error('Error fetching admin products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [notified]);

  return (
    <div className="app-page app-page--soft">
    <div className="page-container">
      <ToastContainer />
      <div className="page-header animate__animated animate__fadeInDown">
        <div><span className="page-header__eyebrow">Inventory</span><h1 className="page-title">Product stock</h1><p className="page-description">Review every marketplace listing and identify inventory that needs attention.</p></div>
        <span className="result-count">{products.length} products</span>
      </div>

      {loading ? (
        <div className="loading-panel">
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      ) : (
        products.length === 0 ? <div className="empty-state"><div><i className="bi bi-boxes"></i><h3>No products found</h3><p className="mb-0">Inventory will appear here when products are listed.</p></div></div> :
        <div className="table-shell animate__animated animate__fadeInUp">
          <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr className="text-center align-middle">
                <th><i className="bi bi-tag-fill"></i> Title</th>
                <th><i className="bi bi-layers-half"></i> Category</th>
                <th><i className="bi bi-cash-coin"></i> Price</th>
                <th><i className="bi bi-box-seam"></i> Quantity</th>
                <th><i className="bi bi-person-circle"></i> Listed By</th>
                <th><i className="bi bi-clock-history"></i> Created At</th>
              </tr>
            </thead>
            <tbody>
              {products.map((prod, index) => (
                <tr key={prod.id} className="align-middle animate__animated animate__fadeIn animate__faster" style={{ animationDelay: `${index * 0.05}s` }}>
                  <td className="fw-semibold">
                    {prod.title}
                    {prod.category === 'spare_part' && prod.quantity < 10 && (
                      <span className="badge bg-danger">Low Stock</span>
                    )}
                  </td>
                  <td>
                      <span className="badge bg-secondary text-capitalize">
                      {prod.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-success fw-bold">PKR {prod.price}</td>
                  <td>
                    {prod.quantity > 0 ? (
                      <span className="text-primary fw-semibold">
                        {prod.quantity}
                      </span>
                    ) : (
                      <span className="text-danger fw-semibold">
                        <i className="bi bi-x-circle-fill me-1"></i>Out of stock
                      </span>
                    )}
                  </td>
                  <td>
                    <div>
                      <strong>{prod.user?.name || 'Unknown'}</strong>
                      <br />
                      <small className="text-muted">{prod.user?.email || 'N/A'}</small>
                    </div>
                  </td>
                  <td className="text-muted">
                    {new Date(prod.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default AllProductsAdmin;

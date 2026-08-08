import React, { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

const AdminManageOrders = () => {
  const [orders, setOrders] = useState([]);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [updatedStatus, setUpdatedStatus] = useState("");
  const [search, setSearch] = useState("");

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/admin/orders", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to fetch orders.");
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleEdit = (orderId, currentStatus) => {
    setEditingOrderId(orderId);
    setUpdatedStatus(currentStatus);
  };

  const handleSave = async (orderId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/admin/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ payment_status: updatedStatus })
      });

      if (res.ok) {
        toast.success("Payment status updated.");
        setEditingOrderId(null);
        fetchOrders();
      } else {
        toast.error("Failed to update status.");
      }
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Something went wrong.");
    }
  };

  const filteredOrders = orders.filter(order =>
    order.id.toString().includes(search) ||
    order.user_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app-page app-page--soft">
    <div className="page-container">
      <ToastContainer />
      <div className="page-header"><div><span className="page-header__eyebrow">Transactions</span><h1 className="page-title">Manage order payments</h1><p className="page-description">Search orders and keep payment statuses accurate and up to date.</p></div><span className="result-count">{filteredOrders.length} orders</span></div>

      <div className="filter-panel">
        <label className="form-label" htmlFor="orderSearch">Search orders</label>
        <div className="input-group">
        <span className="input-group-text"><i className="bi bi-search"></i></span>
        <input
          id="orderSearch"
          type="text"
          className="form-control"
          placeholder="Search by Order ID or User Name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="empty-state"><div><i className="bi bi-receipt"></i><h3>No orders to display</h3><p className="mb-0">Try a different search or check back when new orders arrive.</p></div></div>
      ) : (
        <div className="table-shell"><div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>User(buyer)</th>
                <th>Total Amount</th>
                <th>Payment Status</th>
                <th>Order Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.user_name}</td>
                  <td>PKR {parseFloat(order.total_amount || 0).toFixed(2)}</td>

                  <td>
                    {editingOrderId === order.id ? (
                      <select
                        className="form-select"
                        value={updatedStatus}
                        onChange={(e) => setUpdatedStatus(e.target.value)}
                      >
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        
                      </select>
                    ) : (
                      <span className={`badge bg-${order.payment_status === 'completed' ? 'success' : 'warning'} text-capitalize`}>
                        {order.payment_status}
                      </span>
                    )}
                  </td>
                  <td><span className="badge bg-secondary text-capitalize">{order.order_status}</span></td>
                  <td>{new Date(order.created_at).toLocaleString()}</td>
                  <td>
                    {editingOrderId === order.id ? (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleSave(order.id)}
                      >
                        Save
                      </button>
                    ) : (
                      <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleEdit(order.id, order.payment_status)}
                        disabled={order.payment_status === 'completed'}

                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      )}
    </div>
    </div>
  );
};

export default AdminManageOrders;

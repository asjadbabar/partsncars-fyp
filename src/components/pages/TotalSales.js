import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'bootstrap-icons/font/bootstrap-icons.css';

const TotalSales = () => {
  const [userSales, setUserSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDay, setSelectedDay] = useState('');

  useEffect(() => {
    const fetchUserSales = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      const queryParam = selectedDay ? `?day=${selectedDay}` : selectedMonth ? `?month=${selectedMonth}` : '';
      try {
        const res = await fetch(`http://localhost:5000/admin/user-sales${queryParam}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setUserSales(data || []);
      } catch (err) {
        console.error('Error fetching user sales:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserSales();
  }, [selectedMonth, selectedDay]);

  const toggleExpand = (userId) => setExpandedUserId(prev => prev === userId ? null : userId);
  const totalPlatformSales = userSales.reduce((sum, user) => sum + user.totalSales, 0);

  const downloadSummaryCSV = () => {
    const rows = [['User Name', 'Email', 'Total Orders', 'Total Sales']];
    userSales.forEach(user => rows.push([user.name, user.email, user.totalOrders, user.totalSales]));
    rows.push([]);
    rows.push(['', '', 'Total Platform Sales', totalPlatformSales.toFixed(2)]);
    const csvContent = rows.map(r => r.map(String).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user_sales_summary${selectedDay ? `_${selectedDay}` : selectedMonth ? `_${selectedMonth}` : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSummaryPDF = () => {
    const doc = new jsPDF();
    doc.text('User Sales Summary Report', 14, 15);
    autoTable(doc, {
      startY: 25,
      head: [['User Name', 'Email', 'Total Orders', 'Total Sales']],
      body: userSales.map(user => [user.name, user.email, user.totalOrders, user.totalSales.toFixed(2)])
    });
    doc.text(`Total Platform Sales (PKR): ${totalPlatformSales.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 10);
    doc.save(`user_sales_summary${selectedDay ? `_${selectedDay}` : selectedMonth ? `_${selectedMonth}` : ''}.pdf`);
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(i);
    return { value: `${new Date().getFullYear()}-${String(i + 1).padStart(2, '0')}`, label: date.toLocaleString('default', { month: 'long' }) };
  });

  return (
    <div className="app-page app-page--soft reports-page">
      <div className="page-container">
        <div className="page-header">
          <div><span className="page-header__eyebrow">Platform performance</span><h1 className="page-title">User sales overview</h1><p className="page-description">Analyze seller activity by month or day and export summary reports.</p></div>
          <div className="report-actions"><button className="btn btn-outline-success" onClick={downloadSummaryCSV}><i className="bi bi-download me-2"></i>CSV</button><button className="btn btn-outline-danger" onClick={downloadSummaryPDF}><i className="bi bi-file-earmark-pdf me-2"></i>PDF</button></div>
        </div>

        <div className="filter-panel report-filter report-filter--wide">
          <div><label className="form-label" htmlFor="salesMonth">Filter by month</label><select id="salesMonth" className="form-select" value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); setSelectedDay(''); }}><option value="">All time</option>{monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label} {new Date().getFullYear()}</option>)}</select></div>
          <span className="filter-separator">or</span>
          <div><label className="form-label" htmlFor="salesDay">Filter by day</label><input id="salesDay" type="date" className="form-control" value={selectedDay} onChange={(e) => { setSelectedDay(e.target.value); setSelectedMonth(''); }} max={new Date().toISOString().split('T')[0]} /></div>
        </div>

        <div className="report-total report-total--primary"><span>Total platform sales</span><strong>PKR {totalPlatformSales.toFixed(2)}</strong></div>

        {loading ? <div className="loading-panel"><div className="spinner-border" role="status"></div></div>
          : userSales.length === 0 ? <div className="empty-state"><div><i className="bi bi-graph-up"></i><h3>No sales data</h3><p className="mb-0">No sales are available for the selected period.</p></div></div>
          : <div className="d-grid gap-3">{userSales.map(user => (
              <div key={user.userId} className="sales-user-card">
                <div className="sales-user-card__summary">
                  <div className="sales-user-card__identity"><span>{user.name?.charAt(0)?.toUpperCase() || 'U'}</span><div><h2>{user.name}</h2><p><i className="bi bi-envelope me-1"></i>{user.email}</p></div></div>
                  <div className="sales-user-card__value"><strong>PKR {Number(user.totalSales).toLocaleString()}</strong><span>{user.totalOrders} orders</span></div>
                  {user.orders?.length > 0 && <button className="btn btn-outline-primary btn-sm" onClick={() => toggleExpand(user.userId)}>{expandedUserId === user.userId ? 'Hide orders' : 'View orders'}<i className={`bi bi-chevron-${expandedUserId === user.userId ? 'up' : 'down'} ms-2`}></i></button>}
                </div>
                {expandedUserId === user.userId && <div className="sales-order-list"><h3>Order details</h3>{user.orders.map((order, idx) => <div key={idx}><div><strong>{order.productTitle}</strong><span>{new Date(order.createdAt).toLocaleDateString()}</span></div><span>{order.quantity} × PKR {order.price}</span></div>)}</div>}
              </div>
            ))}</div>}
      </div>
    </div>
  );
};

export default TotalSales;

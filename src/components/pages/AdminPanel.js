import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Card, Button, Spinner } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import 'react-toastify/dist/ReactToastify.css';

const socket = io('http://localhost:5000');

const formatCurrency = (value) => `PKR ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const SalesTrendChart = ({ data }) => {
  const width = 640;
  const height = 220;
  const padding = { top: 20, right: 18, bottom: 36, left: 18 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...data.map((point) => point.value), 1);
  const points = data.map((point, index) => ({
    ...point,
    x: padding.left + (index * chartWidth) / Math.max(data.length - 1, 1),
    y: padding.top + chartHeight - (point.value / maxValue) * chartHeight,
  }));
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `${padding.left},${padding.top + chartHeight} ${polyline} ${padding.left + chartWidth},${padding.top + chartHeight}`;

  return (
    <div className="sales-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monthly sales revenue chart">
        {[0, 1, 2, 3].map((line) => {
          const y = padding.top + (chartHeight * line) / 3;
          return <line key={line} x1={padding.left} y1={y} x2={width - padding.right} y2={y} className="sales-chart__grid" />;
        })}
        <polygon points={area} className="sales-chart__area" />
        <polyline points={polyline} className="sales-chart__line" />
        {points.map((point) => (
          <g key={point.key}>
            <circle cx={point.x} cy={point.y} r="5" className="sales-chart__point"><title>{point.label}: {formatCurrency(point.value)}</title></circle>
            <text x={point.x} y={height - 10} textAnchor="middle" className="sales-chart__label">{point.shortLabel}</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const ProgressRow = ({ label, value, total, tone = 'primary' }) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="chart-progress">
      <div><span>{label}</span><strong>{value} <small>{percentage}%</small></strong></div>
      <div className="chart-progress__track"><span className={`chart-progress__fill chart-progress__fill--${tone}`} style={{ width: `${percentage}%` }}></span></div>
    </div>
  );
};

const AdminPanel = () => {
  const [summary, setSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [userSales, setUserSales] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const navigate = useNavigate();

  const fetchDashboard = useCallback(async (showError = true) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [summaryRes, productsRes, salesRes, ordersRes] = await Promise.all([
        fetch('http://localhost:5000/admin/summary', { headers }),
        fetch('http://localhost:5000/admin/products', { headers }),
        fetch('http://localhost:5000/admin/user-sales', { headers }),
        fetch('http://localhost:5000/admin/orders', { headers }),
      ]);

      if (![summaryRes, productsRes, salesRes, ordersRes].every((response) => response.ok)) {
        throw new Error('One or more dashboard requests failed');
      }

      const [summaryData, productsData, salesData, ordersData] = await Promise.all([
        summaryRes.json(), productsRes.json(), salesRes.json(), ordersRes.json()
      ]);
      setSummary(summaryData || {});
      setProducts(productsData?.products || []);
      setUserSales(Array.isArray(salesData) ? salesData : []);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch admin dashboard:', err);
      if (showError) toast.error('Failed to load dashboard analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const refreshDashboard = () => fetchDashboard(false);
    socket.on('update-summary', refreshDashboard);
    socket.on('product_added', refreshDashboard);
    socket.on('product_deleted', refreshDashboard);
    socket.on('product-sold', refreshDashboard);
    return () => {
      socket.off('update-summary', refreshDashboard);
      socket.off('product_added', refreshDashboard);
      socket.off('product_deleted', refreshDashboard);
      socket.off('product-sold', refreshDashboard);
    };
  }, [fetchDashboard]);

  const analytics = useMemo(() => {
    const salesItems = userSales.flatMap((user) => (user.orders || []).map((order) => ({ ...order, seller: user.name })));
    const validDates = salesItems.map((item) => new Date(item.createdAt)).filter((date) => !Number.isNaN(date.getTime()));
    const anchor = validDates.length ? new Date(Math.max(...validDates.map((date) => date.getTime()))) : new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(anchor.getFullYear(), anchor.getMonth() - (5 - index), 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const value = salesItems.reduce((sum, item) => {
        const itemDate = new Date(item.createdAt);
        const itemKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
        return itemKey === key ? sum + Number(item.quantity || 0) * Number(item.price || 0) : sum;
      }, 0);
      return { key, value, label: date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), shortLabel: date.toLocaleDateString(undefined, { month: 'short' }) };
    });

    const topSellers = [...userSales].sort((a, b) => Number(b.totalSales) - Number(a.totalSales)).slice(0, 5);
    const lowStockProducts = products.filter((product) => product.category === 'spare_part' && Number(product.quantity) < 10).sort((a, b) => Number(a.quantity) - Number(b.quantity));
    const recentOrders = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
    const completedPayments = orders.filter((order) => order.payment_status === 'completed' || order.payment_status === 'paid').length;
    const pendingPayments = orders.filter((order) => !order.payment_status || order.payment_status === 'pending').length;
    const completedOrders = orders.filter((order) => ['completed', 'delivered', 'shipped'].includes(order.order_status)).length;
    const pendingOrders = orders.filter((order) => order.order_status === 'pending').length;
    const cancelledOrders = orders.filter((order) => order.order_status === 'cancelled').length;
    const totalRevenue = Number(summary?.totalRevenue || 0);
    return { salesItems, months, topSellers, lowStockProducts, recentOrders, completedPayments, pendingPayments, completedOrders, pendingOrders, cancelledOrders, totalRevenue, averageOrder: orders.length ? totalRevenue / orders.length : 0 };
  }, [orders, products, summary, userSales]);

  if (loading) return <div className="app-page loading-state"><Spinner animation="border" /></div>;

  const inventoryTotal = Number(summary?.totalCars || 0) + Number(summary?.totalSpareParts || 0);
  const carShare = inventoryTotal ? Math.round((Number(summary?.totalCars || 0) / inventoryTotal) * 100) : 0;
  const topSellerMax = Math.max(...analytics.topSellers.map((seller) => Number(seller.totalSales)), 1);
  const metrics = [
    { label: 'Platform revenue', value: formatCurrency(analytics.totalRevenue), icon: 'bi-graph-up-arrow', note: `${orders.length} total orders` },
    { label: 'Registered users', value: Number(summary?.totalUsers || 0).toLocaleString(), icon: 'bi-people', note: `${userSales.length} active sellers` },
    { label: 'Available inventory', value: inventoryTotal.toLocaleString(), icon: 'bi-boxes', note: `${analytics.lowStockProducts.length} low-stock items` },
    { label: 'Average order', value: formatCurrency(analytics.averageOrder), icon: 'bi-receipt', note: 'Based on current orders' },
  ];

  const actions = [
    { title: 'Manage users', description: 'Review and update registered user information.', icon: 'bi-people', button: 'View users', route: '/ManageUsers' },
    { title: 'Track inventory', description: 'Monitor quantities and identify low-stock spare parts.', icon: 'bi-boxes', button: 'View stock', route: '/TrackStock' },
    { title: 'Sales reports', description: 'Review performance and export platform sales reports.', icon: 'bi-bar-chart', button: 'Open reports', route: '/AllUsersSales' },
    { title: 'Order transactions', description: 'Review orders and manage current payment statuses.', icon: 'bi-credit-card', button: 'Manage orders', route: '/AllOrdersTransactions' },
  ];

  return (
    <div className="app-page app-page--soft admin-dashboard">
      <Container className="page-container">
        <ToastContainer />
        <motion.div className="page-header" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
          <div><span className="page-header__eyebrow">Administration</span><h1 className="page-title">Platform overview</h1><p className="page-description">Live marketplace activity, revenue, inventory, and order performance from your existing admin APIs.</p></div>
          <div className="admin-header-actions"><span className="live-indicator"><span></span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Live overview'}</span><Button variant="outline-primary" size="sm" onClick={() => fetchDashboard()}><i className="bi bi-arrow-clockwise me-2"></i>Refresh</Button></div>
        </motion.div>

        <Row className="g-3 mb-4">
          {metrics.map((metric) => <Col sm={6} xl={3} key={metric.label}><Card className="admin-metric admin-metric--compact h-100"><Card.Body><span className="metric-card__icon"><i className={`bi ${metric.icon}`}></i></span><div><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small></div></Card.Body></Card></Col>)}
        </Row>

        <Row className="g-4 mb-4">
          <Col xl={8}>
            <Card className="analytics-card h-100"><Card.Body>
              <div className="analytics-card__header"><div><h2>Revenue trend</h2><p>Sales value grouped by month from seller order data.</p></div><strong>{formatCurrency(analytics.months.reduce((sum, month) => sum + month.value, 0))}</strong></div>
              <SalesTrendChart data={analytics.months} />
            </Card.Body></Card>
          </Col>
          <Col xl={4}>
            <Card className="analytics-card h-100"><Card.Body>
              <div className="analytics-card__header"><div><h2>Inventory mix</h2><p>Current available marketplace listings.</p></div></div>
              <div className="inventory-chart">
                <div className="inventory-donut" style={{ '--car-share': `${carShare * 3.6}deg` }}><div><strong>{inventoryTotal}</strong><span>Listings</span></div></div>
                <div className="inventory-legend"><div><span className="legend-dot legend-dot--cars"></span><p>Cars<strong>{summary?.totalCars || 0} · {carShare}%</strong></p></div><div><span className="legend-dot legend-dot--parts"></span><p>Spare parts<strong>{summary?.totalSpareParts || 0} · {100 - carShare}%</strong></p></div><div><span className="legend-dot legend-dot--sold"></span><p>Items sold<strong>{Number(summary?.totalCarsSold || 0) + Number(summary?.totalSparePartsSold || 0)}</strong></p></div></div>
              </div>
            </Card.Body></Card>
          </Col>
        </Row>

        <Row className="g-4 mb-4">
          <Col lg={6}>
            <Card className="analytics-card h-100"><Card.Body>
              <div className="analytics-card__header"><div><h2>Top sellers</h2><p>Ranked by total sales value.</p></div><Button variant="link" size="sm" onClick={() => navigate('/AllUsersSales')}>Full report<i className="bi bi-arrow-right ms-1"></i></Button></div>
              {analytics.topSellers.length ? <div className="seller-chart">{analytics.topSellers.map((seller, index) => <div className="seller-chart__row" key={seller.userId}><span>{index + 1}</span><div><div><strong>{seller.name}</strong><small>{formatCurrency(seller.totalSales)}</small></div><div className="seller-chart__track"><span style={{ width: `${Math.max((Number(seller.totalSales) / topSellerMax) * 100, 4)}%` }}></span></div></div></div>)}</div> : <div className="chart-empty"><i className="bi bi-bar-chart"></i><span>No seller sales yet</span></div>}
            </Card.Body></Card>
          </Col>
          <Col lg={6}>
            <Card className="analytics-card h-100"><Card.Body>
              <div className="analytics-card__header"><div><h2>Order health</h2><p>Current order and payment distribution.</p></div><Button variant="link" size="sm" onClick={() => navigate('/AllOrdersTransactions')}>Manage<i className="bi bi-arrow-right ms-1"></i></Button></div>
              <div className="health-groups"><div><h3>Orders</h3><ProgressRow label="Completed / shipped" value={analytics.completedOrders} total={orders.length} tone="success" /><ProgressRow label="Pending" value={analytics.pendingOrders} total={orders.length} tone="warning" /><ProgressRow label="Cancelled" value={analytics.cancelledOrders} total={orders.length} tone="danger" /></div><div><h3>Payments</h3><ProgressRow label="Completed" value={analytics.completedPayments} total={orders.length} tone="success" /><ProgressRow label="Pending" value={analytics.pendingPayments} total={orders.length} tone="warning" /></div></div>
            </Card.Body></Card>
          </Col>
        </Row>

        <Row className="g-4 mb-5">
          <Col lg={7}>
            <Card className="analytics-card h-100"><Card.Body>
              <div className="analytics-card__header"><div><h2>Recent orders</h2><p>Latest transactions received by the platform.</p></div></div>
              {analytics.recentOrders.length ? <div className="activity-list">{analytics.recentOrders.map((order) => <div className="activity-item" key={order.id}><span className="activity-item__icon"><i className="bi bi-receipt"></i></span><div><strong>Order #{order.id}</strong><p>{order.user_name || 'Unknown buyer'} · {new Date(order.created_at).toLocaleDateString()}</p></div><div><strong>{formatCurrency(order.total_amount)}</strong><span className={`badge ${order.payment_status === 'completed' || order.payment_status === 'paid' ? 'bg-success' : 'bg-warning'} text-capitalize`}>{order.payment_status || 'pending'}</span></div></div>)}</div> : <div className="chart-empty"><i className="bi bi-receipt"></i><span>No recent orders</span></div>}
            </Card.Body></Card>
          </Col>
          <Col lg={5}>
            <Card className="analytics-card h-100"><Card.Body>
              <div className="analytics-card__header"><div><h2>Stock attention</h2><p>Spare parts with fewer than 10 units.</p></div><Button variant="link" size="sm" onClick={() => navigate('/TrackStock')}>View stock<i className="bi bi-arrow-right ms-1"></i></Button></div>
              {analytics.lowStockProducts.length ? <div className="stock-list">{analytics.lowStockProducts.slice(0, 5).map((product) => <div key={product.id}><span className="stock-list__icon"><i className="bi bi-exclamation-triangle"></i></span><div><strong>{product.title}</strong><p>{product.user?.name || 'Unknown seller'}</p></div><span className={`badge ${Number(product.quantity) === 0 ? 'bg-danger' : 'bg-warning'}`}>{product.quantity} left</span></div>)}</div> : <div className="chart-empty chart-empty--success"><i className="bi bi-check-circle"></i><span>Stock levels look healthy</span></div>}
            </Card.Body></Card>
          </Col>
        </Row>

        <div className="section-heading-inline"><div><h2 className="section-title">Management tools</h2><p>Common administration tasks and reporting.</p></div></div>
        <Row className="g-4">
          {actions.map((action) => <Col md={6} key={action.title}><Card className="admin-action h-100"><Card.Body><span className="admin-action__icon"><i className={`bi ${action.icon}`}></i></span><div className="flex-grow-1"><h3>{action.title}</h3><p>{action.description}</p><Button variant="outline-primary" size="sm" onClick={() => navigate(action.route)}>{action.button}<i className="bi bi-arrow-right ms-2"></i></Button></div></Card.Body></Card></Col>)}
        </Row>
      </Container>
    </div>
  );
};

export default AdminPanel;

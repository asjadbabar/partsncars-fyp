//sales reports for individual listers(users)
import React, { useEffect, useState } from 'react';
import { Container, Table, Button, Form, Spinner } from 'react-bootstrap';
import { CSVLink } from 'react-csv';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SalesReport = () => {
  const [items, setItems] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchReport = async (selectedMonth) => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:5000/sales-report?month=${selectedMonth}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        setItems(data.items || []);
      } catch (err) {
        console.error('Failed to load product sales details:', err);
      }
      setLoading(false);
    };

    fetchReport(month);
  }, [month,token]);

  const totalSales = items.reduce((sum, row) => sum + Number(row.total_price || 0), 0);

  const csvHeaders = [
    { label: 'Product', key: 'product' },
    { label: 'Quantity', key: 'quantity' },
    { label: 'Unit Price', key: 'price' },
    { label: 'Total Price', key: 'total_price' },
    { label: 'Status', key: 'item_status' },
    { label: 'Payment Status', key: 'payment_status' },
    { label: 'Order Date', key: 'created_at' },
  ];

  const handlePDFDownload = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Sales Report - ${month}`, 14, 15);

    const tableData = items.map(item => [
      item.product,
      item.quantity,
      `PKR ${Number(item.price).toFixed(2)}`,
      `PKR ${Number(item.total_price).toFixed(2)}`,
      item.item_status,
      item.payment_status,
      new Date(item.created_at).toLocaleDateString(),
    ]);

    autoTable(doc, {
      head: [['Product', 'Qty', 'Price', 'Total', 'Status', 'Payment', 'Date']],
      body: tableData,
      startY: 25,
    });

    doc.text(`Total Sales: PKR ${totalSales.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 10);
    doc.save(`sales-report-${month}.pdf`);
  };

  return (
    <div className="app-page app-page--soft reports-page">
      <Container className="page-container">
        <div className="page-header"><div><span className="page-header__eyebrow">Performance</span><h1 className="page-title">Product sales report</h1><p className="page-description">Review monthly sales and export a detailed record for your listings.</p></div><div className="report-actions"><CSVLink data={items} headers={csvHeaders} filename={`sales-details-${month}.csv`} className="btn btn-outline-success"><i className="bi bi-download me-2"></i>CSV</CSVLink><Button variant="outline-danger" onClick={handlePDFDownload}><i className="bi bi-file-earmark-pdf me-2"></i>PDF</Button></div></div>

        <div className="filter-panel report-filter"><Form.Group controlId="monthSelect">
          <Form.Label>Select month</Form.Label>
          <Form.Control
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </Form.Group></div>

        {loading ? (
          <div className="loading-panel"><Spinner animation="border" /></div>
        ) : items.length === 0 ? (
          <div className="empty-state"><div><i className="bi bi-bar-chart"></i><h3>No sales data</h3><p className="mb-0">No completed sales were found for {month}.</p></div></div>
        ) : (
          <>
            <div className="table-shell"><Table striped hover responsive>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price (PKR)</th>
                  <th>Total (PKR)</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.product}</td>
                    <td>{item.quantity}</td>
                    <td>{Number(item.price).toFixed(2)}</td>
                    <td>{Number(item.total_price).toFixed(2)}</td>
                    <td><span className={`badge ${item.item_status === 'pending' ? 'bg-warning' : 'bg-success'} text-capitalize`}>{item.item_status}</span></td>
                    <td><span className={`badge ${item.payment_status === 'paid' || item.payment_status === 'completed' ? 'bg-success' : 'bg-warning'} text-capitalize`}>{item.payment_status}</span></td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table></div>

            <div className="report-total"><span>Total sales for {month}</span><strong>PKR {totalSales.toFixed(2)}</strong></div>
          </>
        )}
      </Container>
    </div>
  );
};

export default SalesReport;

import { Routes, Route } from 'react-router-dom';
import './App.css';

import Navbar from './components/pages/Navbar';
import LandingPage from './components/pages/LandingPage';
import Login from './components/pages/Login';
import Signup from './components/pages/Signup';
import UserDashboard from './components/pages/UserDashboard';
import Home from './components/pages/Home';
import UpdateProduct from './components/pages/UpdateProduct';
import Cart from './components/pages/CartPage';
import AddCar from './components/pages/AddCar.js';
import AddSparepart from './components/pages/AddSparepart';
import Checkout from './components/pages/Checkout.js';
import MyShoppings from './components/pages/MyShoppings.js';
import MyOrders from './components/pages/MyOrders.js';
import Product from './components/pages/Product';
import MyReports from './components/pages/MyReports.js';
import PaymentSuccess from './components/pages/PaymentSuccess.js';
import AdminPanel from './components/pages/AdminPanel';
import AllProductsAdmin from './components/pages/AllProductsAdmin.js';
import TotalSales from './components/pages/TotalSales.js';
import ManageUsers from './components/pages/ManageUsers.js';
import AdminManageOrders from './components/pages/AdminManageOrders.js';
import Footer from './components/pages/Footer.js';

const App = () => {
  return (
    <>
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/Login" element={<Login />} />
          <Route path="/Signup" element={<Signup />} />
          <Route path="/Home" element={<Home />} />
          <Route path="/UserDashboard" element={<UserDashboard />} />
          <Route path="/AddSparepart" element={<AddSparepart />} />
          <Route path="/AddCar" element={<AddCar />} />
          <Route path="/UpdateProduct/:id" element={<UpdateProduct />} />
          <Route path="/Cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/MyShoppings" element={<MyShoppings />} />
          <Route path="/MyOrders" element={<MyOrders />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/MyReports" element={<MyReports />} />
          <Route path="/PaymentSuccess" element={<PaymentSuccess />} />
          <Route path="/TrackStock" element={<AllProductsAdmin />} />
          <Route path="/AllUsersSales" element={<TotalSales />} />
          <Route path="/ManageUsers" element={<ManageUsers />} />
          <Route path="/AllOrdersTransactions" element={<AdminManageOrders />} />
          <Route path="/AdminPanel" element={<AdminPanel />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
};

export default App;

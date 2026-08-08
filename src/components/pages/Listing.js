import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const socket = io("http://localhost:5000");

const Listing = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchListings = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("http://localhost:5000/listing", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setProducts(data.products || []);
        setFilteredProducts(data.products || []);
      } catch (err) {
        console.error("Error fetching listings.", err);
        toast.error("Error fetching listings.", { position: 'top-right', theme: 'dark' });
      }
    };

    fetchListings();
    socket.on("product_added", fetchListings);
    socket.on("product_deleted", fetchListings);
    return () => {
      socket.off("product_added", fetchListings);
      socket.off("product_deleted", fetchListings);
    };
  }, []);

  useEffect(() => {
    let filtered = products;
    if (searchTerm.trim()) {
      filtered = filtered.filter((p) =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.price.toString().includes(searchTerm)
      );
    }
    if (selectedBrand) {
      filtered = filtered.filter((p) => p.brand && p.brand.toLowerCase() === selectedBrand.toLowerCase());
    }
    if (minPrice) filtered = filtered.filter((p) => p.price >= parseFloat(minPrice));
    if (maxPrice) filtered = filtered.filter((p) => p.price <= parseFloat(maxPrice));
    setFilteredProducts(filtered);
  }, [searchTerm, selectedBrand, minPrice, maxPrice, products]);

  const handleAddToCart = async (productId) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:5000/add-to-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product: productId })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Added to cart", { position: 'top-right', autoClose: 2500, theme: 'dark' });
      } else {
        toast.error(data.error || "Failed to add to cart.", { position: 'top-right', autoClose: 2500, theme: 'dark' });
      }
    } catch (err) {
      console.error("Add to cart error.", err);
      toast.error("Error adding to cart.", { position: 'top-right', autoClose: 2500, theme: 'dark' });
    }
  };

  const ProductCard = ({ product }) => (
    <article className="card product-card">
      <div className="product-card__media">
        {product.image ? (
          <img src={`http://localhost:5000${product.image}`} alt={product.title} />
        ) : (
          <i className="bi bi-image" aria-hidden="true"></i>
        )}
        <span className="product-card__category">{product.category === 'car' ? 'Car' : 'Spare part'}</span>
      </div>
      <div className="card-body d-flex flex-column">
        <div className="product-card__meta">{product.brand} · {product.model}</div>
        <h3 className="product-card__title">{product.title}</h3>
        <div className="product-card__price">PKR {Number(product.price).toLocaleString()}</div>
        {product.category === "spare_part" && (
          <div className={`stock-label ${product.quantity > 0 ? 'in-stock' : 'out-stock'}`}>
            <span className="status-dot"></span>{product.quantity > 0 ? `${product.quantity} in stock` : 'Out of stock'}
          </div>
        )}
        <div className="d-flex gap-2 mt-auto pt-3">
          <button className="btn btn-outline-primary btn-sm flex-grow-1" onClick={() => navigate(`/product/${product.id}`)}>
            <i className="bi bi-eye me-1"></i> View
          </button>
          {product.category === "spare_part" && (
            <button
              disabled={product.quantity <= 0}
              className={`btn btn-sm flex-grow-1 ${product.quantity > 0 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => product.quantity > 0 && handleAddToCart(product.id)}
            >
              <i className={`bi ${product.quantity > 0 ? 'bi-cart-plus' : 'bi-x-circle'} me-1`}></i>
              {product.quantity > 0 ? 'Add' : 'Unavailable'}
            </button>
          )}
        </div>
      </div>
    </article>
  );

  const cars = filteredProducts.filter((p) => p.category === "car");
  const parts = filteredProducts.filter((p) => p.category === "spare_part");

  const ProductSection = ({ title, icon, items, emptyText }) => (
    <section className="product-section">
      <div className="product-section__header">
        <div>
          <h2><i className={`bi ${icon} me-2`}></i>{title}</h2>
          <p>{items.length} {items.length === 1 ? 'listing' : 'listings'} available</p>
        </div>
      </div>
      {items.length ? (
        <div className="row g-4">
          {items.map((product) => (
            <div key={product.id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state"><div><i className="bi bi-search"></i><h3>No matches found</h3><p className="mb-0">{emptyText}</p></div></div>
      )}
    </section>
  );

  return (
    <div className="listing-content py-5">
      <ToastContainer />
      <div className="page-header">
        <div>
          <span className="page-header__eyebrow">Browse inventory</span>
          <h2 className="page-title">Explore the marketplace</h2>
          <p className="page-description">Search available vehicles and spare parts by keyword, brand, or price range.</p>
        </div>
        <span className="result-count">{filteredProducts.length} results</span>
      </div>

      <div className="filter-panel">
        <div className="filter-panel__title"><i className="bi bi-sliders"></i><span>Filter listings</span></div>
        <div className="row g-3">
          <div className="col-lg-4">
            <label className="form-label" htmlFor="listingSearch">Search</label>
            <div className="input-group">
              <span className="input-group-text"><i className="bi bi-search"></i></span>
              <input id="listingSearch" type="text" className="form-control" placeholder="Title, model, or price" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="col-sm-6 col-lg-3">
            <label className="form-label" htmlFor="brandFilter">Brand</label>
            <select id="brandFilter" className="form-select" value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
              <option value="">All brands</option>
              <option value="Suzuki">Suzuki</option><option value="Honda">Honda</option><option value="Toyota">Toyota</option><option value="Nissan">Nissan</option><option value="Hyundai">Hyundai</option>
            </select>
          </div>
          <div className="col-sm-6 col-lg">
            <label className="form-label" htmlFor="minPrice">Minimum price</label>
            <input id="minPrice" type="number" className="form-control" placeholder="PKR 0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          </div>
          <div className="col-sm-6 col-lg">
            <label className="form-label" htmlFor="maxPrice">Maximum price</label>
            <input id="maxPrice" type="number" className="form-control" placeholder="Any price" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </div>
        </div>
      </div>

      <ProductSection title="Cars" icon="bi-car-front" items={cars} emptyText="Try changing your search or price filters to find more cars." />
      <ProductSection title="Spare parts" icon="bi-tools" items={parts} emptyText="Try changing your search or price filters to find more spare parts." />
    </div>
  );
};

export default Listing;

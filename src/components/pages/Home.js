
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Listing from "./Listing";

const Home = () => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchListing = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setMessage("No token found. Please login.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("http://localhost:5000/home", {
          headers: {
            Authorization: `Bearer ${token}`, // ✅ fixed backticks
          },
        });

        const data = await response.json();

        if (response.ok) {
          setMessage(data.message);
        } else if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("token");
          navigate("/Login");
        }
      } catch (err) {
        console.error("Error fetching listing:", err);
        setMessage("Something went wrong.");
      }

      setLoading(false);
    };

    fetchListing();
  }, [navigate]);

  return (
    <>
    {loading ? <div className="app-page loading-state"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div>:
      <div className="marketplace-page">
        {/* Hero Section */}
        <section
          className="marketplace-hero"
        >
          <div className="container">
            <span className="hero-kicker">Marketplace</span>
            <h1>
              {message} to <span>PartsNCars</span>
            </h1>
            <p className="lead mt-3">
              Buy & sell car parts and vehicles effortlessly with trust and speed.
            </p>
            <a href="#listings" className="btn btn-light mt-3">
              Browse listings <i className="bi bi-arrow-down ms-2"></i>
            </a>
          </div>
        </section>


        {/* Listing Component */}
        <section
          id="listings"
          className="listing-section"
        >
          <div className="container">
            <Listing />
          </div>
        </section>
      </div>
}
    </>
  );
};

export default Home;

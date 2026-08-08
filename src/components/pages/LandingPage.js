import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import "animate.css";

const LandingPage = () => {
  const token = localStorage.getItem('token');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("animate__fadeInUp");
        });
      },
      { threshold: 0.3 }
    );

    document.querySelectorAll(".animate-on-scroll").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const features = [
    { title: "Fast & focused", icon: "bi bi-speedometer2", description: "Find the right listing quickly with practical search and filters." },
    { title: "Quality listings", icon: "bi bi-patch-check", description: "Browse cars and spare parts with the details you need to decide." },
    { title: "More choice", icon: "bi bi-grid", description: "Explore vehicles and components across popular brands and models." },
    { title: "Secure checkout", icon: "bi bi-shield-check", description: "Choose cash on delivery or a secure card checkout experience." },
    { title: "Simple selling", icon: "bi bi-tag", description: "List inventory and manage products, stock, and orders from one dashboard." },
    { title: "Order visibility", icon: "bi bi-box-seam", description: "Keep purchase and fulfillment statuses clear from order to delivery." },
  ];

  const testimonials = [
    { name: "Sarah A.", review: "Sold my car in just three days. The process was refreshingly straightforward." },
    { name: "Ali R.", review: "I found the right spare part quickly and checkout was simple." },
    { name: "Hamza K.", review: "A useful marketplace with good deals and clear product information." },
  ];

  return (
    <div className="landing-page">
      <header
        className="landing-hero text-white animate__animated animate__fadeIn"
        style={{
          backgroundImage: 'url("https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=1600")',
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="landing-hero__overlay"></div>
        <div className="container h-100 d-flex flex-column justify-content-center position-relative">
          <span className="hero-kicker">Pakistan's automotive marketplace</span>
          <h1>Find the right car.<br />Source every part.</h1>
          <p>Buy and sell vehicles and spare parts through one simple, trusted marketplace.</p>
          <Link to={token ? "/Home" : "/Login"} className="btn btn-danger btn-lg mt-3 align-self-start">
            Explore marketplace <i className="bi bi-arrow-right ms-2"></i>
          </Link>
        </div>
      </header>

      <section className="landing-section">
        <div className="container">
          <div className="section-heading text-center animate-on-scroll animate__animated">
            <span className="page-header__eyebrow">Built for better buying</span>
            <h2>Everything you need, without the friction</h2>
            <p>A focused marketplace experience designed for speed, confidence, and choice.</p>
          </div>
          <div className="row g-4">
            {features.map((feature) => (
              <div key={feature.title} className="col-lg-4 col-md-6 animate-on-scroll animate__animated">
                <div className="feature-card h-100">
                  <span className="feature-icon"><i className={feature.icon}></i></span>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--muted">
        <div className="container">
          <div className="section-heading text-center animate-on-scroll animate__animated">
            <span className="page-header__eyebrow">Trusted by drivers</span>
            <h2>Real experiences from our community</h2>
          </div>
          <div className="row g-4">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="col-lg-4 col-md-6 animate-on-scroll animate__animated">
                <div className="testimonial-card h-100">
                  <div className="testimonial-stars">★★★★★</div>
                  <p>“{testimonial.review}”</p>
                  <div className="testimonial-user">
                    <span>{testimonial.name.charAt(0)}</span>
                    <strong>{testimonial.name}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;

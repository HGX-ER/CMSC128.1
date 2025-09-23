import { useState } from "react";
import "./App.css";

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // 🔹 Replace your old handleSubmit with this one
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("✅ " + data.message);
      } else {
        alert("❌ " + data.message);
      }
    } catch (error) {
      console.error(error);
      alert("Server not reachable!");
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="card shadow-lg p-4" style={{ width: "400px" }}>
        {/* Logo + Header */}
        <div className="text-center mb-4">
          <div
            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3"
            style={{ width: "60px", height: "60px", fontSize: "30px" }}
          >
            ❤️
          </div>
          <h3 className="fw-bold">ED Management System</h3>
          <p className="text-muted small">
            Sign in to access the Emergency Department portal
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-dark w-100">
            Sign In
          </button>
        </form>

        {/* Demo credentials link */}
        <div className="text-center mt-3">
          <a href="#" className="small text-primary">
            View demo credentials
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;

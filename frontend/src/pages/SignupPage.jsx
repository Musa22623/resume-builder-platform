import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SignupPage = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });

  const onSubmit = async (e) => {
    e.preventDefault();
    await signup(form);
    navigate("/login");
  };

  return (
    <form onSubmit={onSubmit}>
      <h2>Sign Up</h2>
      <input placeholder="Username" onChange={(e) => setForm({ ...form, username: e.target.value })} />
      <input placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input type="password" placeholder="Password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <button type="submit">Create Account</button>
      <Link to="/login">Have account?</Link>
    </form>
  );
};

export default SignupPage;

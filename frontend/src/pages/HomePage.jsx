import { Link } from "react-router-dom";

const sectionStyle = {
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: 20,
  marginBottom: 16,
};

const HomePage = () => {
  return (
    <div style={{ maxWidth: 980, margin: "20px auto", padding: "0 12px" }}>
      <section style={sectionStyle} id="intro">
        <h1>Resume Builder Platform</h1>
        <p>
          Build job-tailored resumes using your existing resume, manual profile input, and AI optimization aligned to
          target job descriptions.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <Link to="/signup">Get Started Free</Link>
          <Link to="/login">Sign In</Link>
        </div>
      </section>

      <section style={sectionStyle} id="desktop">
        <h2>Download Desktop App</h2>
        <p>Use Resume Builder on desktop with secure login and direct API sync.</p>
        <ul>
          <li>Windows: Installer coming soon</li>
          <li>macOS: Installer coming soon</li>
          <li>Linux: AppImage coming soon</li>
        </ul>
      </section>

      <section style={sectionStyle} id="contact">
        <h2>Contact Us</h2>
        <p>Need help or have partnership requests?</p>
        <ul>
          <li>Email: support@resume-builder.local</li>
          <li>Admin chat is available after login from the app widget.</li>
        </ul>
      </section>

      <section style={sectionStyle} id="faq">
        <h2>FAQ</h2>
        <h4>Does AI change factual details?</h4>
        <p>No. AI only rewrites wording and keeps names, dates, companies, and education facts unchanged.</p>
        <h4>Can I pay with Stripe or crypto?</h4>
        <p>Yes. The payment page supports Stripe checkout and direct crypto payment with wallet QR code.</p>
        <h4>Can I use web and desktop together?</h4>
        <p>Yes. Desktop and web use the same backend account and data.</p>
      </section>
    </div>
  );
};

export default HomePage;

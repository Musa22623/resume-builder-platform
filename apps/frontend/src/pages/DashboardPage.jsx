import { useEffect, useState } from "react";
import api from "../services/api/client";

const DashboardPage = () => {
  const [trial, setTrial] = useState(null);

  useEffect(() => {
    api.get("/api/billing/trial/me/").then((res) => setTrial(res.data));
  }, []);

  return (
    <div>
      <h1>Resume Builder Dashboard</h1>
      <p>Trial remaining: {trial?.remaining_days ?? "..."} days</p>
    </div>
  );
};

export default DashboardPage;

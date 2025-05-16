import axios from "axios";
import { useEffect } from "react";
import CustomWidget from "./components/CustomWidget";

function App() {
  useEffect(() => {
    const localCountryCode = localStorage.getItem("countryCode");
    if (!localCountryCode) {
      const fetchIp = async () => {
        const res = await axios.get("https://ipapi.co/json/");
        localStorage.setItem("countryCode", res.data.country_calling_code);
        localStorage.setItem("countryName", res.data.country_name);
        localStorage.setItem("continentcode", res.data.country);
        localStorage.setItem("city", res.data.city);
      };
      fetchIp();
    }
  }, []);
  return <CustomWidget />;
}

export default App;

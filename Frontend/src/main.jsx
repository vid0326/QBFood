import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import StoreContextProvider from "./context/StoreContext.jsx";
import { FilterProvider } from "./context/FilterContext.jsx";

// #25: FilterProvider wraps StoreContext (which still provides Auth + Cart for backward compat)
// New features can useFilter() / useAuth() / useCart() directly for better performance
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <FilterProvider>
      <StoreContextProvider>
        <App />
      </StoreContextProvider>
    </FilterProvider>
  </BrowserRouter>
);

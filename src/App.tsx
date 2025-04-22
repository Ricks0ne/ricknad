import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Web3Provider } from "@/components/web3/Web3Provider";
import Layout from "@/components/layout/Layout";
import HomePage from "./pages/HomePage";
import ContractGenerator from "./pages/ContractGenerator";
import Explainer from "./pages/Explainer";
import Resources from "./pages/Resources";
import NotFound from "./pages/NotFound";

const App = () => (
  <Web3Provider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout><HomePage /></Layout>} />
          <Route path="/contract-generator" element={<Layout><ContractGenerator /></Layout>} />
          <Route path="/explainer" element={<Layout><Explainer /></Layout>} />
          <Route path="/resources" element={<Layout><Resources /></Layout>} />
          <Route path="*" element={<Layout><NotFound /></Layout>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </Web3Provider>
);

export default App;

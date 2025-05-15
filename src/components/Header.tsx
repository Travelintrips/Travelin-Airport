import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import UserDropdown from "./UserDropdown";
import { Button } from "./ui/button";

const Header = () => {
  const { isAuthenticated } = useAuth();

  return (
    <header className="bg-green-800 text-white py-4">
      <div className="container mx-auto flex justify-between items-center px-4">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-xl font-bold">
            Travelintrips *
          </Link>
          <div className="flex items-center space-x-2">
            <span>ID EN</span>
            <span>| IDR</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-6">
          <Link to="/deals" className="hover:text-green-200">
            Deals
          </Link>
          <Link to="/support" className="hover:text-green-200">
            Support
          </Link>
          <Link to="/partnership" className="hover:text-green-200">
            Partnership
          </Link>
          <Link to="/corporates" className="hover:text-green-200">
            For Corporates
          </Link>
          <Link to="/bookings" className="hover:text-green-200">
            Bookings
          </Link>
        </nav>

        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <UserDropdown />
          ) : (
            <Button
              variant="outline"
              className="bg-transparent text-white border-white hover:bg-white hover:text-green-800"
            >
              <Link to="/login">Log In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

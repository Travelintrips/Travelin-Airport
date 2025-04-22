import React, { createContext, useContext, useState, ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";

// Types for different booking items
export type FlightBooking = {
  type: "flight";
  id: string;
  transactionCode: string;
  date: string;
  sellingPrice: number;
  basicPrice: number;
  feeSales: number;
  profit: number;
  details: {
    airline: string;
    route: string;
    passengerCount: number;
  };
  notes?: string;
};

export type HotelBooking = {
  type: "hotel";
  id: string;
  transactionCode: string;
  date: string;
  sellingPrice: number;
  basicPrice: number;
  feeSales: number;
  profit: number;
  details: {
    hotelName: string;
    location: string;
    checkInDate: string;
    checkOutDate: string;
    roomCount: number;
    nightCount: number;
  };
  notes?: string;
};

export type PassengerHandlingBooking = {
  type: "passenger";
  id: string;
  transactionCode: string;
  date: string;
  sellingPrice: number;
  basicPrice: number;
  feeSales: number;
  profit: number;
  details: {
    serviceName: string;
    location: string;
    passengerCount: number;
  };
  notes?: string;
};

export type CarRentalBooking = {
  type: "car";
  id: string;
  transactionCode: string;
  date: string;
  sellingPrice: number;
  basicPrice: number;
  feeSales: number;
  profit: number;
  details: {
    carType: string;
    licensePlate: string;
    startDate: string;
    endDate: string;
    dayCount: number;
  };
  notes?: string;
};

export type CartItem =
  | FlightBooking
  | HotelBooking
  | PassengerHandlingBooking
  | CarRentalBooking;

type ShoppingCartContextType = {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, "id">) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  totalAmount: number;
  checkout: () => Promise<void>;
};

const ShoppingCartContext = createContext<ShoppingCartContextType | undefined>(
  undefined,
);

export const ShoppingCartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = (item: Omit<CartItem, "id">) => {
    const newItem = { ...item, id: uuidv4() } as CartItem;
    setCartItems((prev) => [...prev, newItem]);
  };

  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.sellingPrice,
    0,
  );

  const checkout = async () => {
    try {
      // Get current user
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (!userId) {
        throw new Error("You must be logged in to checkout");
      }

      // Process each cart item
      for (const item of cartItems) {
        // Create booking record
        const bookingData = {
          user_id: userId,
          transaction_code: item.transactionCode,
          transaction_date: item.date,
          booking_type: item.type,
          selling_price: item.sellingPrice,
          basic_price: item.basicPrice,
          fee_sales: item.feeSales,
          profit: item.profit,
          details: item.details,
          notes: item.notes,
          status: "pending",
          created_at: new Date().toISOString(),
        };

        // Insert into bookings table
        const { data: bookingResult, error: bookingError } = await supabase
          .from("bookings")
          .insert(bookingData)
          .select()
          .single();

        if (bookingError) throw bookingError;

        // Create journal entry
        // This is a simplified example - in a real app, you would create proper accounting entries
        const journalData = {
          date: new Date().toISOString(),
          description: `Booking ${item.type} - ${item.transactionCode}`,
          total_debit: item.sellingPrice,
          account_id: "some-account-id", // This would be a real account ID from your chart of accounts
        };

        // Insert journal entry
        // Note: This is commented out as we don't have the full journal entry structure
        // In a real app, you would implement this based on your accounting system
        /*
        const { data: journalResult, error: journalError } = await supabase
          .from("journal_entries")
          .insert(journalData)
          .select()
          .single();

        if (journalError) throw journalError;
        */
      }

      // Clear cart after successful checkout
      clearCart();

      // In a real app, you might redirect to a confirmation page or show a success message
      alert("Checkout successful!");
    } catch (error) {
      console.error("Error during checkout:", error);
      alert(`Checkout failed: ${error.message}`);
    }
  };

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    clearCart,
    totalAmount,
    checkout,
  };

  return (
    <ShoppingCartContext.Provider value={value}>
      {children}
    </ShoppingCartContext.Provider>
  );
};

export const useShoppingCart = () => {
  const context = useContext(ShoppingCartContext);
  if (context === undefined) {
    throw new Error(
      "useShoppingCart must be used within a ShoppingCartProvider",
    );
  }
  return context;
};

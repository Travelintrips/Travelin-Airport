import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

// Types for shopping cart items
export type CartItem = {
  id: string;
  item_type: "baggage" | "airport_transfer" | "car";
  item_id?: string;
  service_name: string;
  price: number;
  details?: any;
  created_at?: string;
};

type ShoppingCartContextType = {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, "id" | "created_at">) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  totalAmount: number;
  checkout: () => Promise<void>;
  isLoading: boolean;
  cartCount: number;
};

const ShoppingCartContext = createContext<ShoppingCartContextType | undefined>(
  undefined,
);

const CART_STORAGE_KEY = "shopping_cart";

export const ShoppingCartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load cart items on mount
  useEffect(() => {
    loadCartItems();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setCurrentUserId(session.user.id);
        await migrateLocalStorageToSupabase(session.user.id);
        await loadCartItems();
      } else if (event === "SIGNED_OUT") {
        setCurrentUserId(null);
        await loadCartItems();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check current user on mount
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
      }
    };
    checkUser();
  }, []);

  const loadCartItems = async () => {
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // Load from Supabase for logged-in users
        const { data, error } = await supabase
          .from("shopping_cart")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading cart from Supabase:", error);
          return;
        }

        setCartItems(data || []);
      } else {
        // Load from localStorage for guests
        const localCart = localStorage.getItem(CART_STORAGE_KEY);
        if (localCart) {
          try {
            const parsedCart = JSON.parse(localCart);
            setCartItems(Array.isArray(parsedCart) ? parsedCart : []);
          } catch (error) {
            console.error("Error parsing localStorage cart:", error);
            localStorage.removeItem(CART_STORAGE_KEY);
            setCartItems([]);
          }
        } else {
          setCartItems([]);
        }
      }
    } catch (error) {
      console.error("Error loading cart items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const migrateLocalStorageToSupabase = async (userId: string) => {
    try {
      const localCart = localStorage.getItem(CART_STORAGE_KEY);
      if (!localCart) return;

      const parsedCart = JSON.parse(localCart);
      if (!Array.isArray(parsedCart) || parsedCart.length === 0) return;

      // Insert items to Supabase
      const itemsToInsert = parsedCart.map((item) => ({
        user_id: userId,
        item_type: item.item_type,
        item_id: item.item_id,
        service_name: item.service_name,
        price: item.price,
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("shopping_cart")
        .insert(itemsToInsert);

      if (error) {
        console.error("Error migrating cart to Supabase:", error);
        return;
      }

      // Clear localStorage after successful migration
      localStorage.removeItem(CART_STORAGE_KEY);
      console.log("Cart migrated successfully from localStorage to Supabase");
    } catch (error) {
      console.error("Error during cart migration:", error);
    }
  };

  const addToCart = async (item: Omit<CartItem, "id" | "created_at">) => {
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const newItem: CartItem = {
        ...item,
        id: uuidv4(),
        created_at: new Date().toISOString(),
      };

      if (session?.user) {
        // Add to Supabase for logged-in users
        // Generate a UUID for item_id if it's not already a valid UUID
        let validItemId = null;
        if (item.item_id) {
          // Check if item_id is already a valid UUID format
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(item.item_id)) {
            validItemId = item.item_id;
          } else {
            // Generate a new UUID if item_id is not a valid UUID
            validItemId = uuidv4();
          }
        }

        const { data, error } = await supabase
          .from("shopping_cart")
          .insert({
            user_id: session.user.id,
            item_type: item.item_type,
            item_id: validItemId,
            service_name: item.service_name,
            price: item.price,
          })
          .select()
          .single();

        if (error) {
          console.error("Error adding to cart:", error);
          throw error;
        }

        setCartItems((prev) => [data, ...prev]);
      } else {
        // Add to localStorage for guests
        const updatedCart = [newItem, ...cartItems];
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
        setCartItems(updatedCart);
      }

      // Show success toast
      toast({
        title: "Item ditambahkan ke keranjang",
        description: `${item.service_name} berhasil ditambahkan ke keranjang belanja.`,
      });
    } catch (error) {
      console.error("Error adding item to cart:", error);
      toast({
        title: "Gagal menambahkan item",
        description: "Terjadi kesalahan saat menambahkan item ke keranjang.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (id: string) => {
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // Remove from Supabase for logged-in users
        const { error } = await supabase
          .from("shopping_cart")
          .delete()
          .eq("id", id)
          .eq("user_id", session.user.id);

        if (error) {
          console.error("Error removing from cart:", error);
          throw error;
        }
      } else {
        // Remove from localStorage for guests
        const updatedCart = cartItems.filter((item) => item.id !== id);
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
      }

      setCartItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error removing item from cart:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // Clear from Supabase for logged-in users
        const { error } = await supabase
          .from("shopping_cart")
          .delete()
          .eq("user_id", session.user.id);

        if (error) {
          console.error("Error clearing cart:", error);
          throw error;
        }
      } else {
        // Clear localStorage for guests
        localStorage.removeItem(CART_STORAGE_KEY);
      }

      setCartItems([]);
    } catch (error) {
      console.error("Error clearing cart:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkout = async (customerData?: {
    name: string;
    email: string;
    phone: string;
    paymentMethod: string;
    bankDetails?: any;
  }) => {
    if (cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // For guest users, we need customer data
      if (!session?.user && !customerData) {
        throw new Error("Customer information is required for checkout");
      }

      // Validate prices from backend
      const validatedItems = [];
      for (const item of cartItems) {
        // Here you would validate the price against your backend
        // For now, we'll assume the prices are valid
        validatedItems.push(item);
      }

      const totalAmount = validatedItems.reduce(
        (sum, item) => sum + item.price,
        0,
      );

      // Create payment record
      const paymentData = {
        user_id: session?.user?.id || null,
        amount: totalAmount,
        payment_method: customerData?.paymentMethod || "pending",
        status: "pending",
        is_partial_payment: "false",
        is_damage_payment: false,
        created_at: new Date().toISOString(),
        // Add customer data for guest users
        ...(customerData &&
          !session?.user && {
            customer_name: customerData.name,
            customer_email: customerData.email,
            customer_phone: customerData.phone,
          }),
      };

      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert(paymentData)
        .select()
        .single();

      if (paymentError) {
        console.error("Error creating payment:", paymentError);
        throw paymentError;
      }

      // Clear cart after successful payment creation
      await clearCart();

      return payment;
    } catch (error) {
      console.error("Error during checkout:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const totalAmount = cartItems.reduce((sum, item) => sum + item.price, 0);
  const cartCount = cartItems.length;

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    clearCart,
    totalAmount,
    checkout,
    isLoading,
    cartCount,
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

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

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
  refetchCartData: () => Promise<void>;
};

const ShoppingCartContext = createContext<ShoppingCartContextType | undefined>(
  undefined,
);

const CART_STORAGE_KEY = "shopping_cart";

export const ShoppingCartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const { toast } = useToast();

  // Helper function to validate UUID
  const isValidUUID = (str: string) => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Load cart items on mount
  useEffect(() => {
    let isMounted = true;

    const initializeCart = async () => {
      if (!isMounted) return;

      try {
        console.log("[useShoppingCart] Initializing cart...");

        // First check localStorage for user data
        const storedUserId = localStorage.getItem("userId");
        const storedUser = localStorage.getItem("auth_user");

        if (storedUserId && storedUser) {
          console.log(
            "[useShoppingCart] Found stored user, setting current user ID:",
            storedUserId,
          );
          setCurrentUserId(storedUserId);

          // Try to migrate localStorage cart to Supabase for this user
          try {
            await migrateLocalStorageToSupabase(storedUserId);
          } catch (migrateError) {
            console.warn(
              "[useShoppingCart] Migration failed, continuing:",
              migrateError,
            );
          }
        }

        // Check current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user && isMounted) {
          console.log(
            "[useShoppingCart] Found Supabase session:",
            session.user.email,
          );
          if (session.user.id !== currentUserId) {
            setCurrentUserId(session.user.id);
            await migrateLocalStorageToSupabase(session.user.id);
          }
        }

        if (isMounted) {
          await loadCartItems();
        }
      } catch (error) {
        console.error("[useShoppingCart] Error initializing cart:", error);
        // Load from localStorage as fallback
        try {
          const localCart = localStorage.getItem("shopping_cart");
          if (localCart) {
            const parsedCart = JSON.parse(localCart);
            setCartItems(Array.isArray(parsedCart) ? parsedCart : []);
            console.log(
              "[useShoppingCart] Loaded cart from localStorage fallback:",
              parsedCart.length,
              "items",
            );
          }
        } catch (storageError) {
          console.error(
            "[useShoppingCart] Error loading from localStorage:",
            storageError,
          );
        }
      } finally {
        if (isMounted) {
          setIsInitialized(true);
          console.log("[useShoppingCart] Cart initialization completed");
        }
      }
    };

    initializeCart();

    // Listen for auth changes - only on initial session to reduce duplication
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      // Only handle INITIAL_SESSION to reduce duplication
      if (event === "INITIAL_SESSION" && session?.user) {
        // Check if user data has actually changed before updating state
        if (session.user.id !== currentUserId) {
          setCurrentUserId(session.user.id);
          await migrateLocalStorageToSupabase(session.user.id);
          await loadCartItems();
        }
      } else if (event === "SIGNED_IN" && session?.user) {
        // Check if user data has actually changed before updating state
        if (session.user.id !== currentUserId) {
          setCurrentUserId(session.user.id);
          await migrateLocalStorageToSupabase(session.user.id);
          await loadCartItems();
        }
      } else if (event === "SIGNED_OUT") {
        setCurrentUserId(null);
        setCartItems([]); // Clear cart items in state immediately
        setIsLoading(false); // Ensure loading is set to false on sign out
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Listen for force logout events
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "forceLogout") {
        setCartItems([]);
        setCurrentUserId(null);
        setIsLoading(false); // Ensure loading is set to false
        // Clear cart from localStorage as well
        try {
          localStorage.removeItem(CART_STORAGE_KEY);
        } catch (e) {
          console.warn("Error clearing cart from localStorage:", e);
        }
      }
    };

    const handleSignOut = () => {
      console.log("[ShoppingCart] User signed out, clearing cart");
      setCartItems([]);
      setCurrentUserId(null);
      setIsLoading(false); // Ensure loading is set to false
      try {
        localStorage.removeItem(CART_STORAGE_KEY);
      } catch (e) {
        console.warn("Error clearing cart from localStorage:", e);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("userSignedOut", handleSignOut);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("userSignedOut", handleSignOut);
    };
  }, []);

  // Expose loadCartItems function for external use
  const refetchCartData = React.useCallback(async () => {
    console.log("[useShoppingCart] Refetching cart data...");
    await loadCartItems(true); // Force reload
  }, []);

  // Add throttled visibility change listener for refetching when tab becomes active
  useEffect(() => {
    let lastSyncTime = 0;
    const SYNC_THROTTLE = 15000; // Increased throttle time to prevent conflicts with AuthContext
    let syncTimeout: NodeJS.Timeout;
    let isSyncing = false; // Add syncing flag

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();

        // Enhanced throttling with syncing flag
        if (now - lastSyncTime < SYNC_THROTTLE || isSyncing) {
          console.log(
            "[useShoppingCart] Sync throttled or already syncing, skipping visibility change sync",
          );
          return;
        }

        // Clear any existing timeout
        if (syncTimeout) clearTimeout(syncTimeout);

        isSyncing = true;
        lastSyncTime = now;
        console.log(
          "[useShoppingCart] Tab became visible, prioritizing localStorage for cart sync",
        );

        // Prioritize localStorage for immediate cart restoration
        syncTimeout = setTimeout(async () => {
          try {
            console.log(
              "[useShoppingCart] Starting localStorage-first cart sync...",
            );

            // Wait longer for AuthContext session restoration to complete
            await new Promise((resolve) => setTimeout(resolve, 3000));

            // Prioritize localStorage for user identification
            const storedUser = localStorage.getItem("auth_user");
            const storedUserId = localStorage.getItem("userId");

            if (storedUser && storedUserId) {
              try {
                const userData = JSON.parse(storedUser);
                console.log(
                  "[useShoppingCart] Found stored user, syncing cart:",
                  userData.email,
                );

                // Update user ID if different
                if (userData.id !== currentUserId) {
                  setCurrentUserId(userData.id);
                }

                // Load cart items with localStorage priority
                await loadCartItems(true);
              } catch (parseError) {
                console.warn(
                  "[useShoppingCart] Error parsing stored user:",
                  parseError,
                );
                // Still try to load cart
                await loadCartItems(true);
              }
            } else {
              // Load guest cart from localStorage
              console.log(
                "[useShoppingCart] No user data, loading guest cart from localStorage",
              );
              try {
                const localCart = localStorage.getItem("shopping_cart");
                if (localCart) {
                  const parsedCart = JSON.parse(localCart);
                  setCartItems(Array.isArray(parsedCart) ? parsedCart : []);
                  console.log(
                    "[useShoppingCart] Loaded guest cart from localStorage:",
                    parsedCart.length,
                    "items",
                  );
                }
              } catch (error) {
                console.warn(
                  "[useShoppingCart] Error loading guest cart:",
                  error,
                );
              }
            }
          } catch (error) {
            console.error("[useShoppingCart] Error during cart sync:", error);
          } finally {
            isSyncing = false; // Reset syncing flag
          }
        }, 4000); // Increased debounce time to avoid conflicts with AuthContext
      }
    };

    // Listen for session restored events with throttling
    const handleSessionRestored = (event: CustomEvent) => {
      console.log(
        "[useShoppingCart] Session restored event received:",
        event.detail,
      );
      const userData = event.detail;

      // Always update user ID and reload cart when session is restored
      if (userData.id && userData.email) {
        console.log(
          "[useShoppingCart] Updating current user ID from restored session:",
          userData.email,
        );

        // Update current user ID immediately
        setCurrentUserId(userData.id);

        // Reload cart items for the restored user with timeout protection
        setTimeout(async () => {
          try {
            console.log(
              "[useShoppingCart] Loading cart items for restored user:",
              userData.email,
            );

            // Try to migrate any localStorage cart data first
            try {
              await migrateLocalStorageToSupabase(userData.id);
            } catch (migrateError) {
              console.warn(
                "[useShoppingCart] Migration failed during session restore:",
                migrateError,
              );
            }

            // Then load cart items
            await loadCartItems(true);
            console.log(
              "[useShoppingCart] Cart successfully loaded for restored session",
            );
          } catch (error) {
            console.error(
              "[useShoppingCart] Error loading cart for restored user:",
              error,
            );

            // Fallback to localStorage if Supabase fails
            try {
              const localCart = localStorage.getItem("shopping_cart");
              if (localCart) {
                const parsedCart = JSON.parse(localCart);
                setCartItems(Array.isArray(parsedCart) ? parsedCart : []);
                console.log(
                  "[useShoppingCart] Used localStorage fallback for restored session",
                );
              }
            } catch (fallbackError) {
              console.error(
                "[useShoppingCart] Fallback also failed:",
                fallbackError,
              );
            }
          }
        }, 300); // Increased delay to prevent race conditions
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(
      "sessionRestored",
      handleSessionRestored as EventListener,
    );

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(
        "sessionRestored",
        handleSessionRestored as EventListener,
      );
      if (syncTimeout) clearTimeout(syncTimeout);
    };
  }, [currentUserId]);

  const loadCartItems = async (forceReload = false) => {
    // Prevent multiple simultaneous loads unless forced
    if (isLoading && !forceReload) {
      console.log(
        "[useShoppingCart] Already loading, skipping duplicate request",
      );
      return;
    }

    console.log("[useShoppingCart] Loading cart items...", { forceReload });

    // Only set loading if not already loading or if forced
    if (!isLoading || forceReload) {
      setIsLoading(true);
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      console.log("[useShoppingCart] Session check:", {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
      });

      if (session?.user) {
        // Load from Supabase for authenticated users
        console.log(
          "[useShoppingCart] Loading from Supabase for user:",
          session.user.id,
        );

        const { data, error } = await supabase
          .from("shopping_cart")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("status_cart", "active")
          .order("created_at", { ascending: false });

        if (error) {
          console.error(
            "[useShoppingCart] Error loading cart from Supabase:",
            error,
          );
          // Fallback to localStorage on error
          const localCart = localStorage.getItem(CART_STORAGE_KEY);
          if (localCart) {
            try {
              const parsedCart = JSON.parse(localCart);
              setCartItems(Array.isArray(parsedCart) ? parsedCart : []);
            } catch (parseError) {
              console.error(
                "[useShoppingCart] Error parsing localStorage:",
                parseError,
              );
              setCartItems([]);
            }
          } else {
            setCartItems([]);
          }
          return;
        }

        console.log(
          "[useShoppingCart] Loaded cart items from Supabase:",
          data?.length || 0,
        );

        // Transform data to match CartItem interface
        const transformedItems = (data || []).map((item) => ({
          id: item.id,
          item_type: item.item_type,
          item_id: item.item_id,
          service_name: item.service_name,
          price: item.price,
          details: item.details
            ? typeof item.details === "string"
              ? JSON.parse(item.details)
              : item.details
            : null,
          created_at: item.created_at,
        }));

        setCartItems(transformedItems);
      } else {
        // Load from localStorage for guests
        console.log("[useShoppingCart] Loading from localStorage for guest");
        const localCart = localStorage.getItem(CART_STORAGE_KEY);
        if (localCart) {
          try {
            const parsedCart = JSON.parse(localCart);
            const items = Array.isArray(parsedCart) ? parsedCart : [];
            console.log(
              "[useShoppingCart] Loaded local cart items:",
              items.length,
            );
            setCartItems(items);
          } catch (error) {
            console.error(
              "[useShoppingCart] Error parsing localStorage cart:",
              error,
            );
            localStorage.removeItem(CART_STORAGE_KEY);
            setCartItems([]);
          }
        } else {
          console.log("[useShoppingCart] No local cart found");
          setCartItems([]);
        }
      }
    } catch (error) {
      console.error("[useShoppingCart] Error loading cart items:", error);
      // Don't clear cart items on error, keep existing items
      if (cartItems.length === 0) {
        setCartItems([]);
      }
    } finally {
      console.log("[useShoppingCart] Finished loading cart items");
      setIsLoading(false);
    }
  };

  const migrateLocalStorageToSupabase = async (userId: string) => {
    try {
      const localCart = localStorage.getItem(CART_STORAGE_KEY);
      if (!localCart) return;

      const parsedCart = JSON.parse(localCart);
      if (!Array.isArray(parsedCart) || parsedCart.length === 0) return;

      console.log(
        `[useShoppingCart] Migrating ${parsedCart.length} items to Supabase for user:`,
        userId,
      );

      // Insert items to Supabase
      const itemsToInsert = parsedCart.map((item) => ({
        user_id: userId,
        item_type: item.item_type,
        item_id:
          item.item_id &&
          item.item_id !== "small" &&
          item.item_id !== "medium" &&
          item.item_id !== "large" &&
          isValidUUID(item.item_id)
            ? item.item_id
            : null,
        service_name: item.service_name,
        price: item.price,
        details:
          typeof item.details === "string"
            ? item.details
            : JSON.stringify(item.details),
        status_cart: "active",
        created_at: item.created_at || new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("shopping_cart")
        .insert(itemsToInsert);

      if (error) {
        console.error(
          "[useShoppingCart] Error migrating cart to Supabase:",
          error,
        );
        return;
      }

      // Clear localStorage after successful migration
      localStorage.removeItem(CART_STORAGE_KEY);
      console.log(
        "[useShoppingCart] Cart migrated successfully from localStorage to Supabase",
      );
    } catch (error) {
      console.error("[useShoppingCart] Error during cart migration:", error);
    }
  };

  const addToCart = async (item: Omit<CartItem, "id" | "created_at">) => {
    console.log("[useShoppingCart] Starting addToCart operation");
    setIsLoading(true);

    try {
      console.log("[useShoppingCart] Getting current session...");

      // Enhanced session check with multiple fallbacks and timeout protection
      let session = null;
      let userId = null;
      let userEmail = null;

      // 1. Try localStorage first for immediate validation
      const storedUserId = localStorage.getItem("userId");
      const storedUserEmail = localStorage.getItem("userEmail");
      const storedUser = localStorage.getItem("auth_user");

      if (storedUserId && storedUserEmail && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          session = { user: { id: storedUserId, email: storedUserEmail } };
          userId = storedUserId;
          userEmail = storedUserEmail;
          console.log(
            "[useShoppingCart] Using localStorage session:",
            userEmail,
          );

          // Update current user ID if different
          if (userId !== currentUserId) {
            console.log(
              "[useShoppingCart] Updating current user ID from localStorage:",
              userId,
            );
            setCurrentUserId(userId);
          }
        } catch (parseError) {
          console.warn(
            "[useShoppingCart] Error parsing stored user:",
            parseError,
          );
        }
      }

      // 2. Only try Supabase if localStorage failed
      if (!userId) {
        try {
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Session check timeout")), 8000); // Increased timeout
          });

          const {
            data: { session: currentSession },
            error,
          } = (await Promise.race([sessionPromise, timeoutPromise])) as any;

          if (!error && currentSession?.user) {
            session = currentSession;
            userId = currentSession.user.id;
            userEmail = currentSession.user.email;
            console.log("[useShoppingCart] Using Supabase session:", userEmail);

            // Update current user ID if different
            if (userId !== currentUserId) {
              console.log(
                "[useShoppingCart] Updating current user ID from Supabase:",
                userId,
              );
              setCurrentUserId(userId);
            }
          }
        } catch (error) {
          console.log(
            "[useShoppingCart] Supabase session check failed:",
            error.message,
          );
        }
      }

      // 3. Fallback to context user ID
      if (!userId && currentUserId) {
        userId = currentUserId;
        session = { user: { id: currentUserId } };
        console.log("[useShoppingCart] Using context user ID:", userId);
      }

      // Use booking_code from details if available, otherwise generate new ID
      const itemId = item.details?.booking_code || uuidv4();

      const newItem: CartItem = {
        ...item,
        id: itemId,
        created_at: new Date().toISOString(),
      };

      if (userId && session?.user) {
        // User is authenticated - save to Supabase
        console.log(
          "[useShoppingCart] Adding to Supabase for authenticated user:",
          userId,
        );

        const insertData = {
          user_id: userId,
          item_type: item.item_type,
          item_id:
            item.item_id &&
            item.item_id !== "small" &&
            item.item_id !== "medium" &&
            item.item_id !== "large" &&
            isValidUUID(item.item_id)
              ? item.item_id
              : null,
          service_name: item.service_name,
          price: item.price,
          details:
            typeof item.details === "string"
              ? item.details
              : JSON.stringify(item.details),
          status_cart: "active",
          created_at: new Date().toISOString(),
        };

        console.log("[useShoppingCart] Inserting data to Supabase:", {
          user_id: insertData.user_id,
          item_type: insertData.item_type,
          service_name: insertData.service_name,
          price: insertData.price,
          status_cart: insertData.status_cart,
        });

        // Add timeout protection for database insert
        const insertPromise = supabase
          .from("shopping_cart")
          .insert(insertData)
          .select()
          .single();

        const insertTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Database insert timeout")), 10000);
        });

        const { data, error } = (await Promise.race([
          insertPromise,
          insertTimeoutPromise,
        ])) as any;

        if (error) {
          console.error("[useShoppingCart] Database error:", error);
          throw error;
        }

        console.log("[useShoppingCart] Successfully added to Supabase");
        setCartItems((prev) => [data, ...prev]);
      } else {
        // Guest user - save to localStorage
        console.log("[useShoppingCart] Adding to localStorage for guest user");
        const updatedCart = [newItem, ...cartItems];
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
        setCartItems(updatedCart);
      }

      console.log("[useShoppingCart] Showing success toast...");
      // Show success toast with timeout protection
      try {
        toast({
          title: "Item ditambahkan ke keranjang",
          description: `${item.service_name} berhasil ditambahkan ke keranjang belanja.`,
        });
      } catch (toastError) {
        console.warn(
          "[useShoppingCart] Toast error (non-critical):",
          toastError,
        );
      }
      console.log(
        "[useShoppingCart] AddToCart operation completed successfully",
      );
    } catch (error) {
      console.error("[useShoppingCart] Error adding item to cart:", error);

      // Enhanced fallback to localStorage if Supabase fails
      try {
        console.log(
          "[useShoppingCart] Falling back to localStorage due to:",
          error.message,
        );
        const itemId = item.details?.booking_code || uuidv4();

        const newItem: CartItem = {
          ...item,
          id: itemId,
          created_at: new Date().toISOString(),
        };
        const updatedCart = [newItem, ...cartItems];
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
        setCartItems(updatedCart);

        // Show different toast message for offline mode
        const isTimeoutError =
          error.message && error.message.includes("timeout");
        toast({
          title: isTimeoutError
            ? "Item ditambahkan (mode offline)"
            : "Item ditambahkan ke keranjang",
          description: isTimeoutError
            ? `${item.service_name} disimpan secara lokal. Data akan disinkronkan saat koneksi stabil.`
            : `${item.service_name} berhasil ditambahkan ke keranjang belanja.`,
        });
        console.log("[useShoppingCart] Fallback to localStorage successful");
      } catch (fallbackError) {
        console.error("[useShoppingCart] Fallback also failed:", fallbackError);
        toast({
          title: "Gagal menambahkan item",
          description:
            "Terjadi kesalahan saat menambahkan item ke keranjang. Silakan coba lagi.",
          variant: "destructive",
        });
        throw fallbackError;
      }
    } finally {
      console.log("[useShoppingCart] Cleaning up addToCart operation");
      setIsLoading(false);
    }
  };

  const removeFromCart = async (id: string) => {
    console.log("[useShoppingCart] Starting removeFromCart for ID:", id);
    setIsLoading(true);

    // Create a timeout promise to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("RemoveFromCart operation timed out after 8 seconds"));
      }, 8000); // Reduced timeout
    });

    try {
      // Race between the actual operation and timeout
      await Promise.race([
        (async () => {
          console.log(
            "[useShoppingCart] Getting current session for remove operation...",
          );
          const {
            data: { session },
          } = await supabase.auth.getSession();

          console.log("[useShoppingCart] Session check for remove:", {
            hasSession: !!session,
            hasUser: !!session?.user,
            userId: session?.user?.id,
          });

          if (session?.user) {
            // Remove from Supabase for authenticated users
            console.log(
              "[useShoppingCart] Removing from Supabase for user:",
              session.user.id,
              "item ID:",
              id,
            );

            const { data: deletedData, error } = await supabase
              .from("shopping_cart")
              .delete()
              .eq("id", id)
              .eq("user_id", session.user.id)
              .select(); // Add select to see what was deleted

            if (error) {
              console.error(
                "[useShoppingCart] Error removing from Supabase:",
                error,
              );
              // Continue with local removal even if Supabase fails
            } else {
              console.log(
                "[useShoppingCart] Successfully removed from Supabase:",
                deletedData,
              );
            }
          } else {
            // Remove from localStorage for guests
            console.log(
              "[useShoppingCart] Removing from localStorage for guest user",
            );
            const updatedCart = cartItems.filter((item) => item.id !== id);
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
          }

          // Always update local state
          console.log(
            "[useShoppingCart] Updating local state to remove item:",
            id,
          );
          setCartItems((prev) => {
            const filtered = prev.filter((item) => item.id !== id);
            console.log(
              "[useShoppingCart] Cart items after removal:",
              filtered.length,
            );
            return filtered;
          });

          console.log(
            "[useShoppingCart] Showing success toast for item removal",
          );
          toast({
            title: "Item dihapus",
            description: "Item berhasil dihapus dari keranjang.",
          });
        })(),
        timeoutPromise,
      ]);
    } catch (error) {
      console.error("[useShoppingCart] Error removing item from cart:", error);

      // Fallback: try to remove from local state anyway
      try {
        console.log("[useShoppingCart] Fallback: removing from local state");
        setCartItems((prev) => prev.filter((item) => item.id !== id));

        // Also try localStorage fallback
        const updatedCart = cartItems.filter((item) => item.id !== id);
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));

        toast({
          title: "Item dihapus",
          description: "Item berhasil dihapus dari keranjang (mode offline).",
        });
      } catch (fallbackError) {
        console.error(
          "[useShoppingCart] Fallback removal also failed:",
          fallbackError,
        );
        toast({
          title: "Gagal menghapus item",
          description: "Terjadi kesalahan saat menghapus item dari keranjang.",
          variant: "destructive",
        });
      }
    } finally {
      console.log("[useShoppingCart] Cleaning up removeFromCart operation");
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    console.log("[useShoppingCart] Starting clearCart operation");
    setIsLoading(true);

    // Create a timeout promise to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("ClearCart operation timed out after 6 seconds"));
      }, 6000); // Further reduced timeout
    });

    try {
      // Race between the actual operation and timeout
      await Promise.race([
        (async () => {
          console.log(
            "[useShoppingCart] Getting current session for clear operation...",
          );
          const {
            data: { session },
          } = await supabase.auth.getSession();

          console.log("[useShoppingCart] Session check for clear:", {
            hasSession: !!session,
            hasUser: !!session?.user,
            userId: session?.user?.id,
          });

          if (session?.user) {
            // Clear from Supabase for authenticated users
            console.log(
              "[useShoppingCart] Clearing cart from Supabase for user:",
              session.user.id,
            );

            const { data: deletedData, error } = await supabase
              .from("shopping_cart")
              .delete()
              .eq("user_id", session.user.id)
              .eq("status_cart", "active")
              .select(); // Add select to see what was deleted

            if (error) {
              console.error(
                "[useShoppingCart] Error clearing cart from Supabase:",
                error,
              );
              // Continue with local clearing even if Supabase fails
            } else {
              console.log(
                "[useShoppingCart] Successfully cleared from Supabase:",
                deletedData?.length || 0,
                "items",
              );
            }
          } else {
            // Clear localStorage for guests
            console.log(
              "[useShoppingCart] Clearing localStorage for guest user",
            );
            localStorage.removeItem(CART_STORAGE_KEY);
          }

          // Always clear local state
          console.log("[useShoppingCart] Clearing local cart state");
          setCartItems([]);

          // Dispatch event to notify other components that cart has been cleared
          window.dispatchEvent(new CustomEvent("cartCleared"));
          console.log("✅ Cart cleared successfully");
        })(),
        timeoutPromise,
      ]);
    } catch (error) {
      console.error("[useShoppingCart] Error clearing cart:", error);

      // Fallback: try to clear local state anyway
      try {
        console.log("[useShoppingCart] Fallback: clearing local state");
        setCartItems([]);
        localStorage.removeItem(CART_STORAGE_KEY);

        // Still dispatch the event
        window.dispatchEvent(new CustomEvent("cartCleared"));
        console.log("✅ Cart cleared successfully (fallback mode)");
      } catch (fallbackError) {
        console.error(
          "[useShoppingCart] Fallback clear also failed:",
          fallbackError,
        );
        throw fallbackError;
      }
    } finally {
      console.log("[useShoppingCart] Cleaning up clearCart operation");
      setIsLoading(false);
    }
  };

  // Helper function to link payment with booking
  const linkPaymentBooking = async (
    paymentId: string,
    bookingId: string,
    bookingType: string,
  ) => {
    console.log("📦 Linking to payment_bookings:", {
      payment_id: paymentId,
      booking_id: bookingId,
      booking_type: bookingType,
    });

    const { error } = await supabase.from("payment_bookings").insert({
      payment_id: paymentId,
      booking_id: bookingId,
      booking_type: bookingType,
    });

    if (error) {
      console.error("❌ Error linking payment booking:", error);
      throw error;
    }

    console.log("✅ Successfully linked payment booking");
    return true;
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

      console.log("💰 Creating payment for total amount:", totalAmount);
      console.log("🛒 Processing", validatedItems.length, "cart items");

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
        console.error("❌ Error creating payment:", paymentError);
        throw paymentError;
      }

      console.log("✅ Payment created successfully:", payment.id);

      // Process each cart item and create bookings
      const bookingPromises = [];

      for (const item of validatedItems) {
        console.log("🔄 Processing cart item:", {
          type: item.item_type,
          service: item.service_name,
          price: item.price,
        });

        if (item.item_type === "baggage") {
          // Create baggage booking
          const baggageBookingData = {
            booking_id:
              item.details?.booking_code ||
              item.id ||
              item.item_id ||
              `baggage-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
            customer_name:
              customerData?.name || session?.user?.email || "Guest",
            customer_email: customerData?.email || session?.user?.email || "",
            customer_phone: customerData?.phone || "",
            item_name: item.service_name,
            price: item.price,
            status: "pending",
            // Add other required fields with defaults
            airport: item.details?.airport || "Unknown",
            terminal: item.details?.terminal || "Unknown",
            baggage_size: item.details?.baggage_size || "medium",
            duration: item.details?.duration || 1,
            duration_type: item.details?.duration_type || "days",
            start_date:
              item.details?.start_date ||
              new Date().toISOString().split("T")[0],
            end_date:
              item.details?.end_date ||
              new Date(Date.now() + 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
            customer_id: session?.user?.id || null,
            created_at: new Date().toISOString(),
          };

          const baggagePromise = supabase
            .from("baggage_booking")
            .insert(baggageBookingData)
            .select()
            .single()
            .then(async ({ data: booking, error }) => {
              if (error) {
                console.error("❌ Error creating baggage booking:", error);
                throw error;
              }
              console.log("✅ Baggage booking created:", booking.id);

              // Link to payment_bookings table
              await linkPaymentBooking(
                payment.id,
                booking.id.toString(),
                "baggage",
              );
              return booking;
            });

          bookingPromises.push(baggagePromise);
        } else if (item.item_type === "airport_transfer") {
          // Parse details for airport transfer
          let parsedDetails = item.details;
          if (typeof item.details === "string") {
            try {
              parsedDetails = JSON.parse(item.details);
            } catch (error) {
              console.error("Error parsing airport transfer details:", error);
              parsedDetails = item.details;
            }
          }

          // Create airport transfer booking
          const transferBookingData = {
            customer_name:
              customerData?.name || session?.user?.email || "Guest",
            phone: customerData?.phone || "",
            pickup_location:
              parsedDetails?.fromAddress ||
              parsedDetails?.pickup_location ||
              "Unknown",
            dropoff_location:
              parsedDetails?.toAddress ||
              parsedDetails?.dropoff_location ||
              "Unknown",
            pickup_date:
              parsedDetails?.pickupDate ||
              parsedDetails?.pickup_date ||
              new Date().toISOString().split("T")[0],
            pickup_time:
              parsedDetails?.pickupTime ||
              parsedDetails?.pickup_time ||
              "09:00",
            price: item.price,
            status: "pending",
            customer_id: session?.user?.id || null,
            // Add additional fields from details
            vehicle_name:
              parsedDetails?.vehicleType || parsedDetails?.vehicle_name || null,
            driver_name: parsedDetails?.driver_name || null,
            license_plate: parsedDetails?.license_plate || null,
            distance: parsedDetails?.distance || null,
            duration: parsedDetails?.duration || null,
            type: parsedDetails?.type || "airport_transfer",
            created_at: new Date().toISOString(),
          };

          const transferPromise = supabase
            .from("airport_transfer")
            .insert(transferBookingData)
            .select()
            .single()
            .then(async ({ data: booking, error }) => {
              if (error) {
                console.error(
                  "❌ Error creating airport transfer booking:",
                  error,
                );
                throw error;
              }
              console.log("✅ Airport transfer booking created:", booking.id);

              // Link to payment_bookings table
              await linkPaymentBooking(
                payment.id,
                booking.id.toString(),
                "airport_transfer",
              );
              return booking;
            });

          bookingPromises.push(transferPromise);
        } else if (item.item_type === "car") {
          // Check if this is an existing booking or new booking
          if (item.item_id && !isNaN(Number(item.item_id))) {
            // This is an existing booking, just update payment status
            const carPromise = supabase
              .from("bookings")
              .update({
                payment_status: "paid",
                status: "confirmed",
                payment_id: payment.id,
              })
              .eq("id", item.item_id)
              .select()
              .single()
              .then(async ({ data: booking, error }) => {
                if (error) {
                  console.error("❌ Error updating car booking:", error);
                  throw error;
                }
                console.log("✅ Car booking updated:", booking.id);

                // Link to payment_bookings table
                await linkPaymentBooking(
                  payment.id,
                  booking.id.toString(),
                  "car",
                );
                return booking;
              });

            bookingPromises.push(carPromise);
          } else {
            // Create new car rental booking
            let parsedDetails = item.details;
            if (typeof item.details === "string") {
              try {
                parsedDetails = JSON.parse(item.details);
              } catch (error) {
                console.error("Error parsing car rental details:", error);
                parsedDetails = item.details;
              }
            }

            const carBookingData = {
              customer_id: session?.user?.id || null,
              vehicle_id: parsedDetails?.vehicle_id || item.item_id || null,
              total_amount: item.price,
              start_date:
                parsedDetails?.start_date ||
                new Date().toISOString().split("T")[0],
              end_date:
                parsedDetails?.end_date ||
                new Date(Date.now() + 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0],
              pickup_time: parsedDetails?.pickup_time || "09:00",
              driver_option: parsedDetails?.driver_option || "self",
              status: "confirmed",
              payment_status: "paid",
              payment_id: payment.id,
              vehicle_name: parsedDetails?.vehicle_name || item.service_name,
              vehicle_type: parsedDetails?.vehicle_type || null,
              make: parsedDetails?.make || null,
              model: parsedDetails?.model || null,
              license_plate: parsedDetails?.license_plate || null,
              with_driver: parsedDetails?.with_driver || false,
              created_at: new Date().toISOString(),
            };

            const carPromise = supabase
              .from("bookings")
              .insert(carBookingData)
              .select()
              .single()
              .then(async ({ data: booking, error }) => {
                if (error) {
                  console.error("❌ Error creating car booking:", error);
                  throw error;
                }
                console.log("✅ Car booking created:", booking.id);

                // Link to payment_bookings table
                await linkPaymentBooking(
                  payment.id,
                  booking.id.toString(),
                  "car",
                );
                return booking;
              });

            bookingPromises.push(carPromise);
          }
        }
      }

      // Wait for all bookings to be created
      console.log("⏳ Waiting for all bookings to be processed...");
      const createdBookings = await Promise.all(bookingPromises);
      console.log(
        "✅ All bookings processed successfully:",
        createdBookings.length,
        "bookings",
      );

      // Clear cart after successful payment and booking creation
      console.log("🧹 Clearing cart...");
      await clearCart();
      console.log("✅ Cart cleared successfully");

      // Reset any form states that might be cached
      try {
        // Dispatch event to reset forms
        window.dispatchEvent(new CustomEvent("resetBookingForms"));
        console.log("✅ Booking forms reset event dispatched");
      } catch (error) {
        console.warn("⚠️ Error dispatching form reset event:", error);
      }

      console.log(
        "🎉 Checkout completed successfully! Payment ID:",
        payment.id,
      );
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
    refetchCartData,
  };

  // Provide a stable context value even during initialization
  const stableValue = React.useMemo(() => {
    if (!isInitialized) {
      // Return a minimal context during initialization to prevent undefined errors
      return {
        cartItems: [],
        addToCart: async () => {},
        removeFromCart: async () => {},
        clearCart: async () => {},
        totalAmount: 0,
        checkout: async () => {
          throw new Error("Cart not initialized");
        },
        isLoading: true,
        cartCount: 0,
        refetchCartData: async () => {},
      };
    }
    return value;
  }, [value, isInitialized]);

  return (
    <ShoppingCartContext.Provider value={stableValue}>
      {children}
    </ShoppingCartContext.Provider>
  );
};

export const useShoppingCart = () => {
  try {
    const context = useContext(ShoppingCartContext);
    if (context === undefined) {
      console.warn(
        "useShoppingCart called outside of ShoppingCartProvider, providing fallback context",
      );
      return createFallbackShoppingCartContext();
    }
    return context;
  } catch (error) {
    console.error("Error accessing ShoppingCartContext:", error);
    return createFallbackShoppingCartContext();
  }
};

// Create a reusable fallback context with improved localStorage handling
const createFallbackShoppingCartContext = () => {
  // Try to get cart items from localStorage for fallback
  let fallbackCartItems = [];
  try {
    const existingCart = localStorage.getItem("shopping_cart");
    if (existingCart) {
      const parsedCart = JSON.parse(existingCart);
      fallbackCartItems = Array.isArray(parsedCart) ? parsedCart : [];
    }
  } catch (error) {
    console.warn("Error parsing localStorage cart in fallback:", error);
    fallbackCartItems = [];
  }

  return {
    cartItems: fallbackCartItems,
    addToCart: async (item: Omit<CartItem, "id" | "created_at">) => {
      console.warn(
        "addToCart called from fallback context - item:",
        item.service_name,
      );
      // Try to save to localStorage as fallback
      try {
        const existingCart = localStorage.getItem("shopping_cart") || "[]";
        const cartItems = JSON.parse(existingCart);
        const newItem = {
          ...item,
          id: Date.now().toString(),
          created_at: new Date().toISOString(),
        };
        cartItems.push(newItem);
        localStorage.setItem("shopping_cart", JSON.stringify(cartItems));
        console.log("Item saved to localStorage fallback");

        // Dispatch a custom event to notify other components
        window.dispatchEvent(
          new CustomEvent("cartUpdated", {
            detail: { action: "add", item: newItem },
          }),
        );
      } catch (storageError) {
        console.warn("Failed to save to localStorage fallback:", storageError);
      }
      return Promise.resolve();
    },
    removeFromCart: async (id: string) => {
      console.warn("removeFromCart called from fallback context - id:", id);
      try {
        const existingCart = localStorage.getItem("shopping_cart") || "[]";
        const cartItems = JSON.parse(existingCart);
        const filteredItems = cartItems.filter((item: any) => item.id !== id);
        localStorage.setItem("shopping_cart", JSON.stringify(filteredItems));
        console.log("Item removed from localStorage fallback");

        // Dispatch a custom event to notify other components
        window.dispatchEvent(
          new CustomEvent("cartUpdated", {
            detail: { action: "remove", id },
          }),
        );
      } catch (storageError) {
        console.warn(
          "Failed to remove from localStorage fallback:",
          storageError,
        );
      }
      return Promise.resolve();
    },
    clearCart: async () => {
      console.warn("clearCart called from fallback context");
      try {
        localStorage.removeItem("shopping_cart");
        console.log("Cart cleared from localStorage fallback");

        // Dispatch a custom event to notify other components
        window.dispatchEvent(
          new CustomEvent("cartUpdated", {
            detail: { action: "clear" },
          }),
        );
      } catch (storageError) {
        console.warn("Failed to clear localStorage fallback:", storageError);
      }
      return Promise.resolve();
    },
    totalAmount: fallbackCartItems.reduce(
      (sum, item) => sum + (item.price || 0),
      0,
    ),
    checkout: async () => {
      console.warn("checkout called from fallback context");
      return Promise.reject(
        new Error(
          "Shopping cart provider not available. Please refresh the page.",
        ),
      );
    },
    isLoading: false,
    cartCount: fallbackCartItems.length,
    refetchCartData: async () => {
      console.warn("refetchCartData called from fallback context");
      return Promise.resolve();
    },
  };
};

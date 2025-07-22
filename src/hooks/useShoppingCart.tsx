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
import { useAuth } from "@/contexts/AuthContext";
import { useSessionReady } from "@/hooks/useSessionReady";

// Types for shopping cart items
export type CartItem = {
  id: string;
  item_type: "baggage" | "airport_transfer" | "car" | "handling";
  item_id?: string;
  service_name: string;
  price: number;
  details?: any;
  created_at?: string;
};

type ShoppingCartContextType = {
  cartItems: CartItem[];
  addToCart: (
    item: Omit<CartItem, "id" | "created_at">,
  ) => Promise<{ success: boolean; error?: string }>;
  removeFromCart: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  totalAmount: number;
  checkout: () => Promise<void>;
  isLoading: boolean;
  cartCount: number;
  refetchCartData: () => Promise<void>;
  retryLastBooking: () => Promise<void>;
  isTabRecentlyActivated: boolean;
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
  const [lastFailedBooking, setLastFailedBooking] = useState<Omit<
    CartItem,
    "id" | "created_at"
  > | null>(null);
  const [isTabRecentlyActivated, setIsTabRecentlyActivated] = useState(false);
  const { toast } = useToast();
  const {
    isAuthenticated,
    userId,
    userEmail,
    userName,
    isLoading: authLoading,
    isHydrated,
    isSessionReady,
  } = useAuth();
  const {
    isSessionReady: sessionReady,
    waitForSessionReady,
    canPerformBooking,
  } = useSessionReady();

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

        // Use AuthContext instead of direct Supabase access
        if (isAuthenticated && userId && isMounted) {
          console.log("[useShoppingCart] Found authenticated user:", userEmail);
          if (userId !== currentUserId) {
            setCurrentUserId(userId);
            await migrateLocalStorageToSupabase(userId);
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

    // Listen for auth changes through AuthContext
    const handleAuthChange = async () => {
      if (!isMounted) return;

      if (isAuthenticated && userId) {
        // Check if user data has actually changed before updating state
        if (userId !== currentUserId) {
          setCurrentUserId(userId);
          await migrateLocalStorageToSupabase(userId);
          await loadCartItems();
        }
      } else if (!isAuthenticated && currentUserId) {
        setCurrentUserId(null);
        setCartItems([]); // Clear cart items in state immediately
        setIsLoading(false); // Ensure loading is set to false on sign out
      }
    };

    // Call auth change handler when auth state changes
    handleAuthChange();

    return () => {
      isMounted = false;
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
    let tabActivationTimeout: NodeJS.Timeout;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();

        // 🎯 Set tab recently activated flag to prevent immediate booking submissions
        console.log(
          "[useShoppingCart] Tab became visible, setting recently activated flag",
        );
        setIsTabRecentlyActivated(true);

        // Clear any existing tab activation timeout
        if (tabActivationTimeout) clearTimeout(tabActivationTimeout);

        // Reset the flag after 2 seconds to allow booking submissions
        tabActivationTimeout = setTimeout(() => {
          console.log("[useShoppingCart] Clearing recently activated flag");
          setIsTabRecentlyActivated(false);
        }, 2000);

        // Enhanced throttling with syncing flag
        if (now - lastSyncTime < SYNC_THROTTLE || isSyncing) {
          console.log(
            "[useShoppingCart] Sync throttled or already syncing, skipping visibility change sync",
          );
          return;
        }

        // 🎯 GUARD: Skip localStorage fallback if session is already valid
        if (sessionReady && isAuthenticated && userId) {
          console.log(
            "[useShoppingCart] Session valid, skip localStorage fallback",
            { userId },
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
      if (tabActivationTimeout) clearTimeout(tabActivationTimeout);
    };
  }, [currentUserId, isAuthenticated, userId, userEmail]);

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
      console.log("[useShoppingCart] Auth state check:", {
        isAuthenticated,
        hasUserId: !!userId,
        userEmail,
      });

      if (isAuthenticated && userId) {
        // Load from Supabase for authenticated users
        console.log(
          "[useShoppingCart] Loading from Supabase for user:",
          userId,
        );

        const { data, error } = await supabase
          .from("shopping_cart")
          .select("*")
          .eq("user_id", userId)
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

  // This function is replaced by waitUntilSessionReady above

  // Use the useSessionReady hook instead of custom implementation
  const waitUntilSessionReady = async () => {
    console.log("[useShoppingCart] Starting waitUntilSessionReady...");

    // Check if session is already ready
    if (sessionReady && isAuthenticated && userId) {
      console.log(
        "[useShoppingCart] Session already ready with valid user data",
      );
      return {
        isReady: true,
        userId,
        userEmail,
      };
    }

    // Show connecting toast
    const connectingToast = toast({
      title: "⏳ Menyambungkan sesi...",
      description: "Mohon tunggu sementara kami menyambungkan sesi Anda.",
    });

    try {
      // Use the waitForSessionReady from useSessionReady hook
      const isReady = await waitForSessionReady(10000); // 10 second timeout

      // Dismiss connecting toast
      try {
        if (connectingToast && typeof connectingToast.dismiss === "function") {
          connectingToast.dismiss();
        }
      } catch (dismissError) {
        console.warn("[useShoppingCart] Error dismissing toast:", dismissError);
      }

      if (isReady && isAuthenticated && userId) {
        return {
          isReady: true,
          userId,
          userEmail,
        };
      } else {
        console.error(
          "[useShoppingCart] Session failed to become ready after timeout",
        );

        toast({
          title: "Gagal Menyambungkan Sesi",
          description:
            "Tidak dapat menyambungkan sesi. Silakan refresh halaman dan coba lagi.",
          variant: "destructive",
        });

        return { isReady: false };
      }
    } catch (error) {
      console.error("[useShoppingCart] Error waiting for session:", error);

      // Dismiss connecting toast
      try {
        connectingToast.dismiss?.();
      } catch (dismissError) {
        console.warn("[useShoppingCart] Error dismissing toast:", dismissError);
      }

      toast({
        title: "Gagal Menyambungkan Sesi",
        description:
          "Terjadi kesalahan saat menyambungkan sesi. Silakan refresh halaman dan coba lagi.",
        variant: "destructive",
      });

      return { isReady: false };
    }
  };

  const addToCart = async (item: Omit<CartItem, "id" | "created_at">) => {
    console.log("[useShoppingCart] Starting addToCart operation");

    // 🎯 NEW: Check if tab was recently activated to prevent race conditions
    if (isTabRecentlyActivated) {
      console.warn(
        "[useShoppingCart] Tab recently activated, preventing immediate submission",
      );
      toast({
        title: "⏳ Menunggu sesi aktif kembali…",
        description: "Harap tunggu sebentar setelah kembali ke tab ini.",
        variant: "default",
      });
      return { success: false, error: "Tab recently activated, please wait" };
    }

    // 🎯 CRITICAL: Enhanced session readiness check using useSessionReady hook
    if (!sessionReady || !canPerformBooking) {
      console.warn(
        "[useShoppingCart] Session not ready or cannot perform booking, waiting...",
      );

      const sessionResult = await waitUntilSessionReady();

      if (!sessionResult.isReady) {
        console.error(
          "[useShoppingCart] Failed to establish session readiness after retries",
        );

        // Show user-friendly error message
        toast({
          title: "Session Not Ready",
          description: "Please refresh the page and try again.",
          variant: "destructive",
        });
        return { success: false, error: "Session not ready" }; // CRITICAL: Return failure status
      }

      console.log(
        "[useShoppingCart] Session is now ready, proceeding with addToCart",
      );
    }

    // Final validation before proceeding using AuthContext
    if (!sessionReady || !isAuthenticated || !userId) {
      console.error("[useShoppingCart] Final session validation failed", {
        sessionReady,
        isAuthenticated,
        hasUserId: !!userId,
      });
      toast({
        title: "Session Error",
        description:
          "Session not ready. Please refresh the page and try again.",
        variant: "destructive",
      });
      return { success: false, error: "Session validation failed" }; // CRITICAL: Return failure status
    }

    setIsLoading(true);

    // Show retry toast for better UX
    let retryToast: { dismiss?: () => void } | null = null;
    let offlineFallbackUsed = false; // Declare at function scope

    try {
      console.log("[useShoppingCart] Getting current session...");

      // Use AuthContext data directly - no need for complex session checking
      let currentUserIdForCart = userId;
      let currentUserEmailForCart = userEmail;

      console.log(
        "[useShoppingCart] Using AuthContext session:",
        currentUserEmailForCart,
      );

      // Update current user ID if different
      if (currentUserIdForCart !== currentUserId) {
        console.log(
          "[useShoppingCart] Updating current user ID from AuthContext:",
          currentUserIdForCart,
        );
        setCurrentUserId(currentUserIdForCart);
      }

      // Use booking_code from details if available, otherwise generate new ID
      const itemId = item.details?.booking_code || uuidv4();

      const newItem: CartItem = {
        ...item,
        id: itemId,
        created_at: new Date().toISOString(),
      };

      if (currentUserIdForCart && isAuthenticated) {
        // User is authenticated - save to Supabase
        console.log(
          "[useShoppingCart] Adding to Supabase for authenticated user:",
          currentUserIdForCart,
        );

        const insertData = {
          user_id: currentUserIdForCart,
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

        // 🎯 ENHANCED RETRY MECHANISM: Implement 5x retry with exponential backoff and offline fallback
        let insertSuccess = false;
        let insertData_result = null;
        let lastError = null;
        const maxRetries = 5; // Increased retries

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(
              `[useShoppingCart] Insert attempt ${attempt}/${maxRetries}`,
            );

            if (attempt > 1) {
              // Show retry toast
              if (retryToast) {
                try {
                  if (typeof retryToast.dismiss === "function") {
                    retryToast.dismiss();
                  }
                } catch (e) {
                  console.warn("Error dismissing previous retry toast:", e);
                }
              }
              retryToast = toast({
                title: "⏳ Koneksi lambat. Sedang mencoba ulang...",
                description: `Percobaan ${attempt} dari ${maxRetries}`,
              });

              // Enhanced exponential backoff: 500ms, 1s, 2s, 4s, 8s
              const delay = 500 * Math.pow(2, attempt - 2);
              await new Promise((resolve) => setTimeout(resolve, delay));
            }

            // 🎯 NEW: Add delay before database insert to allow connection to stabilize
            console.log(
              "[useShoppingCart] Adding stabilization delay before insert...",
            );
            await new Promise((resolve) => setTimeout(resolve, 300));

            // Check network connectivity before attempting insert
            if (!navigator.onLine) {
              console.warn(
                "[useShoppingCart] Device is offline, will use fallback",
              );
              throw new Error("Device is offline");
            }

            const insertPromise = supabase
              .from("shopping_cart")
              .insert(insertData)
              .select()
              .single();

            const insertTimeoutPromise = new Promise((_, reject) => {
              setTimeout(
                () => reject(new Error("Database insert timeout")),
                10000, // Increased timeout
              );
            });

            const { data, error } = (await Promise.race([
              insertPromise,
              insertTimeoutPromise,
            ])) as any;

            if (error) {
              lastError = error;
              console.error(
                `[useShoppingCart] Insert attempt ${attempt} failed:`,
                error,
              );

              // Check if this is a network-related error
              const isNetworkError =
                error.message?.includes("fetch") ||
                error.message?.includes("network") ||
                error.message?.includes("timeout") ||
                error.message?.includes("connection");

              // If it's the last attempt and a network error, try offline fallback
              if (attempt === maxRetries && isNetworkError) {
                console.log("[useShoppingCart] Attempting offline fallback...");
                try {
                  // Save to localStorage as offline fallback
                  const offlineItem = {
                    ...newItem,
                    offline: true,
                    timestamp: Date.now(),
                  };

                  const existingOfflineItems = JSON.parse(
                    localStorage.getItem("offline_cart_items") || "[]",
                  );
                  existingOfflineItems.push(offlineItem);
                  localStorage.setItem(
                    "offline_cart_items",
                    JSON.stringify(existingOfflineItems),
                  );

                  // Add to cart state with offline flag
                  setCartItems((prev) => [
                    { ...offlineItem, id: offlineItem.id },
                    ...prev,
                  ]);
                  offlineFallbackUsed = true;
                  insertSuccess = true;

                  console.log("[useShoppingCart] Offline fallback successful");
                  break;
                } catch (offlineError) {
                  console.error(
                    "[useShoppingCart] Offline fallback failed:",
                    offlineError,
                  );
                }
              }

              if (attempt === maxRetries) {
                throw error;
              }
              continue; // Try next attempt
            }

            // Success!
            insertData_result = data;
            insertSuccess = true;
            console.log(
              `[useShoppingCart] Successfully added to Supabase on attempt ${attempt}`,
            );

            // Dismiss retry toast if shown
            if (retryToast) {
              try {
                if (typeof retryToast.dismiss === "function") {
                  retryToast.dismiss();
                }
              } catch (e) {
                console.warn("Error dismissing retry toast:", e);
              }
            }

            break;
          } catch (attemptError) {
            lastError = attemptError;
            console.error(
              `[useShoppingCart] Insert attempt ${attempt} error:`,
              attemptError,
            );

            if (attempt === maxRetries) {
              // All retries failed
              if (retryToast) {
                try {
                  if (typeof retryToast.dismiss === "function") {
                    retryToast.dismiss();
                  }
                } catch (e) {
                  console.warn("Error dismissing retry toast:", e);
                }
              }
              throw attemptError;
            }
          }
        }

        if (insertSuccess) {
          if (!offlineFallbackUsed && insertData_result) {
            setCartItems((prev) => [insertData_result, ...prev]);
          }
          // Clear any previous failed booking since this one succeeded
          setLastFailedBooking(null);

          // Clear any offline items that were successfully synced
          if (!offlineFallbackUsed) {
            try {
              localStorage.removeItem("offline_cart_items");
            } catch (e) {
              console.warn("Error clearing offline items:", e);
            }
          }
        } else {
          // 🎯 CRITICAL: Save failed booking for retry and return failure status
          console.error(
            "[useShoppingCart] All insert attempts failed, saving for retry",
          );
          setLastFailedBooking(item);
          try {
            localStorage.setItem(
              "failed_booking_draft",
              JSON.stringify({
                item,
                timestamp: Date.now(),
                attempts: maxRetries,
              }),
            );
          } catch (storageError) {
            console.warn(
              "Error saving failed booking to localStorage:",
              storageError,
            );
          }
          throw lastError || new Error("Insert failed after all retries");
        }
      } else {
        // Guest user - save to localStorage
        console.log("[useShoppingCart] Adding to localStorage for guest user");
        const updatedCart = [newItem, ...cartItems];
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
        setCartItems(updatedCart);
      }

      console.log("[useShoppingCart] Showing success toast...");
      // Show success toast with timeout protection - ONLY if actually successful
      try {
        if (offlineFallbackUsed) {
          toast({
            title: "📱 Item disimpan offline",
            description: `${item.service_name} disimpan sementara. Akan disinkronkan saat online.`,
          });
        } else {
          toast({
            title: "✅ Item berhasil ditambahkan",
            description: `${item.service_name} berhasil disimpan ke server.`,
          });
        }
      } catch (toastError) {
        console.warn(
          "[useShoppingCart] Toast error (non-critical):",
          toastError,
        );
      }
      console.log(
        "[useShoppingCart] AddToCart operation completed successfully",
      );
      return { success: true }; // 🎯 CRITICAL: Return success status
    } catch (error) {
      console.error("[useShoppingCart] Error adding item to cart:", error);

      // 🎯 CRITICAL: Save failed booking for retry
      setLastFailedBooking(item);
      try {
        localStorage.setItem(
          "failed_booking_draft",
          JSON.stringify({
            item,
            timestamp: Date.now(),
            error: error?.message || "Unknown error",
          }),
        );
      } catch (storageError) {
        console.warn(
          "Error saving failed booking to localStorage:",
          storageError,
        );
      }

      // Enhanced error classification
      const isTimeoutError = error.message && error.message.includes("timeout");
      const isNetworkError =
        error.message &&
        (error.message.includes("network") ||
          error.message.includes("fetch") ||
          error.message.includes("connection") ||
          error.message.includes("NetworkError") ||
          error.message.includes("Failed to fetch"));
      const isSessionError =
        error.message &&
        (error.message.includes("Session") ||
          error.message.includes("session") ||
          error.message.includes("auth") ||
          error.message.includes("Authentication"));

      let errorMessage =
        "❌ Gagal menyimpan booking ke server. Silakan coba ulang.";

      if (isTimeoutError || isNetworkError) {
        errorMessage =
          "❌ Koneksi bermasalah. Booking gagal disimpan ke server. Silakan coba lagi.";
      } else if (isSessionError) {
        errorMessage =
          "❌ Sesi tidak valid. Silakan refresh halaman dan coba lagi.";
      }

      // Show error toast with retry option
      toast({
        title: "Gagal Menyimpan Booking",
        description: errorMessage,
        variant: "destructive",
      });

      console.log("[useShoppingCart] Returning failure status");
      return { success: false, error: errorMessage }; // 🎯 CRITICAL: Return failure status
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
            "[useShoppingCart] Using AuthContext for remove operation...",
          );

          console.log("[useShoppingCart] Auth state for remove:", {
            isAuthenticated,
            hasUserId: !!userId,
            userEmail,
          });

          if (isAuthenticated && userId) {
            // Remove from Supabase for authenticated users
            console.log(
              "[useShoppingCart] Removing from Supabase for user:",
              userId,
              "item ID:",
              id,
            );

            const { data: deletedData, error } = await supabase
              .from("shopping_cart")
              .delete()
              .eq("id", id)
              .eq("user_id", userId)
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
            "[useShoppingCart] Using AuthContext for clear operation...",
          );

          console.log("[useShoppingCart] Auth state for clear:", {
            isAuthenticated,
            hasUserId: !!userId,
            userEmail,
          });

          if (isAuthenticated && userId) {
            // Clear from Supabase for authenticated users
            console.log(
              "[useShoppingCart] Clearing cart from Supabase for user:",
              userId,
            );

            const { data: deletedData, error } = await supabase
              .from("shopping_cart")
              .delete()
              .eq("user_id", userId)
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
      // Use AuthContext instead of direct Supabase access
      // For guest users, we need customer data
      if (!isAuthenticated && !customerData) {
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
        user_id: userId || null,
        amount: totalAmount,
        payment_method: customerData?.paymentMethod || "pending",
        status: "pending",
        is_partial_payment: "false",
        is_damage_payment: false,
        created_at: new Date().toISOString(),
        // Add customer data for guest users
        ...(customerData &&
          !isAuthenticated && {
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
            customer_name: customerData?.name || userEmail || "Guest",
            customer_email: customerData?.email || userEmail || "",
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
            customer_id: userId || null,
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
            customer_name: customerData?.name || userEmail || "Guest",
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
            customer_id: userId || null,
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
              customer_id: userId || null,
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

  // 🎯 Retry function for failed bookings
  const retryLastBooking = async () => {
    if (!lastFailedBooking) {
      console.warn("[useShoppingCart] No failed booking to retry");
      toast({
        title: "Tidak Ada Booking untuk Dicoba Ulang",
        description: "Tidak ada booking yang gagal untuk dicoba ulang.",
        variant: "destructive",
      });
      return;
    }

    console.log(
      "[useShoppingCart] Retrying last failed booking:",
      lastFailedBooking.service_name,
    );

    toast({
      title: "🔁 Mencoba Kirim Ulang...",
      description: `Sedang mencoba menyimpan ${lastFailedBooking.service_name} ke server.`,
    });

    const result = await addToCart(lastFailedBooking);

    if (result.success) {
      toast({
        title: "✅ Berhasil!",
        description: `${lastFailedBooking.service_name} berhasil disimpan ke server.`,
      });
      setLastFailedBooking(null);
      try {
        localStorage.removeItem("failed_booking_draft");
      } catch (storageError) {
        console.warn(
          "Error removing failed booking from localStorage:",
          storageError,
        );
      }
    } else {
      toast({
        title: "❌ Masih Gagal",
        description: "Booking masih gagal disimpan. Silakan coba lagi nanti.",
        variant: "destructive",
      });
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
    retryLastBooking,
    isTabRecentlyActivated,
  };

  // Provide a stable context value even during initialization
  const stableValue = React.useMemo(() => {
    if (!isInitialized) {
      // Return a minimal context during initialization to prevent undefined errors
      return {
        cartItems: [],
        addToCart: async () => ({
          success: false,
          error: "Cart not initialized",
        }),
        removeFromCart: async () => {},
        clearCart: async () => {},
        totalAmount: 0,
        checkout: async () => {
          throw new Error("Cart not initialized");
        },
        isLoading: true,
        cartCount: 0,
        refetchCartData: async () => {},
        retryLastBooking: async () => {},
        isTabRecentlyActivated: false,
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
    if (context === undefined || context === null) {
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
        cartItems.unshift(newItem);
        localStorage.setItem("shopping_cart", JSON.stringify(cartItems));
        console.log("Item saved to localStorage fallback");

        // Dispatch a custom event to notify other components
        window.dispatchEvent(
          new CustomEvent("cartUpdated", {
            detail: { action: "add", item: newItem },
          }),
        );
        return { success: true };
      } catch (storageError) {
        console.warn("Failed to save to localStorage fallback:", storageError);
        return { success: false, error: "Failed to save to localStorage" };
      }
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
    retryLastBooking: async () => {
      console.warn("retryLastBooking called from fallback context");
      return Promise.resolve();
    },
    isTabRecentlyActivated: false,
  };
};

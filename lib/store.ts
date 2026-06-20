import { create } from 'zustand';

export interface CartItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  discount: number; // Item-level discount percentage (e.g. 10 for 10% off)
  tax: number; // Tax percentage (5, 12, 18, 28)
  isVeg: boolean;
}

export interface CustomerInfo {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
}

export interface TableCart {
  items: CartItem[];
  customer: CustomerInfo | null;
  couponCode: string;
  activeMode: 'qty' | 'price' | 'disc';
  keyBuffer: string;
  selectedItemId: string | null; // Product ID of the selected line item
}

interface CartStore {
  carts: Record<string, TableCart>;
  getCart: (tableId: string) => TableCart;
  addToCart: (tableId: string, product: { _id: string; name: string; price: number; tax: number; isVeg: boolean }) => void;
  removeFromCart: (tableId: string, productId: string) => void;
  updateQty: (tableId: string, productId: string, qty: number) => void;
  updatePrice: (tableId: string, productId: string, price: number) => void;
  updateDiscount: (tableId: string, productId: string, discount: number) => void;
  setCustomer: (tableId: string, customer: CustomerInfo | null) => void;
  applyCoupon: (tableId: string, couponCode: string) => void;
  clearCart: (tableId: string) => void;
  setMode: (tableId: string, mode: 'qty' | 'price' | 'disc') => void;
  selectItem: (tableId: string, productId: string | null) => void;
  pressKeypad: (tableId: string, key: string) => void;
}

const initialCartState = (): TableCart => ({
  items: [],
  customer: null,
  couponCode: '',
  activeMode: 'qty',
  keyBuffer: '',
  selectedItemId: null,
});

export const useCartStore = create<CartStore>((set, get) => ({
  carts: {},

  getCart: (tableId) => {
    return get().carts[tableId] || initialCartState();
  },

  addToCart: (tableId, product) => {
    set((state) => {
      const current = state.carts[tableId] || initialCartState();
      const existingIndex = current.items.findIndex((item) => item.productId === product._id);

      const newItems = [...current.items];

      if (existingIndex > -1) {
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          qty: newItems[existingIndex].qty + 1,
        };
      } else {
        newItems.push({
          productId: product._id,
          name: product.name,
          qty: 1,
          price: product.price,
          discount: 0,
          tax: product.tax || 0,
          isVeg: product.isVeg,
        });
      }

      return {
        carts: {
          ...state.carts,
          [tableId]: {
            ...current,
            items: newItems,
            selectedItemId: product._id, // Auto-select added item
            keyBuffer: '', // Reset keypad buffer
          },
        },
      };
    });
  },

  removeFromCart: (tableId, productId) => {
    set((state) => {
      const current = state.carts[tableId] || initialCartState();
      const newItems = current.items.filter((item) => item.productId !== productId);
      const nextSelected = current.selectedItemId === productId 
        ? (newItems.length > 0 ? newItems[newItems.length - 1].productId : null)
        : current.selectedItemId;

      return {
        carts: {
          ...state.carts,
          [tableId]: {
            ...current,
            items: newItems,
            selectedItemId: nextSelected,
            keyBuffer: '',
          },
        },
      };
    });
  },

  updateQty: (tableId, productId, qty) => {
    set((state) => {
      const current = state.carts[tableId] || initialCartState();
      const newItems = current.items.map((item) =>
        item.productId === productId ? { ...item, qty: Math.max(1, qty) } : item
      );

      return {
        carts: {
          ...state.carts,
          [tableId]: { ...current, items: newItems },
        },
      };
    });
  },

  updatePrice: (tableId, productId, price) => {
    set((state) => {
      const current = state.carts[tableId] || initialCartState();
      const newItems = current.items.map((item) =>
        item.productId === productId ? { ...item, price: Math.max(0, price) } : item
      );

      return {
        carts: {
          ...state.carts,
          [tableId]: { ...current, items: newItems },
        },
      };
    });
  },

  updateDiscount: (tableId, productId, discount) => {
    set((state) => {
      const current = state.carts[tableId] || initialCartState();
      const newItems = current.items.map((item) =>
        item.productId === productId ? { ...item, discount: Math.min(100, Math.max(0, discount)) } : item
      );

      return {
        carts: {
          ...state.carts,
          [tableId]: { ...current, items: newItems },
        },
      };
    });
  },

  setCustomer: (tableId, customer) => {
    set((state) => {
      const current = state.carts[tableId] || initialCartState();
      return {
        carts: {
          ...state.carts,
          [tableId]: { ...current, customer },
        },
      };
    });
  },

  applyCoupon: (tableId, couponCode) => {
    set((state) => {
      const current = state.carts[tableId] || initialCartState();
      return {
        carts: {
          ...state.carts,
          [tableId]: { ...current, couponCode },
        },
      };
    });
  },

  clearCart: (tableId) => {
    set((state) => ({
      carts: {
        ...state.carts,
        [tableId]: initialCartState(),
      },
    }));
  },

  setMode: (tableId, activeMode) => {
    set((state) => {
      const current = state.carts[tableId] || initialCartState();
      return {
        carts: {
          ...state.carts,
          [tableId]: { ...current, activeMode, keyBuffer: '' },
        },
      };
    });
  },

  selectItem: (tableId, productId) => {
    set((state) => {
      const current = state.carts[tableId] || initialCartState();
      return {
        carts: {
          ...state.carts,
          [tableId]: { ...current, selectedItemId: productId, keyBuffer: '' },
        },
      };
    });
  },

  pressKeypad: (tableId, key) => {
    set((state) => {
      const current = state.carts[tableId] || initialCartState();
      const { selectedItemId, activeMode, keyBuffer } = current;

      if (!selectedItemId) return {};

      let nextBuffer = keyBuffer;
      if (key === 'C') {
        nextBuffer = '';
      } else if (key === '⌫') {
        nextBuffer = nextBuffer.slice(0, -1);
      } else if (key === '.' && !nextBuffer.includes('.')) {
        nextBuffer = nextBuffer ? nextBuffer + '.' : '0.';
      } else if (key !== '.') {
        nextBuffer += key;
      }

      // Convert buffer value to number
      const numericValue = parseFloat(nextBuffer) || 0;

      // Apply buffer to selected item based on mode
      const newItems = current.items.map((item) => {
        if (item.productId !== selectedItemId) return item;

        if (activeMode === 'qty') {
          return { ...item, qty: numericValue || 1 };
        } else if (activeMode === 'price') {
          return { ...item, price: numericValue };
        } else if (activeMode === 'disc') {
          return { ...item, discount: Math.min(100, numericValue) };
        }
        return item;
      });

      return {
        carts: {
          ...state.carts,
          [tableId]: {
            ...current,
            items: newItems,
            keyBuffer: nextBuffer,
          },
        },
      };
    });
  },
}));

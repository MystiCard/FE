import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './styles/index.css';
import { CartProvider } from './hooks/useCart.tsx';
import { WishlistProvider } from './hooks/useWishlist.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <CartProvider>
            <WishlistProvider>
                <App />
            </WishlistProvider>
        </CartProvider>
    </React.StrictMode>,
)

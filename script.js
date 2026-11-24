/* BEYOND STYLE storefront interactions */
(() => {
    'use strict';

    const CART_KEY = 'beyondStyleCart';
    const WISHLIST_KEY = 'beyondStyleWishlist';
    const root = document.body;
    const header = document.querySelector('.site-header');
    const headerContent = document.querySelector('.header-content');
    const mainNavigation = document.querySelector('.primary-navigation');
    const utilityList = document.querySelector('.utility-list');
    const productCards = [...document.querySelectorAll('.product-card')];
    const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

    const readStorage = (key, fallback) => {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return value ?? fallback;
        } catch (error) {
            console.warn(`Could not read ${key} from localStorage.`, error);
            return fallback;
        }
    };
    const writeStorage = (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn(`Could not save ${key} to localStorage.`, error);
            notify('Your changes could not be saved on this device.');
            return false;
        }
    };

    let cart = Array.isArray(readStorage(CART_KEY, [])) ? readStorage(CART_KEY, []) : [];
    let wishlist = Array.isArray(readStorage(WISHLIST_KEY, [])) ? readStorage(WISHLIST_KEY, []) : [];
    let activeFilter = 'all';

    function createElement(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function notify(message) {
        let toast = document.querySelector('.storefront-notification');
        if (!toast) {
            toast = createElement('div', 'storefront-notification');
            Object.assign(toast.style, {
                position: 'fixed', zIndex: '1000', right: '1.25rem', bottom: '1.25rem', maxWidth: 'min(24rem, calc(100vw - 2.5rem))',
                padding: '1rem 1.3rem', background: '#171717', color: '#fff', boxShadow: '0 8px 30px #0003', font: '500 .8rem Poppins, sans-serif',
                opacity: '0', transform: 'translateY(12px)', transition: 'opacity .25s ease, transform .25s ease', pointerEvents: 'none'
            });
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            root.append(toast);
        }
        toast.textContent = message;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        clearTimeout(notify.timer);
        notify.timer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(12px)';
        }, 3200);
    }

    function productInfo(card) {
        const title = card.querySelector('.product-details h3')?.textContent.trim() || 'Fashion item';
        const priceText = card.querySelector('.product-price')?.textContent || '';
        const price = Number(priceText.replace(/[^\d.]/g, '')) || 0;
        const link = card.querySelector('.product-image-link')?.getAttribute('href') || '#';
        const image = card.querySelector('.product-image-link img');
        const id = link;
        return { id, title, price, link, image: image?.currentSrc || image?.src || '', alt: image?.alt || title };
    }

    // Runtime-created cart panel and accessible toggle for the existing bag icon.
    const cartPanel = createElement('aside', 'storefront-cart-panel');
    cartPanel.id = 'storefront-cart-panel';
    cartPanel.setAttribute('aria-label', 'Shopping bag');
    cartPanel.setAttribute('aria-hidden', 'true');
    Object.assign(cartPanel.style, {
        position: 'fixed', zIndex: '900', top: '0', right: '0', width: 'min(420px, 100vw)', height: '100dvh', padding: '1.4rem',
        display: 'flex', flexDirection: 'column', background: '#fff', boxShadow: '-8px 0 32px #0002', transform: 'translateX(105%)',
        transition: 'transform .3s ease', overflowY: 'auto'
    });
    const cartHeader = createElement('div');
    Object.assign(cartHeader.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e8dfd3', paddingBottom: '.8rem' });
    cartHeader.append(createElement('h2', '', 'Your Shopping Bag'));
    const closeCart = createElement('button', '', 'Close');
    closeCart.type = 'button';
    closeCart.setAttribute('aria-label', 'Close shopping bag');
    Object.assign(closeCart.style, { border: '0', background: 'transparent', cursor: 'pointer', padding: '.5rem', font: 'inherit' });
    cartHeader.append(closeCart);
    const cartItems = createElement('div', 'cart-items');
    Object.assign(cartItems.style, { flex: '1', padding: '1rem 0' });
    const cartFooter = createElement('div', 'cart-footer');
    Object.assign(cartFooter.style, { borderTop: '1px solid #e8dfd3', paddingTop: '1rem' });
    const cartTotal = createElement('p', '', 'Total: $0.00');
    cartTotal.setAttribute('aria-live', 'polite');
    cartFooter.append(cartTotal);
    cartPanel.append(cartHeader, cartItems, cartFooter);
    root.append(cartPanel);

    let cartCount = utilityList?.querySelector('[data-cart-count]');
    const bagLink = utilityList?.querySelector('a[aria-label="Shopping bag"]');
    if (bagLink) {
        bagLink.href = '#storefront-cart-panel';
        bagLink.setAttribute('aria-controls', cartPanel.id);
        bagLink.setAttribute('aria-expanded', 'false');
        cartCount = createElement('span', 'cart-count');
        cartCount.dataset.cartCount = '';
        Object.assign(cartCount.style, { position: 'absolute', margin: '-1.15rem 0 0 1rem', minWidth: '17px', padding: '0 .25rem', borderRadius: '50%', background: '#b69a72', color: '#171717', font: '500 .58rem Poppins, sans-serif', textAlign: 'center' });
        bagLink.style.position = 'relative';
        bagLink.append(cartCount);
    }

    function renderCart() {
        if (!cartItems) return;
        cartItems.replaceChildren();
        let total = 0;
        let quantityTotal = 0;
        if (!cart.length) {
            const empty = createElement('p', '', 'Your bag is waiting for something special.');
            Object.assign(empty.style, { color: '#77736e', textAlign: 'center', padding: '2rem .5rem' });
            cartItems.append(empty);
        }
        cart.forEach((item) => {
            const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
            total += (Number(item.price) || 0) * quantity;
            quantityTotal += quantity;
            const row = createElement('div', 'cart-item');
            Object.assign(row.style, { display: 'grid', gridTemplateColumns: '72px 1fr auto', gap: '.85rem', alignItems: 'center', padding: '.85rem 0', borderBottom: '1px solid #eee' });
            if (item.image) {
                const image = createElement('img');
                image.src = item.image;
                image.alt = item.alt || item.title;
                Object.assign(image.style, { width: '72px', height: '90px', objectFit: 'cover', background: '#f8f6f2' });
                row.append(image);
            }
            const details = createElement('div');
            const name = createElement('p', '', item.title);
            Object.assign(name.style, { margin: '0 0 .25rem', font: '500 .82rem Poppins, sans-serif' });
            const price = createElement('p', '', `${money.format(item.price)} · Qty ${quantity}`);
            Object.assign(price.style, { margin: '0', color: '#77736e', fontSize: '.75rem' });
            const controls = createElement('div');
            Object.assign(controls.style, { display: 'flex', alignItems: 'center', gap: '.35rem', marginTop: '.55rem' });
            [['−', -1, 'Decrease quantity'], ['+', 1, 'Increase quantity']].forEach(([label, change, aria]) => {
                const control = createElement('button', '', label);
                control.type = 'button';
                control.setAttribute('aria-label', `${aria} for ${item.title}`);
                control.dataset.cartChange = String(change);
                control.dataset.productId = item.id;
                Object.assign(control.style, { width: '27px', height: '27px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' });
                controls.append(control);
            });
            details.append(name, price, controls);
            const remove = createElement('button', '', 'Remove');
            remove.type = 'button';
            remove.dataset.removeProduct = item.id;
            remove.setAttribute('aria-label', `Remove ${item.title} from bag`);
            Object.assign(remove.style, { border: '0', background: 'transparent', color: '#77736e', cursor: 'pointer', font: '.65rem Poppins, sans-serif' });
            row.append(details, remove);
            cartItems.append(row);
        });
        cartTotal.textContent = `Total: ${money.format(total)}`;
        if (cartCount) cartCount.textContent = String(quantityTotal);
        if (bagLink) bagLink.setAttribute('aria-label', `Shopping bag, ${quantityTotal} ${quantityTotal === 1 ? 'item' : 'items'}`);
    }

    function setCartOpen(open) {
        cartPanel.style.transform = open ? 'translateX(0)' : 'translateX(105%)';
        cartPanel.setAttribute('aria-hidden', String(!open));
        bagLink?.setAttribute('aria-expanded', String(open));
        if (open) closeCart.focus();
    }

    function addToCart(card) {
        const product = productInfo(card);
        const existing = cart.find((item) => item.id === product.id);
        if (existing) existing.quantity = Math.min(99, (Number(existing.quantity) || 1) + 1);
        else cart.push({ ...product, quantity: 1 });
        writeStorage(CART_KEY, cart);
        renderCart();
        notify(`${product.title} added to your bag.`);
    }

    bagLink?.addEventListener('click', (event) => { event.preventDefault(); setCartOpen(true); });
    closeCart.addEventListener('click', () => setCartOpen(false));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setCartOpen(false); });
    cartPanel.addEventListener('click', (event) => {
        const removeButton = event.target.closest('[data-remove-product]');
        const changeButton = event.target.closest('[data-cart-change]');
        if (removeButton) {
            cart = cart.filter((item) => item.id !== removeButton.dataset.removeProduct);
            writeStorage(CART_KEY, cart);
            renderCart();
        }
        if (changeButton) {
            const item = cart.find((entry) => entry.id === changeButton.dataset.productId);
            if (!item) return;
            item.quantity = Math.max(1, Math.min(99, (Number(item.quantity) || 1) + Number(changeButton.dataset.cartChange)));
            writeStorage(CART_KEY, cart);
            renderCart();
        }
    });
    renderCart();

    // Inject one toggle because the supplied navigation markup has no mobile control.
    if (headerContent && mainNavigation) {
        const menuButton = createElement('button', 'mobile-menu-toggle', 'Menu');
        menuButton.type = 'button';
        menuButton.setAttribute('aria-controls', 'main-navigation');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', 'Open navigation menu');
        Object.assign(menuButton.style, { display: 'none', border: '1px solid #e8dfd3', background: 'transparent', padding: '.4rem .65rem', font: '500 .65rem Poppins, sans-serif', letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' });
        mainNavigation.id = 'main-navigation';
        mainNavigation.insertAdjacentElement('beforebegin', menuButton);
        const mobileQuery = window.matchMedia('(max-width: 760px)');
        const updateMenuLayout = () => {
            const mobile = mobileQuery.matches;
            menuButton.style.display = mobile ? 'inline-flex' : 'none';
            if (!mobile) {
                mainNavigation.hidden = false;
                menuButton.setAttribute('aria-expanded', 'false');
            } else if (menuButton.getAttribute('aria-expanded') !== 'true') {
                mainNavigation.hidden = true;
            }
        };
        menuButton.addEventListener('click', () => {
            const open = menuButton.getAttribute('aria-expanded') !== 'true';
            menuButton.setAttribute('aria-expanded', String(open));
            menuButton.setAttribute('aria-label', `${open ? 'Close' : 'Open'} navigation menu`);
            menuButton.textContent = open ? 'Close' : 'Menu';
            mainNavigation.hidden = !open;
        });
        mainNavigation.addEventListener('click', (event) => {
            if (!event.target.closest('a')) return;
            if (mobileQuery.matches) {
                mainNavigation.hidden = true;
                menuButton.setAttribute('aria-expanded', 'false');
                menuButton.setAttribute('aria-label', 'Open navigation menu');
                menuButton.textContent = 'Menu';
            }
        });
        mobileQuery.addEventListener('change', updateMenuLayout);
        updateMenuLayout();
    }

    // Use native smooth scrolling for in-page links while retaining sensible fallback behavior.
    document.addEventListener('click', (event) => {
        const link = event.target.closest('a[href^="#"]');
        if (!link) return;
        const target = document.querySelector(link.getAttribute('href'));
        if (!target || target === cartPanel) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        if (link.matches('.navigation-list a')) {
            document.querySelectorAll('.navigation-list a[aria-current="location"]').forEach((item) => item.removeAttribute('aria-current'));
            link.setAttribute('aria-current', 'location');
        }
    });

    // Existing product-card links styled as shopping actions now add to the local demo cart.
    document.querySelectorAll('.product-details .button, .product-details > .text-link').forEach((action) => {
        action.href = '#';
        action.setAttribute('role', 'button');
        action.setAttribute('aria-label', `Add ${action.closest('.product-card')?.querySelector('.product-details h3')?.textContent.trim() || 'product'} to bag`);
    });
    const productGridRoot = document.querySelector('main');
    productGridRoot?.addEventListener('click', (event) => {
        const action = event.target.closest('.product-details .button, .product-details > .text-link');
        if (action) {
            event.preventDefault();
            const card = action.closest('.product-card');
            if (card) addToCart(card);
        }
    });

    // Wishlist controls are added to each existing product card.
    productCards.forEach((card) => {
        const product = productInfo(card);
        const imageLink = card.querySelector('.product-image-link');
        if (!imageLink) return;
        const imageWrap = imageLink.parentElement;
        if (!imageWrap) return;
        imageWrap.style.position = 'relative';
        const favorite = createElement('button', 'wishlist-toggle', wishlist.includes(product.id) ? '♥' : '♡');
        favorite.type = 'button';
        favorite.dataset.favoriteId = product.id;
        favorite.setAttribute('aria-pressed', String(wishlist.includes(product.id)));
        favorite.setAttribute('aria-label', `${wishlist.includes(product.id) ? 'Remove from' : 'Add to'} wishlist: ${product.title}`);
        Object.assign(favorite.style, { position: 'absolute', top: '.7rem', right: '.7rem', zIndex: '2', width: '40px', height: '40px', border: '0', borderRadius: '50%', background: '#ffffffed', color: wishlist.includes(product.id) ? '#b69a72' : '#171717', fontSize: '1.35rem', cursor: 'pointer' });
        imageWrap.append(favorite);
    });
    document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-favorite-id]');
        if (!button) return;
        const id = button.dataset.favoriteId;
        const selected = wishlist.includes(id);
        wishlist = selected ? wishlist.filter((entry) => entry !== id) : [...wishlist, id];
        writeStorage(WISHLIST_KEY, wishlist);
        button.textContent = selected ? '♡' : '♥';
        button.style.color = selected ? '#171717' : '#b69a72';
        button.setAttribute('aria-pressed', String(!selected));
        button.setAttribute('aria-label', `${selected ? 'Add to' : 'Remove from'} wishlist: ${button.closest('.product-card')?.querySelector('.product-details h3')?.textContent.trim() || 'product'}`);
        notify(selected ? 'Removed from your wishlist.' : 'Saved to your wishlist.');
    });

    // Provide live search panel from the existing search utility icon.
    const searchLink = utilityList?.querySelector('a[aria-label="Search"]');
    if (searchLink && productCards.length) {
        const searchBox = createElement('section', 'storefront-search');
        searchBox.setAttribute('aria-label', 'Search products');
        Object.assign(searchBox.style, { position: 'absolute', zIndex: '60', top: '100%', right: 'var(--page-gutter, 5vw)', width: 'min(440px, calc(100vw - 2rem))', padding: '1rem', background: '#fff', boxShadow: '0 12px 28px #0002' });
        searchBox.hidden = true;
        const searchInput = createElement('input');
        searchInput.type = 'search';
        searchInput.placeholder = 'Search products';
        searchInput.setAttribute('aria-label', 'Search products by name');
        Object.assign(searchInput.style, { width: '100%', padding: '.75rem', border: '1px solid #d8d0c6', font: 'inherit' });
        const searchResults = createElement('div', 'search-results');
        searchResults.setAttribute('aria-live', 'polite');
        Object.assign(searchResults.style, { maxHeight: '55vh', overflowY: 'auto' });
        searchBox.append(searchInput, searchResults);
        header?.append(searchBox);
        searchLink.href = '#search';
        searchLink.setAttribute('aria-expanded', 'false');
        searchLink.addEventListener('click', (event) => {
            event.preventDefault();
            searchBox.hidden = !searchBox.hidden;
            searchLink.setAttribute('aria-expanded', String(!searchBox.hidden));
            if (!searchBox.hidden) searchInput.focus();
        });
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim().toLowerCase();
            const matches = productCards.filter((card) => productInfo(card).title.toLowerCase().includes(query));
            searchResults.replaceChildren();
            if (!query) {
                searchResults.append(createElement('p', '', 'Enter a product name to search.'));
                return;
            }
            if (!matches.length) {
                searchResults.append(createElement('p', '', 'No products match your search. Try another name.'));
                return;
            }
            matches.forEach((card) => {
                const product = productInfo(card);
                const result = createElement('a', 'search-result', `${product.title} · ${money.format(product.price)}`);
                result.href = product.link;
                Object.assign(result.style, { display: 'block', padding: '.7rem .25rem', borderBottom: '1px solid #eee', fontSize: '.8rem' });
                result.addEventListener('click', (event) => {
                    event.preventDefault();
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    searchBox.hidden = true;
                    searchLink.setAttribute('aria-expanded', 'false');
                });
                searchResults.append(result);
            });
        });
    }

    // Category filter controls are generated because the supplied markup has no filter UI or category metadata.
    const arrivals = document.querySelector('.new-arrivals-section');
    const filterLabels = [
        ['all', 'All'], ['women', 'Women'], ['men', 'Men'], ['shoes', 'Shoes'], ['accessories', 'Accessories']
    ];
    if (arrivals && productCards.length) {
        const filterBar = createElement('div', 'product-filters');
        Object.assign(filterBar.style, { width: 'min(1500px, 100%)', margin: '-1.4rem auto 2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '.5rem' });
        filterLabels.forEach(([value, label]) => {
            const filter = createElement('button', 'product-filter', label);
            filter.type = 'button';
            filter.dataset.filter = value;
            filter.setAttribute('aria-pressed', String(value === activeFilter));
            Object.assign(filter.style, { padding: '.55rem .9rem', border: '1px solid #d9d2c9', background: value === activeFilter ? '#171717' : 'transparent', color: value === activeFilter ? '#fff' : '#171717', font: '500 .62rem Poppins, sans-serif', letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' });
            filterBar.append(filter);
        });
        arrivals.querySelector('.product-grid')?.insertAdjacentElement('beforebegin', filterBar);
        filterBar.addEventListener('click', (event) => {
            const filter = event.target.closest('[data-filter]');
            if (!filter) return;
            activeFilter = filter.dataset.filter;
            filterBar.querySelectorAll('[data-filter]').forEach((button) => {
                const selected = button === filter;
                button.setAttribute('aria-pressed', String(selected));
                button.style.background = selected ? '#171717' : 'transparent';
                button.style.color = selected ? '#fff' : '#171717';
            });
            const termByCategory = { women: 'coat', men: 'blazer', shoes: 'loafer', accessories: 'tote' };
            const term = termByCategory[activeFilter];
            productCards.forEach((card) => {
                const title = productInfo(card).title.toLowerCase();
                const categoryMatch = activeFilter === 'all' || title.includes(term);
                card.hidden = !categoryMatch;
            });
            const visible = productCards.filter((card) => !card.hidden).length;
            let noResults = arrivals.querySelector('.filter-empty-message');
            if (!visible) {
                if (!noResults) {
                    noResults = createElement('p', 'filter-empty-message', 'No products are currently listed in this category.');
                    noResults.style.textAlign = 'center';
                    arrivals.querySelector('.product-grid')?.append(noResults);
                }
            } else noResults?.remove();
        });
    }

    // Newsletter submission is validated locally; no email is sent to a server.
    const newsletter = document.querySelector('.newsletter-form');
    newsletter?.addEventListener('submit', (event) => {
        event.preventDefault();
        const email = newsletter.querySelector('input[type="email"]');
        if (!email) return;
        const value = email.value.trim();
        if (!value || !email.checkValidity()) {
            email.setCustomValidity('Please enter a valid email address.');
            email.reportValidity();
            email.addEventListener('input', () => email.setCustomValidity(''), { once: true });
            return;
        }
        notify('Thank you for subscribing. This front-end demo does not send emails to a server.');
        newsletter.reset();
    });

    // Reveal elements as they enter the viewport, while respecting reduced motion.
    if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const revealTargets = document.querySelectorAll('.category-card, .product-card, .featured-content, .about-content, .newsletter-content');
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            });
        }, { threshold: .12 });
        revealTargets.forEach((element) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(18px)';
            element.style.transition = 'opacity .55s ease, transform .55s ease';
            revealObserver.observe(element);
        });
    }

    // Add back-to-top affordance only after the visitor scrolls down.
    const backToTop = createElement('button', 'back-to-top', '↑');
    backToTop.type = 'button';
    backToTop.setAttribute('aria-label', 'Back to top');
    Object.assign(backToTop.style, { position: 'fixed', right: '1.25rem', bottom: '1.25rem', zIndex: '800', width: '44px', height: '44px', border: '1px solid #b69a72', borderRadius: '50%', background: '#171717', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', opacity: '0', visibility: 'hidden', transform: 'translateY(8px)', transition: 'opacity .2s ease, transform .2s ease, visibility .2s' });
    root.append(backToTop);
    const updateBackToTop = () => {
        const visible = window.scrollY > 500;
        backToTop.style.opacity = visible ? '1' : '0';
        backToTop.style.visibility = visible ? 'visible' : 'hidden';
        backToTop.style.transform = visible ? 'translateY(0)' : 'translateY(8px)';
    };
    window.addEventListener('scroll', updateBackToTop, { passive: true });
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));

    // Highlight the nearest visible page section in the primary navigation.
    if ('IntersectionObserver' in window) {
        const navLinks = [...document.querySelectorAll('.navigation-list a[href^="#"]')];
        const sectionTargets = navLinks.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
        const sectionObserver = new IntersectionObserver((entries) => {
            const current = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (!current) return;
            navLinks.forEach((link) => {
                if (link.getAttribute('href') === `#${current.target.id}`) link.setAttribute('aria-current', 'location');
                else link.removeAttribute('aria-current');
            });
        }, { rootMargin: '-20% 0px -65% 0px', threshold: [0, .2, .5] });
        sectionTargets.forEach((section) => sectionObserver.observe(section));
    }
})();

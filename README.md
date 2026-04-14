# Pokemon Store — Microfrontends

A modular e-commerce application built with **Module Federation** pattern — one Shell host orchestrating three microfrontends in different frameworks.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Shell (:3000)                        │
│                   (React 19 + Webpack 5)                     │
│                                                              │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  mf-topbar   │  │   mf-dashboard   │  │    mf-cart    │  │
│  │  (:3002)     │  │     (:4200)      │  │    (:3001)    │  │
│  │  Vanilla JS  │  │     React 19      │  │     React     │  │
│  └──────────────┘  └──────────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Features

- **Dashboard**: Lista de Pokémon con filtros por tipo y botón "Agregar" al carrito
- **Cart**: Carrito de compras con gestión de cantidades y precios
- **Topbar**: Navegación con badge del carrito actualizado en tiempo real
- **Comunicación**: Eventos custom para comunicar MFs sin acoplamiento

## Prerequisites

- **Node.js 18+** (usa `nvm use` para activar)
- **npm 9+**

## Quick Start

```bash
# Instalar dependencias
npm install --legacy-peer-deps

# Iniciar todos los servicios
npm run start --workspace=mf-dashboard  # Puerto 4200
npm run start --workspace=mf-cart       # Puerto 3001
npm run start --workspace=mf-topbar      # Puerto 3002
npm run start --workspace=shell          # Puerto 3000

# O abre http://localhost:3000 en el navegador
```

## Port Map

| App | Port | Purpose |
|-----|------|---------|
| Shell | 3000 | Host — navigation, routing, MF orchestration |
| mf-topbar | 3002 | Vanilla JS — cart badge, always visible |
| mf-dashboard | 4200 | React 19 — Pokemon list con botón agregar |
| mf-cart | 3001 | React 19 — shopping cart |

## Custom Events Contract

| Event | Fired By | Payload |
|-------|---------|---------|
| `pokemon:selected` | mf-dashboard | `{id, name, image, price}` |
| `cart:updated` | mf-cart | `{items[], totalCount, totalPrice}` |
| `cart:cleared` | mf-cart | — |

### Detalle de Eventos

**`pokemon:selected`**
- Disparado cuando usuario clickea "Agregar" en un Pokémon
- Payload: `{ id, name, image, price }` donde `price = id` (cada Pokémon vale su ID)

**`cart:updated`**
- Disparado cuando el carrito cambia
- Payload: `{ items: [{id, name, image, price, qty}], totalCount, totalPrice }`

**`cart:cleared`**
- Disparado cuando usuario vacía el carrito

## Documentation

- [docs/CONCEPTS.md](docs/CONCEPTS.md) — Microfrontend & Module Federation concepts
- [docs/EVENTS.md](docs/EVENTS.md) — Custom Events contract between MFs
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) — Common issues & solutions

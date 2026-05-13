import { PUBLIC_PAGE_SIZE_OPTIONS } from './constants'
import { currency, escapeHtml } from './lib/format'
import {
  getLegacyProducts,
  selectCartCount,
  selectCartEntries,
  selectCartTotal,
  selectCategories,
  selectFilteredProducts,
  selectPagination,
} from './state'
import type { AppState, Product } from './types'

const renderNotice = (state: AppState) => {
  if (!state.notice) {
    return ''
  }

  return `
    <div class="toast toast--${state.notice.type}" role="status" aria-live="polite">
      <span>${escapeHtml(state.notice.text)}</span>
      <button class="icon-button" type="button" id="dismiss-notice" aria-label="Cerrar aviso">x</button>
    </div>
  `
}

const renderSelectOptions = (items: Array<{ value: string | number; label: string }>, selectedValue: string | number) =>
  items
    .map(
      (item) =>
        `<option value="${escapeHtml(String(item.value))}" ${item.value === selectedValue ? 'selected' : ''}>${escapeHtml(item.label)}</option>`,
    )
    .join('')

const renderPagination = (page: number, totalPages: number) => {
  if (totalPages <= 1) {
    return ''
  }

  const buttons: number[] = []
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)

  for (let current = start; current <= end; current += 1) {
    buttons.push(current)
  }

  return `
    <nav class="pagination" aria-label="Paginacion de productos">
      <button class="ghost-button ghost-button--compact" type="button" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>
        Anterior
      </button>
      <div class="pagination__pages">
        ${buttons
          .map(
            (current) => `
              <button
                class="pagination__page ${current === page ? 'pagination__page--active' : ''}"
                type="button"
                data-page="${current}"
                aria-current="${current === page ? 'page' : 'false'}"
              >
                ${current}
              </button>
            `,
          )
          .join('')}
      </div>
      <button class="ghost-button ghost-button--compact" type="button" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>
        Siguiente
      </button>
    </nav>
  `
}

const renderProductCard = (product: Product, quantity: number) => `
  <article class="product-card">
    <div class="product-card__media ${product.image ? '' : 'product-card__media--placeholder'}">
      ${
        product.image
          ? `<img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy" />`
          : `<span>Sin foto disponible</span>`
      }
    </div>

    <div class="product-card__content">
      <div class="product-card__badges">
        <span class="chip">${escapeHtml(product.category)}</span>
        ${product.featured ? '<span class="chip chip--featured">Destacado</span>' : ''}
      </div>

      <div class="product-card__header">
        <div>
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.description)}</p>
        </div>
        <strong>${currency.format(product.price)}</strong>
      </div>

      <div class="product-card__footer">
        <span class="product-card__presentation">${escapeHtml(product.presentation)}</span>
        ${quantity > 0 ? `<span class="product-card__status">En carrito: ${quantity}</span>` : ''}
      </div>
    </div>

    <div class="product-card__actions">
      <div class="quantity-control" aria-label="Control de cantidad">
        <button class="ghost-button ghost-button--icon" type="button" data-product-qty="${product.id}" data-delta="-1" ${quantity === 0 ? 'disabled' : ''}>-</button>
        <span class="quantity-control__value">${quantity}</span>
        <button class="ghost-button ghost-button--icon" type="button" data-product-qty="${product.id}" data-delta="1">+</button>
      </div>
      <button class="primary-button" type="button" data-add-product="${product.id}">
        ${quantity > 0 ? 'Agregar una mas' : 'Agregar al carrito'}
      </button>
    </div>
  </article>
`

const renderCatalogSkeleton = () =>
  Array.from({ length: 6 })
    .map(
      () => `
        <article class="product-card product-card--skeleton" aria-hidden="true">
          <div class="skeleton skeleton--media"></div>
          <div class="skeleton skeleton--line"></div>
          <div class="skeleton skeleton--line skeleton--line-short"></div>
          <div class="skeleton skeleton--line"></div>
        </article>
      `,
    )
    .join('')

const renderStoreView = (state: AppState) => {
  const categories = selectCategories(state.products)
  const filteredProducts = selectFilteredProducts(state.products, state.filters)
  const pagination = selectPagination(filteredProducts, state.filters)
  const cartEntries = selectCartEntries(state.products, state.cart)
  const cartCount = selectCartCount(state.products, state.cart)
  const cartTotal = selectCartTotal(state.products, state.cart)
  const minOrderLabel =
    state.config.minOrder > 0 ? currency.format(state.config.minOrder) : 'Sin minimo configurado'

  const productsMarkup = state.isLoadingCatalog
    ? renderCatalogSkeleton()
    : pagination.items.length
      ? pagination.items.map((product) => renderProductCard(product, state.cart[product.id] ?? 0)).join('')
      : `
          <div class="empty-state">
            <h3>No encontramos productos con esos filtros</h3>
            <p>Prueba limpiando la busqueda o cambiando la categoria para volver a ver todo el catalogo.</p>
            <button class="ghost-button" type="button" id="clear-filters">Limpiar filtros</button>
          </div>
        `

  const cartContent = `
    <div class="cart-panel__header">
      <div>
        <span class="section-kicker">Pedido</span>
        <h2>Tu carrito</h2>
      </div>
      <button class="ghost-button ghost-button--compact" type="button" id="clear-cart" ${cartCount === 0 ? 'disabled' : ''}>Vaciar</button>
    </div>

    <div class="cart-panel__body">
      ${
        cartEntries.length
          ? `
              <div class="cart-items">
                ${cartEntries
                  .map(
                    (entry) => `
                      <article class="cart-item">
                        <div class="cart-item__info">
                          <h3>${escapeHtml(entry.product.name)}</h3>
                          <p>${escapeHtml(entry.product.presentation)}</p>
                        </div>
                        <div class="cart-item__side">
                          <strong>${currency.format(entry.product.price * entry.quantity)}</strong>
                          <div class="quantity-control quantity-control--compact">
                            <button class="ghost-button ghost-button--icon" type="button" data-cart-qty="${entry.product.id}" data-delta="-1">-</button>
                            <span class="quantity-control__value">${entry.quantity}</span>
                            <button class="ghost-button ghost-button--icon" type="button" data-cart-qty="${entry.product.id}" data-delta="1">+</button>
                          </div>
                        </div>
                      </article>
                    `,
                  )
                  .join('')}
              </div>
            `
          : `
              <div class="empty-state empty-state--soft">
                <h3>Tu carrito esta vacio</h3>
                <p>Agrega productos del catalogo y aqui vas a ver cantidades, subtotales y total del pedido.</p>
              </div>
            `
      }

      <div class="cart-summary">
        <div>
          <span>Total estimado</span>
          <strong>${currency.format(cartTotal)}</strong>
        </div>
        <p>Pedido minimo: ${minOrderLabel}</p>
      </div>

      <form class="form-card form-card--dense" id="customer-form">
        <div class="form-card__header">
          <h3>Datos para enviar el pedido</h3>
          <p>Completalos y te abrimos WhatsApp con todo listo para cerrar la venta.</p>
        </div>

        <div class="field-grid">
          <label>
            <span>Nombre y apellido</span>
            <input data-customer-field="name" value="${escapeHtml(state.customer.name)}" placeholder="Ej: Maria Gomez" />
          </label>
          <label>
            <span>Telefono</span>
            <input data-customer-field="phone" value="${escapeHtml(state.customer.phone)}" placeholder="Ej: 11 5555 5555" />
          </label>
        </div>

        <label>
          <span>Comercio o referencia</span>
          <input data-customer-field="business" value="${escapeHtml(state.customer.business)}" placeholder="Ej: Autoservicio Don Jose" />
        </label>
        <label>
          <span>Direccion</span>
          <input data-customer-field="address" value="${escapeHtml(state.customer.address)}" placeholder="Ej: Crovara 1234" />
        </label>
        <label>
          <span>Observaciones</span>
          <textarea data-customer-field="notes" rows="4" placeholder="Horarios, piso, entrecalles...">${escapeHtml(state.customer.notes)}</textarea>
        </label>

        <button class="primary-button primary-button--full" type="button" id="send-order">
          Enviar pedido por WhatsApp
        </button>
      </form>
    </div>
  `

  return `
    <section class="hero">
      <div class="hero__content">
        <span class="eyebrow">Distribucion mayorista</span>
        <h1>${escapeHtml(state.config.businessName)}</h1>
        <p class="hero__text">${escapeHtml(state.config.tagline)}</p>
        <div class="hero__badges">
          <span>${escapeHtml(state.config.deliveryZone)}</span>
          <span>${escapeHtml(state.config.paymentMethods)}</span>
          <span>Pedido minimo: ${minOrderLabel}</span>
        </div>
        <div class="hero__actions">
          <a class="primary-button" href="#catalogo">Ver catalogo</a>
          <a class="ghost-button" href="#/admin">Panel admin</a>
        </div>
      </div>

      <div class="hero__stats">
        <article>
          <strong>${state.products.length}</strong>
          <span>productos publicados</span>
        </article>
        <article>
          <strong>${cartCount}</strong>
          <span>items en tu carrito</span>
        </article>
        <article>
          <strong>${currency.format(cartTotal)}</strong>
          <span>total estimado</span>
        </article>
      </div>
    </section>

    <main class="store-layout">
      <section class="catalog-card" id="catalogo">
        <div class="catalog-card__header">
          <div>
            <span class="section-kicker">Catalogo</span>
            <h2>Compra por categoria, precio y prioridad</h2>
            <p>Encontrá rapido lo que necesitas, sin tener que scrollear una lista infinita.</p>
          </div>
          <div class="results-pill">
            <strong>${pagination.totalItems}</strong>
            <span>resultados</span>
          </div>
        </div>

        <div class="filters-panel">
          <label class="field field--search">
            <span>Buscar</span>
            <input id="search-input" type="search" value="${escapeHtml(state.filters.search)}" placeholder="Yerba, detergente, gaseosa..." />
          </label>

          <label class="field">
            <span>Categoria</span>
            <select id="category-filter">
              ${renderSelectOptions(
                [{ value: 'all', label: 'Todas las categorias' }, ...categories.map((category) => ({ value: category, label: category }))],
                state.filters.category,
              )}
            </select>
          </label>

          <label class="field">
            <span>Tipo</span>
            <select id="featured-filter">
              ${renderSelectOptions(
                [
                  { value: 'all', label: 'Todos' },
                  { value: 'featured', label: 'Solo destacados' },
                  { value: 'regular', label: 'Solo resto del catalogo' },
                ],
                state.filters.featured,
              )}
            </select>
          </label>

          <label class="field">
            <span>Orden</span>
            <select id="sort-filter">
              ${renderSelectOptions(
                [
                  { value: 'featured', label: 'Destacados primero' },
                  { value: 'name-asc', label: 'Nombre A-Z' },
                  { value: 'price-asc', label: 'Precio menor a mayor' },
                  { value: 'price-desc', label: 'Precio mayor a menor' },
                ],
                state.filters.sort,
              )}
            </select>
          </label>

          <label class="field">
            <span>Por pagina</span>
            <select id="per-page-filter">
              ${renderSelectOptions(
                PUBLIC_PAGE_SIZE_OPTIONS.map((value) => ({ value, label: `${value} productos` })),
                state.filters.perPage,
              )}
            </select>
          </label>

          <div class="filters-panel__actions">
            <button class="ghost-button" type="button" id="clear-filters">Limpiar filtros</button>
          </div>
        </div>

        <div class="catalog-toolbar">
          <p>
            Mostrando <strong>${pagination.startItem}</strong> a <strong>${pagination.endItem}</strong> de <strong>${pagination.totalItems}</strong>
          </p>
          ${renderPagination(pagination.page, pagination.totalPages)}
        </div>

        <div class="product-grid">${productsMarkup}</div>

        <div class="catalog-toolbar catalog-toolbar--bottom">
          <p>Pagina <strong>${pagination.page}</strong> de <strong>${pagination.totalPages}</strong></p>
          ${renderPagination(pagination.page, pagination.totalPages)}
        </div>
      </section>

      <aside class="cart-panel cart-panel--desktop">
        ${cartContent}
      </aside>
    </main>

    <button class="cart-fab" type="button" id="open-cart-drawer">
      <span>Pedido</span>
      <strong>${cartCount}</strong>
    </button>

    <div class="cart-drawer ${state.isCartDrawerOpen ? 'cart-drawer--open' : ''}">
      <div class="cart-drawer__backdrop" id="close-cart-drawer"></div>
      <div class="cart-drawer__panel">
        <button class="icon-button cart-drawer__close" type="button" id="close-cart-drawer" aria-label="Cerrar carrito">x</button>
        ${cartContent}
      </div>
    </div>
  `
}

const renderFieldError = (message?: string) =>
  message ? `<span class="field-error" role="alert">${escapeHtml(message)}</span>` : ''

const renderAdminLogin = (state: AppState) => `
  <section class="admin-shell">
    <div class="admin-shell__topbar">
      <a class="ghost-button" href="#/">Volver al catalogo</a>
    </div>

    <div class="admin-login">
      <div class="admin-login__intro">
        <span class="section-kicker">Administracion</span>
        <h1>Panel seguro para gestionar catalogo y configuracion</h1>
        <p>Inicia sesion con tu usuario administrador para editar productos, sincronizar catalogo y mantener la web actualizada para todos los dispositivos.</p>
      </div>

      <form class="admin-login__card" id="admin-login-form">
        <div class="form-card__header">
          <h2>Iniciar sesion</h2>
          <p>Autenticacion protegida con JWT y validacion de rol de administrador.</p>
        </div>

        ${state.auth.errors.form ? `<div class="inline-alert inline-alert--warning">${escapeHtml(state.auth.errors.form)}</div>` : ''}

        <label>
          <span>Email</span>
          <input data-admin-field="email" type="email" value="${escapeHtml(state.auth.email)}" placeholder="admin@tu-negocio.com" aria-invalid="${Boolean(state.auth.errors.email)}" />
          ${renderFieldError(state.auth.errors.email)}
        </label>

        <label>
          <span>Contrasena</span>
          <input data-admin-field="password" type="password" value="${escapeHtml(state.auth.password)}" placeholder="Tu contrasena" aria-invalid="${Boolean(state.auth.errors.password)}" />
          ${renderFieldError(state.auth.errors.password)}
        </label>

        <button class="primary-button primary-button--full" type="submit" ${state.auth.isSubmitting ? 'disabled' : ''}>
          ${state.auth.isSubmitting ? 'Ingresando...' : 'Entrar al dashboard'}
        </button>
      </form>
    </div>
  </section>
`

const renderAdminDashboard = (state: AppState) => {
  const categories = selectCategories(state.products)
  const legacyProductsCount = getLegacyProducts().length
  const isEditing = Boolean(state.productDraft.id)

  return `
    <section class="admin-shell">
      <div class="admin-shell__topbar">
        <div>
          <span class="section-kicker">Panel administrador</span>
          <h1>Gestion completa del catalogo</h1>
        </div>
        <div class="admin-shell__actions">
          <a class="ghost-button" href="#/">Ver tienda</a>
          <button class="ghost-button ghost-button--danger" type="button" id="logout-admin">Cerrar sesion</button>
        </div>
      </div>

      <div class="admin-metrics">
        <article class="metric-card">
          <span>Productos</span>
          <strong>${state.products.length}</strong>
          <p>Total cargado y visible para clientes.</p>
        </article>
        <article class="metric-card">
          <span>Destacados</span>
          <strong>${state.products.filter((product) => product.featured).length}</strong>
          <p>Productos con prioridad visual en el catalogo.</p>
        </article>
        <article class="metric-card">
          <span>Categorias</span>
          <strong>${categories.length}</strong>
          <p>Segmentos activos para ordenar la oferta.</p>
        </article>
      </div>

      <div class="admin-grid">
        <form class="form-card" id="product-form">
          <div class="form-card__header">
            <h2>${isEditing ? 'Editar producto' : 'Nuevo producto'}</h2>
            <p>${isEditing ? 'Actualiza precio, descripcion o imagen sin perder el producto.' : 'Carga un producto nuevo y publicalo en segundos.'}</p>
          </div>

          <div class="field-grid">
            <label>
              <span>Nombre</span>
              <input data-product-field="name" value="${escapeHtml(state.productDraft.name)}" placeholder="Ej: Yerba Playadito" aria-invalid="${Boolean(state.productErrors.name)}" />
              ${renderFieldError(state.productErrors.name)}
            </label>
            <label>
              <span>Categoria</span>
              <input data-product-field="category" value="${escapeHtml(state.productDraft.category)}" placeholder="Ej: Almacen" aria-invalid="${Boolean(state.productErrors.category)}" />
              ${renderFieldError(state.productErrors.category)}
            </label>
          </div>

          <label>
            <span>Descripcion</span>
            <textarea data-product-field="description" rows="4" placeholder="Resume el producto, su uso y salida comercial." aria-invalid="${Boolean(state.productErrors.description)}">${escapeHtml(state.productDraft.description)}</textarea>
            ${renderFieldError(state.productErrors.description)}
          </label>

          <div class="field-grid">
            <label>
              <span>Presentacion</span>
              <input data-product-field="presentation" value="${escapeHtml(state.productDraft.presentation)}" placeholder="Ej: 1 kg / pack x6" aria-invalid="${Boolean(state.productErrors.presentation)}" />
              ${renderFieldError(state.productErrors.presentation)}
            </label>
            <label>
              <span>Precio</span>
              <input data-product-field="price" type="number" min="1" step="1" value="${escapeHtml(state.productDraft.price)}" placeholder="Ej: 3500" aria-invalid="${Boolean(state.productErrors.price)}" />
              ${renderFieldError(state.productErrors.price)}
            </label>
          </div>

          <label>
            <span>Foto del producto</span>
            <input data-product-upload="image" type="file" accept="image/*" />
          </label>

          <div class="product-preview ${state.productDraft.image ? '' : 'product-preview--empty'}">
            ${
              state.productDraft.image
                ? `<img src="${state.productDraft.image}" alt="Vista previa del producto" />`
                : '<span>La vista previa de la imagen aparece aca.</span>'
            }
          </div>

          <label class="checkbox-row">
            <input data-product-field="featured" type="checkbox" ${state.productDraft.featured ? 'checked' : ''} />
            <span>Mostrar como destacado</span>
          </label>

          <div class="form-actions">
            <button class="primary-button" type="submit" ${state.isSavingProduct ? 'disabled' : ''}>
              ${state.isSavingProduct ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Publicar producto'}
            </button>
            ${
              isEditing
                ? '<button class="ghost-button" type="button" id="cancel-product-edit">Cancelar</button>'
                : ''
            }
            ${
              state.productDraft.image
                ? '<button class="ghost-button" type="button" id="clear-product-image">Quitar foto</button>'
                : ''
            }
          </div>
        </form>

        <div class="admin-stack">
          <form class="form-card" id="config-form">
            <div class="form-card__header">
              <h2>Configuracion del negocio</h2>
              <p>Estos datos aparecen en la tienda y se usan para construir el mensaje de WhatsApp.</p>
            </div>

            <label>
              <span>Nombre comercial</span>
              <input data-config-field="businessName" value="${escapeHtml(state.configDraft.businessName)}" aria-invalid="${Boolean(state.configErrors.businessName)}" />
              ${renderFieldError(state.configErrors.businessName)}
            </label>
            <label>
              <span>WhatsApp</span>
              <input data-config-field="whatsappNumber" value="${escapeHtml(state.configDraft.whatsappNumber)}" aria-invalid="${Boolean(state.configErrors.whatsappNumber)}" />
              ${renderFieldError(state.configErrors.whatsappNumber)}
            </label>
            <label>
              <span>Bajada principal</span>
              <input data-config-field="tagline" value="${escapeHtml(state.configDraft.tagline)}" aria-invalid="${Boolean(state.configErrors.tagline)}" />
              ${renderFieldError(state.configErrors.tagline)}
            </label>
            <label>
              <span>Zona de entrega</span>
              <input data-config-field="deliveryZone" value="${escapeHtml(state.configDraft.deliveryZone)}" aria-invalid="${Boolean(state.configErrors.deliveryZone)}" />
              ${renderFieldError(state.configErrors.deliveryZone)}
            </label>
            <label>
              <span>Medios de pago</span>
              <input data-config-field="paymentMethods" value="${escapeHtml(state.configDraft.paymentMethods)}" aria-invalid="${Boolean(state.configErrors.paymentMethods)}" />
              ${renderFieldError(state.configErrors.paymentMethods)}
            </label>
            <label>
              <span>Pedido minimo</span>
              <input data-config-field="minOrder" type="number" min="0" step="100" value="${state.configDraft.minOrder}" aria-invalid="${Boolean(state.configErrors.minOrder)}" />
              ${renderFieldError(state.configErrors.minOrder)}
            </label>

            <button class="primary-button" type="submit" ${state.isSavingConfig ? 'disabled' : ''}>
              ${state.isSavingConfig ? 'Guardando...' : 'Guardar configuracion'}
            </button>
          </form>

          <div class="form-card">
            <div class="form-card__header">
              <h2>Sincronizacion y migracion</h2>
              <p>Si esta compu tiene un catalogo correcto guardado localmente, puedes publicarlo de una vez en la nube.</p>
            </div>
            <div class="migration-card">
              <strong>${legacyProductsCount}</strong>
              <span>productos detectados en este navegador</span>
            </div>
            <button class="primary-button" type="button" id="sync-legacy-data" ${state.isSyncingLegacy ? 'disabled' : ''}>
              ${state.isSyncingLegacy ? 'Subiendo catalogo...' : 'Subir este catalogo a Supabase'}
            </button>
          </div>
        </div>
      </div>

      <section class="admin-products">
        <div class="catalog-card__header">
          <div>
            <span class="section-kicker">Gestion</span>
            <h2>Productos publicados</h2>
            <p>Edita, revisa o elimina productos sin salir del dashboard.</p>
          </div>
        </div>

        <div class="admin-products__grid">
          ${
            state.products.length
              ? state.products
                  .map(
                    (product) => `
                      <article class="admin-product-card">
                        <div class="admin-product-card__media ${product.image ? '' : 'admin-product-card__media--empty'}">
                          ${
                            product.image
                              ? `<img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy" />`
                              : '<span>Sin foto</span>'
                          }
                        </div>
                        <div class="admin-product-card__content">
                          <div class="admin-product-card__top">
                            <div>
                              <h3>${escapeHtml(product.name)}</h3>
                              <p>${escapeHtml(product.category)} / ${escapeHtml(product.presentation)}</p>
                            </div>
                            <strong>${currency.format(product.price)}</strong>
                          </div>
                          <p>${escapeHtml(product.description)}</p>
                          <div class="admin-product-card__actions">
                            <button class="ghost-button" type="button" data-edit-product="${product.id}">Editar</button>
                            <button class="ghost-button ghost-button--danger" type="button" data-delete-product="${product.id}" data-product-name="${escapeHtml(product.name)}">Eliminar</button>
                          </div>
                        </div>
                      </article>
                    `,
                  )
                  .join('')
              : `
                  <div class="empty-state">
                    <h3>No hay productos publicados</h3>
                    <p>Carga tu primer producto desde el formulario para empezar a vender.</p>
                  </div>
                `
          }
        </div>
      </section>
    </section>
  `
}

const renderConfirmModal = (state: AppState) => {
  if (!state.confirmState) {
    return ''
  }

  return `
    <div class="modal-backdrop">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
        <h2 id="confirm-modal-title">Eliminar producto</h2>
        <p>Vas a quitar <strong>${escapeHtml(state.confirmState.productName)}</strong> del catalogo. Esta accion impacta en todos los dispositivos.</p>
        <div class="form-actions">
          <button class="ghost-button" type="button" id="cancel-confirmation">Cancelar</button>
          <button class="primary-button" type="button" id="confirm-delete-product" ${state.isDeletingProduct ? 'disabled' : ''}>
            ${state.isDeletingProduct ? 'Eliminando...' : 'Si, eliminar'}
          </button>
        </div>
      </div>
    </div>
  `
}

export const renderApp = (state: AppState) => `
  <div class="app-shell ${state.route === 'admin' ? 'app-shell--admin' : ''}">
    ${renderNotice(state)}
    ${state.route === 'admin' ? (state.auth.session ? renderAdminDashboard(state) : renderAdminLogin(state)) : renderStoreView(state)}
    ${renderConfirmModal(state)}
  </div>
`

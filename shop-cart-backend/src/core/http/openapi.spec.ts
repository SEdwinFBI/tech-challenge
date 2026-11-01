export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ShopCart E-Commerce API',
    version: '1.0.0',
    description: `### Don Arturo Grupo Pentandra
API de comercio electrónico con persistencia en Microsoft SQL Server 2019+ mediante procedimientos almacenados.

#### Características:
- Access Token JWT de 15 min en el header Authorization. Refresh token rotativo en cookie HttpOnly.
- Carrito de invitado con el header \`X-Guest-Token\`. Se fusiona con el carrito del usuario al iniciar sesión.
- Concurrencia: bloqueo pesimista (\`UPDLOCK, ROWLOCK\`) en reservas de 15 min. Checkout idempotente por \`ClaveIdempotencia\`.
- Montos en quetzales (GTQ) con IVA del 12% incluido.`,
    contact: {
      name: 'Equipo de Desarrollo ShopCart',
      email: 'soporte@shopcart.gt',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1',
    },
    {
      url: '/',
      description: 'Servidor Raíz',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Registro, sesión y usuarios' },
    { name: 'Catalogo', description: 'Categorías, productos y variantes' },
    { name: 'Inventario', description: 'Kardex y existencias' },
    { name: 'Carrito', description: 'Carrito de usuarios e invitados' },
    { name: 'Cupones', description: 'Cupones de porcentaje y monto fijo' },
    { name: 'Checkout', description: 'Direcciones, reservas y confirmación' },
    { name: 'Pedidos', description: 'Estados, historial y devoluciones' },
    { name: 'Dashboard', description: 'Métricas, Excel y SSE' },
    { name: 'Bitacora', description: 'Auditoría de cambios' },
    { name: 'Favoritos', description: 'Favoritos del cliente' },
    { name: 'Seed', description: 'Datos de ejemplo' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Ingrese el Access Token JWT obtenido en /auth/login o /auth/register',
      },
      guestTokenAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Guest-Token',
        description: 'UUID v4 único generado en el cliente para mantener el carrito de invitado',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: false },
          codigo: { type: 'string', example: 'VALIDATION_ERROR' },
          mensaje: { type: 'string', example: 'Los datos proporcionados no cumplen con el esquema requerido.' },
          detalles: { type: 'object' },
        },
      },
      Usuario: {
        type: 'object',
        properties: {
          idUsuario: { type: 'integer', example: 1 },
          correo: { type: 'string', format: 'email', example: 'cliente@shopcart.gt' },
          nombreCompleto: { type: 'string', example: 'Juan Pérez' },
          rol: { type: 'string', enum: ['CLIENTE', 'OPERADOR', 'ADMINISTRADOR'], example: 'CLIENTE' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: true },
          accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          usuario: { $ref: '#/components/schemas/Usuario' },
        },
      },
      Categoria: {
        type: 'object',
        properties: {
          IDCategoria: { type: 'integer', example: 1 },
          Nombre: { type: 'string', example: 'Calzado' },
          Descripcion: { type: 'string', example: 'Zapatos formales, casuales y deportivos' },
          Activo: { type: 'boolean', example: true },
          TotalProductos: { type: 'integer', example: 5 },
        },
      },
      Variante: {
        type: 'object',
        properties: {
          IDVariante: { type: 'integer', example: 1 },
          IDProducto: { type: 'integer', example: 10 },
          SKU: { type: 'string', example: 'ZAP-DER-NEG-42' },
          Color: { type: 'string', example: 'Negro' },
          Talla: { type: 'string', example: '42' },
          Precio: { type: 'number', format: 'float', example: 450.0 },
          ExistenciaFisica: { type: 'integer', example: 25 },
          ExistenciaDisponible: { type: 'integer', example: 22 },
          Activo: { type: 'boolean', example: true },
        },
      },
      Producto: {
        type: 'object',
        properties: {
          IDProducto: { type: 'integer', example: 10 },
          IDCategoria: { type: 'integer', example: 1 },
          Categoria: { type: 'string', example: 'Calzado' },
          Nombre: { type: 'string', example: 'Zapato Derby Clásico' },
          Descripcion: { type: 'string', example: 'Zapato de vestir elaborado en 100% cuero genuino' },
          ImagenPrincipalUrl: { type: 'string', example: 'https://images.unsplash.com/photo-1549298916-b41d501d3772' },
          Activo: { type: 'boolean', example: true },
          TotalVariantes: { type: 'integer', example: 4 },
          PrecioMinimo: { type: 'number', example: 450.0 },
          PrecioMaximo: { type: 'number', example: 490.0 },
          ExistenciaTotal: { type: 'integer', example: 50 },
        },
      },
      CarritoItem: {
        type: 'object',
        properties: {
          IDCarritoItem: { type: 'integer', example: 1 },
          IDVariante: { type: 'integer', example: 1 },
          SKU: { type: 'string', example: 'ZAP-DER-NEG-42' },
          Producto: { type: 'string', example: 'Zapato Derby Clásico' },
          Color: { type: 'string', example: 'Negro' },
          Talla: { type: 'string', example: '42' },
          PrecioUnitario: { type: 'number', example: 450.0 },
          Cantidad: { type: 'integer', example: 2 },
          SubtotalItem: { type: 'number', example: 900.0 },
          ExistenciaDisponible: { type: 'integer', example: 15 },
        },
      },
      Carrito: {
        type: 'object',
        properties: {
          idCarrito: { type: 'integer', example: 3 },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/CarritoItem' },
          },
          subtotal: { type: 'number', example: 900.0 },
          descuento: { type: 'number', example: 90.0 },
          costoEnvioEstimado: { type: 'number', example: 25.0 },
          total: { type: 'number', example: 835.0 },
          cupon: {
            type: 'object',
            nullable: true,
            properties: {
              idCupon: { type: 'integer', example: 2 },
              codigo: { type: 'string', example: 'BIENVENIDA10' },
              tipoDescuento: { type: 'string', example: 'PORCENTAJE' },
              valor: { type: 'number', example: 10.0 },
            },
          },
        },
      },
      Cupon: {
        type: 'object',
        properties: {
          IDCupon: { type: 'integer', example: 1 },
          Codigo: { type: 'string', example: 'VERANO2026' },
          TipoDescuento: { type: 'string', enum: ['PORCENTAJE', 'MONTO_FIJO'], example: 'PORCENTAJE' },
          Valor: { type: 'number', example: 15.0 },
          MontoMinimoCompra: { type: 'number', example: 300.0 },
          LimiteTotalUsos: { type: 'integer', example: 100 },
          LimiteUsosPorCliente: { type: 'integer', example: 2 },
          UsosActuales: { type: 'integer', example: 14 },
          IDCategoriaAplica: { type: 'integer', nullable: true, example: null },
          FechaInicio: { type: 'string', format: 'date-time' },
          FechaFin: { type: 'string', format: 'date-time' },
          Activo: { type: 'boolean', example: true },
        },
      },
      KardexItem: {
        type: 'object',
        properties: {
          IDKardex: { type: 'integer', example: 102 },
          FechaMovimiento: { type: 'string', format: 'date-time' },
          SKU: { type: 'string', example: 'ZAP-DER-NEG-42' },
          Producto: { type: 'string', example: 'Zapato Derby Clásico' },
          TipoMovimiento: { type: 'string', example: 'ENTRADA_COMPRA' },
          Naturaleza: { type: 'integer', example: 1 },
          Cantidad: { type: 'integer', example: 20 },
          SaldoPosterior: { type: 'integer', example: 35 },
          Motivo: { type: 'string', example: 'Reabastecimiento de bodega central Lote 2026-B' },
          UsuarioResponsable: { type: 'string', example: 'operador@shopcart.gt' },
        },
      },
      Pedido: {
        type: 'object',
        properties: {
          IDPedido: { type: 'integer', example: 1 },
          NumeroSeguimiento: { type: 'string', example: 'PED-20261030-0001' },
          Cliente: { type: 'string', example: 'Juan Pérez' },
          Correo: { type: 'string', example: 'cliente@shopcart.gt' },
          Estado: {
            type: 'string',
            enum: ['PAGADO', 'EN_PREPARACION', 'DESPACHADO', 'ENTREGADO', 'CANCELADO', 'DEVUELTO_PARCIAL', 'DEVUELTO_TOTAL'],
            example: 'PAGADO',
          },
          Subtotal: { type: 'number', example: 900.0 },
          Descuento: { type: 'number', example: 90.0 },
          CostoEnvio: { type: 'number', example: 25.0 },
          Total: { type: 'number', example: 835.0 },
          MontoReembolsado: { type: 'number', example: 0.0 },
          BaseImponibleSinIVA: { type: 'number', example: 745.54 },
          MontoIVA12: { type: 'number', example: 89.46 },
          FechaCreacion: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registrar cliente',
        description: 'Emite JWT y cookie de refresh. Con X-Guest-Token fusiona el carrito de invitado.',
        parameters: [
          {
            name: 'X-Guest-Token',
            in: 'header',
            required: false,
            schema: { type: 'string' },
            description: 'Token del carrito de invitado para fusión inmediata',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['correo', 'password', 'nombreCompleto'],
                properties: {
                  correo: { type: 'string', format: 'email', example: 'nuevo.cliente@shopcart.gt' },
                  password: { type: 'string', minLength: 6, example: 'Segura123!' },
                  nombreCompleto: { type: 'string', minLength: 3, example: 'Carlos Mendoza' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Cuenta creada y sesión iniciada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          400: { description: 'Datos inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          409: { description: 'El correo electrónico ya se encuentra registrado' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión',
        description: 'Access Token de 15 minutos en la respuesta y refresh token en cookie. Fusiona el carrito de invitado.',
        parameters: [
          {
            name: 'X-Guest-Token',
            in: 'header',
            required: false,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['correo', 'password'],
                properties: {
                  correo: { type: 'string', format: 'email', example: 'admin@shopcart.gt' },
                  password: { type: 'string', example: 'Admin123!' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Sesión iniciada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          401: { description: 'Credenciales inválidas' },
          403: { description: 'Cuenta desactivada' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotar refresh token',
        description: 'Rota el refresh token (cookie o body) y devuelve un par nuevo.',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Tokens renovados',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          401: { description: 'Refresh token ausente, revocado o expirado' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Cierre de sesión',
        description: 'Limpia la cookie del refresh token y termina la sesión activa.',
        responses: {
          200: {
            description: 'Sesión finalizada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { ok: { type: 'boolean', example: true }, mensaje: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    
    '/auth/me': {
      patch: {
        tags: ['Auth'],
        summary: 'Actualizar mi nombre',
        description: 'Solo modifica la cuenta del JWT. Queda en la Bitácora.',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['nombreCompleto'],
          properties: { nombreCompleto: { type: 'string', minLength: 3, example: 'María López' } },
        } } } },
        responses: { 200: { description: 'Perfil actualizado' }, 400: { description: 'Nombre inválido' } },
      },
      get: {
        tags: ['Auth'],
        summary: 'Obtener mi perfil',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Perfil del usuario actual',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean', example: true }, usuario: { $ref: '#/components/schemas/Usuario' } } } } },
          },
          401: { description: 'No autenticado' },
        },
      },
    },
    '/auth/usuarios': {
      get: {
        tags: ['Auth'],
        summary: 'Listar usuarios (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Búsqueda por correo o nombre' },
          { name: 'rol', in: 'query', schema: { type: 'string', enum: ['CLIENTE', 'OPERADOR', 'ADMINISTRADOR'] } },
          { name: 'activo', in: 'query', schema: { type: 'boolean' } },
          { name: 'pagina', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'tamanoPagina', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: {
            description: 'Listado paginado de usuarios',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean', example: true }, datos: { type: 'array' }, total: { type: 'integer' } } } } },
          },
          403: { description: 'Requiere rol ADMINISTRADOR' },
        },
      },
    },
    '/auth/usuarios/{id}/rol': {
      patch: {
        tags: ['Auth'],
        summary: 'Cambiar rol (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['rol'],
                properties: { rol: { type: 'string', enum: ['CLIENTE', 'OPERADOR', 'ADMINISTRADOR'] } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Rol actualizado' },
          403: { description: 'Requiere rol ADMINISTRADOR' },
        },
      },
    },
    '/auth/usuarios/{id}/estado': {
      patch: {
        tags: ['Auth'],
        summary: 'Activar o desactivar usuario (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['activo'],
                properties: { activo: { type: 'boolean' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Estado actualizado' },
          403: { description: 'Permisos insuficientes (Requiere ADMINISTRADOR)' },
        },
      },
    },
    '/catalogo/categorias': {
      get: {
        tags: ['Catalogo'],
        summary: 'Listar categorías',
        description: 'Solo activas, salvo para administradores que ven todas.',
        security: [{ bearerAuth: [] }, {}],
        responses: {
          200: {
            description: 'Listado de categorías',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    datos: { type: 'array', items: { $ref: '#/components/schemas/Categoria' } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Catalogo'],
        summary: 'Guardar categoría (Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre'],
                properties: {
                  idCategoria: { type: 'integer', nullable: true },
                  nombre: { type: 'string', minLength: 3, example: 'Ropa Deportiva' },
                  descripcion: { type: 'string', example: 'Prendas atléticas de alto rendimiento' },
                  activo: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Categoría guardada' },
          403: { description: 'Acceso denegado (Requiere ADMINISTRADOR)' },
        },
      },
    },
    '/catalogo/productos': {
      get: {
        tags: ['Catalogo'],
        summary: 'Listar productos',
        parameters: [
          { name: 'busqueda', in: 'query', schema: { type: 'string' }, description: 'Búsqueda por texto en nombre o descripción' },
          { name: 'idCategoria', in: 'query', schema: { type: 'integer' } },
          { name: 'precioMin', in: 'query', schema: { type: 'number' } },
          { name: 'precioMax', in: 'query', schema: { type: 'number' } },
          { name: 'soloDisponibles', in: 'query', schema: { type: 'boolean' } },
          { name: 'ordenarPor', in: 'query', schema: { type: 'string', enum: ['PRECIO_ASC', 'PRECIO_DESC', 'NOMBRE_ASC', 'NOMBRE_DESC', 'NUEVOS'] } },
          { name: 'pagina', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'tamanoPagina', in: 'query', schema: { type: 'integer', default: 12 } },
        ],
        responses: {
          200: {
            description: 'Página de productos con variantes y métricas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    datos: { type: 'array', items: { $ref: '#/components/schemas/Producto' } },
                    total: { type: 'integer', example: 45 },
                    pagina: { type: 'integer', example: 1 },
                    tamanoPagina: { type: 'integer', example: 12 },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Catalogo'],
        summary: 'Crear producto (Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre', 'idCategoria'],
                properties: {
                  nombre: { type: 'string', minLength: 3, example: 'Chaqueta de Cuero Oxford' },
                  descripcion: { type: 'string', example: 'Chaqueta clásica de cuero vacuno' },
                  idCategoria: { type: 'integer', example: 2 },
                  imagenPrincipalUrl: { type: 'string', format: 'uri' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Producto maestro creado' },
        },
      },
    },
    '/catalogo/productos/{id}': {
      get: {
        tags: ['Catalogo'],
        summary: 'Detalle de producto',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: {
            description: 'Detalle del producto y variantes',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    producto: { $ref: '#/components/schemas/Producto' },
                    variantes: { type: 'array', items: { $ref: '#/components/schemas/Variante' } },
                  },
                },
              },
            },
          },
          404: { description: 'Producto no encontrado' },
        },
      },
      put: {
        tags: ['Catalogo'],
        summary: 'Actualizar producto (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nombre: { type: 'string' },
                  descripcion: { type: 'string' },
                  idCategoria: { type: 'integer' },
                  imagenPrincipalUrl: { type: 'string' },
                  activo: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Producto actualizado' } },
      },
      delete: {
        tags: ['Catalogo'],
        summary: 'Eliminar producto (Admin)',
        description: 'Si tiene pedidos o movimientos de kardex, solo se desactiva.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: {
            description: 'Resultado de la operación',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    accionRealizada: { type: 'string', example: 'DESACTIVADO_LOGICO' },
                    mensaje: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/catalogo/productos/{id}/variantes': {
      post: {
        tags: ['Catalogo'],
        summary: 'Crear variante (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['sku', 'precio', 'existenciaInicial'],
                properties: {
                  sku: { type: 'string', example: 'CHQ-OXF-CAF-L' },
                  color: { type: 'string', example: 'Café' },
                  talla: { type: 'string', example: 'L' },
                  precio: { type: 'number', minimum: 0.01, example: 850.0 },
                  existenciaInicial: { type: 'integer', minimum: 0, example: 10 },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Variante creada con registro inicial en Kardex' } },
      },
    },
    
    '/catalogo/categorias/{id}': {
      put: {
        tags: ['Catalogo'],
        summary: 'Actualizar categoría (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre'],
                properties: {
                  nombre: { type: 'string', minLength: 2 },
                  descripcion: { type: 'string' },
                  activa: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Categoría actualizada' },
          403: { description: 'Requiere rol ADMINISTRADOR' },
        },
      },
    },
    '/catalogo/variantes/{id}': {
      put: {
        tags: ['Catalogo'],
        summary: 'Actualizar variante (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sku: { type: 'string' },
                  talla: { type: 'string' },
                  color: { type: 'string' },
                  presentacion: { type: 'string' },
                  precio: { type: 'number', minimum: 0.01 },
                  activo: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Variante actualizada' },
          403: { description: 'Requiere rol ADMINISTRADOR' },
        },
      },
      patch: {
        tags: ['Catalogo'],
        summary: 'Actualizar variante parcial (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sku: { type: 'string' },
                  talla: { type: 'string' },
                  color: { type: 'string' },
                  presentacion: { type: 'string' },
                  precio: { type: 'number', minimum: 0.01 },
                  activo: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Variante actualizada' },
          403: { description: 'Requiere rol ADMINISTRADOR' },
        },
      },
    },
    '/catalogo/variantes/{id}/precio': {
      patch: {
        tags: ['Catalogo'],
        summary: 'Cambiar precio de variante (Admin)',
        description: 'No afecta pedidos ya formalizados.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nuevoPrecio'],
                properties: { nuevoPrecio: { type: 'number', minimum: 0.01, example: 799.0 } },
              },
            },
          },
        },
        responses: { 200: { description: 'Precio actualizado y registrado en Bitácora' } },
      },
    },
    '/inventario/kardex': {
      get: {
        tags: ['Inventario'],
        summary: 'Kardex (Operador, Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'idVariante', in: 'query', schema: { type: 'integer' } },
          { name: 'idTipoMovimiento', in: 'query', schema: { type: 'integer' } },
          { name: 'fechaInicio', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'fechaFin', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'pagina', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'tamanoPagina', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: {
            description: 'Listado paginado de movimientos de inventario',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    datos: { type: 'array', items: { $ref: '#/components/schemas/KardexItem' } },
                    total: { type: 'integer', example: 120 },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/inventario/movimientos': {
      post: {
        tags: ['Inventario'],
        summary: 'Registrar movimiento (Operador, Admin)',
        description: 'Tipos: ENTRADA_COMPRA, AJUSTE_POSITIVO o AJUSTE_NEGATIVO. No deja el saldo en negativo.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idVariante', 'tipoMovimiento', 'cantidad', 'motivo'],
                properties: {
                  idVariante: { type: 'integer', example: 1 },
                  tipoMovimiento: { type: 'string', enum: ['ENTRADA_COMPRA', 'AJUSTE', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'], example: 'AJUSTE' },
                  cantidad: { type: 'integer', example: 5 },
                  motivo: { type: 'string', minLength: 5, example: 'Ajuste de inventario físico por auditoría mensual' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Movimiento asentado en Kardex y existencia actualizada' },
          400: { description: 'Ajuste deja la existencia física en negativo o parámetros erróneos' },
        },
      },
    },
    '/carrito': {
      get: {
        tags: ['Carrito'],
        summary: 'Obtener carrito',
        description: 'Usuario autenticado o invitado con X-Guest-Token.',
        security: [{ bearerAuth: [] }, { guestTokenAuth: [] }, {}],
        parameters: [
          { name: 'X-Guest-Token', in: 'header', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Detalle del carrito',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Carrito' } } },
          },
        },
      },
    },
    '/carrito/items': {
      post: {
        tags: ['Carrito'],
        summary: 'Agregar o cambiar ítem',
        description: 'No puede pasar de la existencia disponible (física menos reservas activas). Cantidad 0 elimina el ítem.',
        security: [{ bearerAuth: [] }, { guestTokenAuth: [] }, {}],
        parameters: [
          { name: 'X-Guest-Token', in: 'header', schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idVariante', 'cantidad'],
                properties: {
                  idVariante: { type: 'integer', example: 1 },
                  cantidad: { type: 'integer', minimum: 0, example: 2 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Carrito actualizado' },
          400: { description: 'Cantidad supera la existencia disponible' },
        },
      },
    },
    
    '/carrito/items/{idVariante}': {
      delete: {
        tags: ['Carrito'],
        summary: 'Quitar ítem del carrito',
        security: [{ bearerAuth: [] }, { guestTokenAuth: [] }, {}],
        parameters: [
          { name: 'idVariante', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'X-Guest-Token', in: 'header', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Ítem eliminado del carrito' },
        },
      },
    },
    '/cupones': {
      get: {
        tags: ['Cupones'],
        summary: 'Listar cupones (Admin)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Listado de cupones',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    datos: { type: 'array', items: { $ref: '#/components/schemas/Cupon' } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Cupones'],
        summary: 'Crear cupón (Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['codigo', 'tipoDescuento', 'valor', 'montoMinimoCompra', 'limiteTotalUsos', 'limiteUsosPorCliente', 'fechaInicio', 'fechaFin'],
                properties: {
                  idCupon: { type: 'integer', nullable: true },
                  codigo: { type: 'string', example: 'PROMOVERANO26' },
                  tipoDescuento: { type: 'string', enum: ['PORCENTAJE', 'MONTO_FIJO'], example: 'PORCENTAJE' },
                  valor: { type: 'number', minimum: 0.01, example: 20.0 },
                  montoMinimoCompra: { type: 'number', minimum: 0, example: 250.0 },
                  limiteTotalUsos: { type: 'integer', minimum: 1, example: 100 },
                  limiteUsosPorCliente: { type: 'integer', minimum: 1, example: 2 },
                  idCategoriaAplica: { type: 'integer', nullable: true, example: null },
                  fechaInicio: { type: 'string', format: 'date-time' },
                  fechaFin: { type: 'string', format: 'date-time' },
                  activo: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Cupón guardado' } },
      },
    },
    '/cupones/aplicar': {
      post: {
        tags: ['Cupones'],
        summary: 'Aplicar cupón',
        description: 'Valida vigencia, monto mínimo, límite global y límite por cliente.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['codigo'],
                properties: { codigo: { type: 'string', example: 'PROMOVERANO26' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Cupón aplicado' },
          400: { description: 'Cupón no cumple las reglas de validación' },
        },
      },
      delete: {
        tags: ['Cupones'],
        summary: 'Quitar cupón',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Cupón removido del carrito' },
        },
      },
    },
    '/cupones/remover': {
      delete: {
        tags: ['Cupones'],
        summary: 'Quitar cupón (alias)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Cupón removido del carrito' },
        },
      },
    },
    
    '/cupones/{id}': {
      put: {
        tags: ['Cupones'],
        summary: 'Actualizar cupón (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['codigo', 'tipoDescuento', 'valor', 'montoMinimoCompra', 'limiteTotalUsos', 'limiteUsosPorCliente', 'fechaInicio', 'fechaFin'],
                properties: {
                  codigo: { type: 'string' },
                  tipoDescuento: { type: 'string', enum: ['PORCENTAJE', 'MONTO_FIJO'] },
                  valor: { type: 'number' },
                  montoMinimoCompra: { type: 'number' },
                  limiteTotalUsos: { type: 'integer' },
                  limiteUsosPorCliente: { type: 'integer' },
                  idCategoriaAplica: { type: 'integer', nullable: true },
                  fechaInicio: { type: 'string', format: 'date-time' },
                  fechaFin: { type: 'string', format: 'date-time' },
                  activo: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Cupón actualizado' },
          403: { description: 'Requiere rol ADMINISTRADOR' },
        },
      },
    },
    '/checkout/municipios': {
      get: {
        tags: ['Checkout'],
        summary: 'Departamentos y municipios',
        responses: {
          200: {
            description: 'Listado geográfico y tarifas',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean', example: true }, datos: { type: 'array' } } } } },
          },
        },
      },
    },
    '/checkout/direcciones': {
      get: {
        tags: ['Checkout'],
        summary: 'Listar direcciones',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Direcciones del cliente',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean', example: true }, datos: { type: 'array' } } } } },
          },
        },
      },
      post: {
        tags: ['Checkout'],
        summary: 'Crear dirección',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idMunicipio', 'direccion', 'telefonoContacto'],
                properties: {
                  idMunicipio: { type: 'integer', example: 1 },
                  direccion: { type: 'string', minLength: 5, example: '6ta Avenida 12-34 Zona 1, Edificio Pentandra' },
                  codigoPostal: { type: 'string', example: '01001' },
                  telefonoContacto: { type: 'string', example: '+502 2222-3333' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Dirección guardada' } },
      },
    },
    
    '/checkout/direcciones/{id}': {
      delete: {
        tags: ['Checkout'],
        summary: 'Eliminar dirección',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Dirección eliminada' },
        },
      },
    },
    '/checkout/reservar': {
      post: {
        tags: ['Checkout'],
        summary: 'Reservar existencias',
        description: 'Vence a los 15 minutos. Bloquea las existencias para evitar sobreventas.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idCarrito'],
                properties: { idCarrito: { type: 'integer', example: 3 } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Reserva confirmada por 15 minutos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    idReserva: { type: 'integer' },
                    fechaExpiracion: { type: 'string', format: 'date-time' },
                    minutosRestantes: { type: 'integer', example: 15 },
                  },
                },
              },
            },
          },
          400: { description: 'Stock insuficiente o reserva activa en conflicto' },
        },
      },
    },
    '/checkout/confirmar': {
      post: {
        tags: ['Checkout'],
        summary: 'Confirmar pedido',
        description: 'Congela precios y descuentos, registra salidas en kardex y vacía el carrito.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idCarrito', 'idDireccion', 'claveIdempotencia'],
                properties: {
                  idCarrito: { type: 'integer', example: 3 },
                  idDireccion: { type: 'integer', example: 1 },
                  claveIdempotencia: { type: 'string', minLength: 8, example: 'pay-req-f47ac10b-58cc-4372-a567-0e02b2c3d479' },
                  simularFalloPago: { type: 'boolean', default: false, description: 'Simula rechazo del procesador bancario manteniendo la reserva activa' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Pedido creado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    idPedido: { type: 'integer', example: 1 },
                    fueIdempotente: { type: 'boolean', example: false },
                    mensaje: { type: 'string' },
                  },
                },
              },
            },
          },
          200: { description: 'Solicitud repetida: devuelve el pedido existente sin cobrar de nuevo' },
          400: { description: 'Sobreventa detectada, carrito vacío o dirección inválida' },
        },
      },
    },
    '/pedidos': {
      get: {
        tags: ['Pedidos'],
        summary: 'Listar pedidos',
        description: 'Clientes ven solo sus pedidos. Operadores y administradores ven todos.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'idEstadoPedido', in: 'query', schema: { type: 'integer' } },
          { name: 'idCliente', in: 'query', schema: { type: 'integer' } },
          { name: 'fechaInicio', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'fechaFin', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'pagina', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'tamanoPagina', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: {
            description: 'Listado de pedidos paginados',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    datos: { type: 'array', items: { $ref: '#/components/schemas/Pedido' } },
                    total: { type: 'integer', example: 38 },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/pedidos/{id}': {
      get: {
        tags: ['Pedidos'],
        summary: 'Detalle de pedido',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: {
            description: 'Detalle de pedido, líneas de productos y trazabilidad de estados',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    pedido: { $ref: '#/components/schemas/Pedido' },
                    detalles: { type: 'array' },
                    historialEstados: { type: 'array' },
                  },
                },
              },
            },
          },
          403: { description: 'Intento de consultar pedido de otro cliente' },
          404: { description: 'Pedido no encontrado' },
        },
      },
    },
    '/pedidos/{id}/estado': {
      patch: {
        tags: ['Pedidos'],
        summary: 'Cambiar estado',
        description: 'Valida transiciones. Cancelar antes de despachar reintegra existencias y restaura el cupón.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nuevoEstado'],
                properties: {
                  nuevoEstado: {
                    type: 'string',
                    enum: ['EN_PREPARACION', 'DESPACHADO', 'ENTREGADO', 'CANCELADO'],
                    example: 'EN_PREPARACION',
                  },
                  comentario: { type: 'string', example: 'Mercadería empacada y rotulada' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Estado actualizado y registrado en historial y bitácora' },
          403: { description: 'Cliente intentando una transición no permitida' },
          409: { description: 'Transición inválida según el ciclo de vida del pedido' },
        },
      },
    },
    '/pedidos/{id}/devoluciones': {
      post: {
        tags: ['Pedidos'],
        summary: 'Devolver línea (Operador, Admin)',
        description: 'Reembolsa el precio neto unitario prorrateado, reintegra existencias y pasa a DEVUELTO_PARCIAL o DEVUELTO_TOTAL.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idPedidoDetalle', 'cantidadADevolver', 'motivo'],
                properties: {
                  idPedidoDetalle: { type: 'integer', example: 12 },
                  cantidadADevolver: { type: 'integer', minimum: 1, example: 1 },
                  motivo: { type: 'string', minLength: 5, example: 'Cambio de talla solicitado por el cliente' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Devolución aplicada, existencia reintegrada en Kardex' },
          400: { description: 'Cantidad superior a la comprada o estado no apto para devolución' },
        },
      },
    },
    '/dashboard/resumen': {
      get: {
        tags: ['Dashboard'],
        summary: 'Resumen (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'fechaInicio', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'fechaFin', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: {
          200: {
            description: 'Métricas agregadas del negocio',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    resumen: { type: 'object' },
                    topProductos: { type: 'array' },
                    ventasPorCategoria: { type: 'array' },
                  },
                },
              },
            },
          },
          403: { description: 'Acceso exclusivo para rol ADMINISTRADOR' },
        },
      },
    },
    '/dashboard/stream': {
      get: {
        tags: ['Dashboard'],
        summary: 'Stream SSE (Admin)',
        description: 'Emite un evento cada vez que se confirma una venta o se devuelve producto.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Conexión SSE activa',
            content: { 'text/event-stream': { schema: { type: 'string' } } },
          },
        },
      },
    },
    '/dashboard/exportar-excel': {
      get: {
        tags: ['Dashboard'],
        summary: 'Exportar Excel (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'fechaInicio', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'fechaFin', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: {
          200: {
            description: 'Archivo binario Excel generado',
            content: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
    },
    '/bitacora': {
      get: {
        tags: ['Bitacora'],
        summary: 'Bitácora (Admin)',
        description: 'Creaciones, cambios, desactivaciones y transiciones de estado.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'modulo', in: 'query', schema: { type: 'string' } },
          { name: 'pagina', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'tamanoPagina', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: {
            description: 'Eventos auditados',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    datos: { type: 'array' },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/catalogo/productos/{id}/imagenes': {
      get: {
        tags: ['Catalogo'],
        summary: 'Listar imágenes',
        description: 'Ordenadas. La portada sigue siendo Productos.ImagenUrl.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Lista de imágenes' }, 404: { description: 'Producto inexistente' } },
      },
      post: {
        tags: ['Catalogo'],
        summary: 'Agregar imagen (Admin)',
        description: 'Máximo 10 por producto. Queda en la Bitácora.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['url'],
          properties: { url: { type: 'string', format: 'uri', example: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800' } },
        } } } },
        responses: { 201: { description: 'Imagen agregada' }, 409: { description: 'Límite de imágenes alcanzado' } },
      },
    },
    '/catalogo/imagenes/{id}': {
      delete: {
        tags: ['Catalogo'],
        summary: 'Eliminar imagen (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Imagen eliminada' }, 404: { description: 'Imagen inexistente' } },
      },
    },
    '/catalogo/variantes/{id}/precio-referencia': {
      patch: {
        tags: ['Catalogo'],
        summary: 'Precio de referencia (Admin)',
        description: 'Solo para mostrar descuentos. Debe ser mayor al precio de venta y no altera el cobro. Enviar null lo elimina.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['precioReferencia'],
          properties: { precioReferencia: { type: 'number', nullable: true, example: 999.0 } },
        } } } },
        responses: { 200: { description: 'Precio de referencia actualizado' }, 400: { description: 'Debe ser mayor al precio de venta' } },
      },
    },
    '/catalogo/categorias/{id}/imagen': {
      patch: {
        tags: ['Catalogo'],
        summary: 'Imagen de categoría (Admin)',
        description: 'Se usa en el carrusel y el menú. Enviar null la elimina.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['imagenUrl'],
          properties: { imagenUrl: { type: 'string', format: 'uri', nullable: true, example: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400' } },
        } } } },
        responses: { 200: { description: 'Imagen actualizada' }, 404: { description: 'Categoría inexistente' } },
      },
    },
    '/catalogo/admin/productos/{id}': {
      get: {
        tags: ['Catalogo'],
        summary: 'Detalle de producto (Admin)',
        description: 'Incluye inactivos. El detalle público no.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Producto, variantes e imágenes' }, 404: { description: 'Producto inexistente' } },
      },
    },
    '/catalogo/productos/{id}/destacado': {
      patch: {
        tags: ['Catalogo'],
        summary: 'Destacar producto (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['destacado'],
          properties: { destacado: { type: 'boolean', example: true } },
        } } } },
        responses: { 200: { description: 'Producto actualizado' }, 404: { description: 'Producto inexistente' } },
      },
    },
    '/favoritos': {
      get: {
        tags: ['Favoritos'],
        summary: 'Listar favoritos',
        description: 'El usuario se toma exclusivamente del JWT.',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Productos favoritos con precio, oferta y existencia' }, 403: { description: 'Solo clientes' } },
      },
      post: {
        tags: ['Favoritos'],
        summary: 'Agregar favorito',
        description: 'Repetir la solicitud no duplica el favorito.',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['idProducto'],
          properties: { idProducto: { type: 'integer', example: 10 } },
        } } } },
        responses: { 201: { description: 'Agregado' }, 404: { description: 'Producto inexistente o inactivo' } },
      },
    },
    '/favoritos/ids': {
      get: {
        tags: ['Favoritos'],
        summary: 'IDs de favoritos',
        description: 'Para marcar favoritos en listados sin traer los productos.',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Arreglo de IDProducto' } },
      },
    },
    '/favoritos/{id}': {
      delete: {
        tags: ['Favoritos'],
        summary: 'Quitar favorito',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Eliminado' } },
      },
    },
    '/auth/me/password': {
      post: {
        tags: ['Auth'],
        summary: 'Cambiar contraseña',
        description: 'Exige la contraseña actual. La nueva debe tener mínimo 8 caracteres. Revoca todos los refresh tokens.',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['passwordActual', 'passwordNueva'],
          properties: {
            passwordActual: { type: 'string', example: 'Admin123!' },
            passwordNueva: { type: 'string', minLength: 8, example: 'NuevaClave456!' },
          },
        } } } },
        responses: { 200: { description: 'Contraseña actualizada y sesiones cerradas' }, 400: { description: 'Contraseña actual incorrecta o nueva inválida' } },
      },
    },
    '/inventario/existencias-bajas': {
      get: {
        tags: ['Inventario'],
        summary: 'Existencias bajas (Operador, Admin)',
        description: 'Usa UmbralExistenciasBajas de ConfiguracionSistema. Incluye agotadas.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'pagina', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'tamanoPagina', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: { 200: { description: 'Variantes con existencia baja, paginadas' }, 403: { description: 'Solo operadores y administradores' } },
      },
    },
    '/seed': {
      post: {
        tags: ['Seed'],
        summary: 'Cargar datos demo (solo desarrollo)',
        description: 'Ejecuta SP_Seed_DatosDemo.',
        responses: {
          200: { description: 'Datos semilla aplicados' },
          403: { description: 'Bloqueado en entornos que no sean development' },
        },
      },
    },
  },
};

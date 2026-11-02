-- Esquema base (SQL Server 2019+)

IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = 'ShopCartDB')
BEGIN
    CREATE DATABASE ShopCartDB;
END
GO

USE ShopCartDB;
GO

-- Configuración, geografía y envío

CREATE TABLE ConfiguracionSistema (
    IDConfiguracion INT IDENTITY(1,1) CONSTRAINT PK_ConfiguracionSistema PRIMARY KEY,
    Clave VARCHAR(50) NOT NULL CONSTRAINT UQ_Configuracion_Clave UNIQUE,
    Valor VARCHAR(200) NOT NULL,
    Descripcion NVARCHAR(300) NOT NULL,
    FechaModificacion DATETIME2 NOT NULL CONSTRAINT DF_Config_Fecha DEFAULT SYSDATETIME()
);
GO

CREATE TABLE Departamentos (
    IDDepartamento INT IDENTITY(1,1) CONSTRAINT PK_Departamentos PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL CONSTRAINT UQ_Departamentos_Nombre UNIQUE,
    Activo BIT NOT NULL CONSTRAINT DF_Departamentos_Activo DEFAULT 1
);
GO

CREATE TABLE Municipios (
    IDMunicipio INT IDENTITY(1,1) CONSTRAINT PK_Municipios PRIMARY KEY,
    IDDepartamento INT NOT NULL CONSTRAINT FK_Municipios_Departamentos FOREIGN KEY REFERENCES Departamentos(IDDepartamento),
    Nombre NVARCHAR(100) NOT NULL,
    Activo BIT NOT NULL CONSTRAINT DF_Municipios_Activo DEFAULT 1,
    CONSTRAINT UQ_Municipio_Departamento UNIQUE (IDDepartamento, Nombre)
);
GO

CREATE TABLE TarifasEnvio (
    IDTarifaEnvio INT IDENTITY(1,1) CONSTRAINT PK_TarifasEnvio PRIMARY KEY,
    IDDepartamento INT NOT NULL CONSTRAINT UQ_Tarifas_Depto UNIQUE 
        CONSTRAINT FK_Tarifas_Departamentos FOREIGN KEY REFERENCES Departamentos(IDDepartamento),
    CostoEnvio DECIMAL(12,2) NOT NULL CONSTRAINT CK_Tarifas_Costo CHECK (CostoEnvio >= 0),
    MontoMinimoGratis DECIMAL(12,2) NOT NULL CONSTRAINT DF_Tarifas_Gratis DEFAULT 500.00 CHECK (MontoMinimoGratis >= 0)
);
GO

-- Usuarios y control de acceso

CREATE TABLE Roles (
    IDRol INT IDENTITY(1,1) CONSTRAINT PK_Roles PRIMARY KEY,
    Codigo VARCHAR(20) NOT NULL CONSTRAINT UQ_Roles_Codigo UNIQUE,
    Nombre NVARCHAR(50) NOT NULL
);
GO

CREATE TABLE Usuarios (
    IDUsuario INT IDENTITY(1,1) CONSTRAINT PK_Usuarios PRIMARY KEY,
    IDRol INT NOT NULL CONSTRAINT FK_Usuarios_Roles FOREIGN KEY REFERENCES Roles(IDRol),
    Correo NVARCHAR(150) NOT NULL CONSTRAINT UQ_Usuarios_Correo UNIQUE,
    Password NVARCHAR(255) NOT NULL,
    Nombre NVARCHAR(150) NOT NULL,
    Activo BIT NOT NULL CONSTRAINT DF_Usuarios_Activo DEFAULT 1,
    FechaCreacion DATETIME2 NOT NULL CONSTRAINT DF_Usuarios_Fecha DEFAULT SYSDATETIME()
);
GO

CREATE TABLE RefreshTokens (
    IDRefreshToken INT IDENTITY(1,1) CONSTRAINT PK_RefreshTokens PRIMARY KEY,
    IDUsuario INT NOT NULL CONSTRAINT FK_RefreshTokens_Usuarios FOREIGN KEY REFERENCES Usuarios(IDUsuario),
    TokenHash VARCHAR(255) NOT NULL CONSTRAINT UQ_RefreshTokens_Hash UNIQUE,
    FechaExpiracion DATETIME2 NOT NULL,
    Revocado BIT NOT NULL CONSTRAINT DF_RefreshTokens_Revocado DEFAULT 0,
    ReemplazadoPorToken VARCHAR(255) NULL,
    FamilyExpiresAt DATETIME2 NOT NULL CONSTRAINT DF_RefreshTokens_FamilyExp DEFAULT DATEADD(DAY, 30, SYSDATETIME()),
    FechaCreacion DATETIME2 NOT NULL CONSTRAINT DF_RefreshTokens_Fecha DEFAULT SYSDATETIME()
);
GO

CREATE TABLE Direcciones (
    IDDireccion INT IDENTITY(1,1) CONSTRAINT PK_Direcciones PRIMARY KEY,
    IDUsuario INT NOT NULL CONSTRAINT FK_Direcciones_Usuarios FOREIGN KEY REFERENCES Usuarios(IDUsuario),
    IDMunicipio INT NOT NULL CONSTRAINT FK_Direcciones_Municipios FOREIGN KEY REFERENCES Municipios(IDMunicipio),
    Etiqueta NVARCHAR(50) NOT NULL,
    Direccion NVARCHAR(300) NOT NULL,
    Telefono VARCHAR(20) NOT NULL,
    Activo BIT NOT NULL CONSTRAINT DF_Direcciones_Activa DEFAULT 1
);
GO

-- Catálogo, variantes e inventario

CREATE TABLE Categorias (
    IDCategoria INT IDENTITY(1,1) CONSTRAINT PK_Categorias PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL CONSTRAINT UQ_Categorias_Nombre UNIQUE,
    Descripcion NVARCHAR(300) NULL,
    Activo BIT NOT NULL CONSTRAINT DF_Categorias_Activa DEFAULT 1
);
GO

CREATE TABLE Productos (
    IDProducto INT IDENTITY(1,1) CONSTRAINT PK_Productos PRIMARY KEY,
    IDCategoria INT NOT NULL CONSTRAINT FK_Productos_Categorias FOREIGN KEY REFERENCES Categorias(IDCategoria),
    Nombre NVARCHAR(150) NOT NULL,
    Descripcion NVARCHAR(MAX) NULL,
    ImagenUrl NVARCHAR(500) NULL,
    Activo BIT NOT NULL CONSTRAINT DF_Productos_Activo DEFAULT 1,
    FechaCreacion DATETIME2 NOT NULL CONSTRAINT DF_Productos_Fecha DEFAULT SYSDATETIME()
);
GO

CREATE TABLE Variantes (
    IDVariante INT IDENTITY(1,1) CONSTRAINT PK_Variantes PRIMARY KEY,
    IDProducto INT NOT NULL CONSTRAINT FK_Variantes_Productos FOREIGN KEY REFERENCES Productos(IDProducto),
    SKU VARCHAR(50) NOT NULL CONSTRAINT UQ_Variantes_SKU UNIQUE,
    Talla VARCHAR(30) NULL,
    Color VARCHAR(50) NULL,
    Presentacion VARCHAR(50) NULL,
    Precio DECIMAL(12,2) NOT NULL CONSTRAINT CK_Variantes_Precio CHECK (Precio > 0),
    ExistenciaFisica INT NOT NULL CONSTRAINT DF_Variantes_Existencia DEFAULT 0 
        CONSTRAINT CK_Variantes_ExistenciaNoNegativa CHECK (ExistenciaFisica >= 0),
    Activo BIT NOT NULL CONSTRAINT DF_Variantes_Activa DEFAULT 1
);
GO

CREATE TABLE TipoMovimiento (
    IDTipoMovimiento INT IDENTITY(1,1) CONSTRAINT PK_TipoMovimiento PRIMARY KEY,
    Codigo VARCHAR(30) NOT NULL CONSTRAINT UQ_TipoMov_Codigo UNIQUE,
    Nombre VARCHAR(50) NOT NULL,
    Naturaleza SMALLINT NOT NULL CONSTRAINT CK_TipoMov_Naturaleza CHECK (Naturaleza IN (1, -1)), -- 1 Entrada, -1 Salida
    Activo BIT NOT NULL CONSTRAINT DF_TipoMov_Activo DEFAULT 1
);
GO

CREATE TABLE Kardex (
    IDKardex BIGINT IDENTITY(1,1) CONSTRAINT PK_Kardex PRIMARY KEY,
    IDVariante INT NOT NULL CONSTRAINT FK_Kardex_Variantes FOREIGN KEY REFERENCES Variantes(IDVariante),
    IDUsuario INT NOT NULL CONSTRAINT FK_Kardex_Usuarios FOREIGN KEY REFERENCES Usuarios(IDUsuario),
    IDTipoMovimiento INT NOT NULL CONSTRAINT FK_Kardex_TipoMovimiento FOREIGN KEY REFERENCES TipoMovimiento(IDTipoMovimiento),
    Cantidad INT NOT NULL CONSTRAINT CK_Kardex_CantidadNoCero CHECK (Cantidad <> 0),
    SaldoPosterior INT NOT NULL CONSTRAINT CK_Kardex_Saldo CHECK (SaldoPosterior >= 0),
    Motivo NVARCHAR(300) NOT NULL,
    IDPedidoReferencia INT NULL,
    FechaMovimiento DATETIME2 NOT NULL CONSTRAINT DF_Kardex_Fecha DEFAULT SYSDATETIME()
);
GO

-- Cupones, carritos y reservas

CREATE TABLE TipoDescuento (
    IDTipoDescuento INT IDENTITY(1,1) CONSTRAINT PK_TipoDescuento PRIMARY KEY,
    Codigo VARCHAR(20) NOT NULL CONSTRAINT UQ_TipoDescuento_Codigo UNIQUE,
    Descripcion VARCHAR(50) NOT NULL
);
GO

CREATE TABLE Cupones (
    IDCupon INT IDENTITY(1,1) CONSTRAINT PK_Cupones PRIMARY KEY,
    Codigo VARCHAR(50) NOT NULL CONSTRAINT UQ_Cupones_Codigo UNIQUE,
    IDTipoDescuento INT NOT NULL CONSTRAINT FK_Cupones_TipoDescuento FOREIGN KEY REFERENCES TipoDescuento(IDTipoDescuento),
    Valor DECIMAL(12,2) NOT NULL CONSTRAINT CK_Cupones_Valor CHECK (Valor > 0),
    MontoMinimoCompra DECIMAL(12,2) NOT NULL CONSTRAINT DF_Cupones_Minimo DEFAULT 0 CHECK (MontoMinimoCompra >= 0),
    LimiteTotalUsos INT NOT NULL CONSTRAINT CK_Cupones_LimiteTotal CHECK (LimiteTotalUsos > 0),
    LimiteUsosPorCliente INT NOT NULL CONSTRAINT CK_Cupones_LimiteCliente CHECK (LimiteUsosPorCliente > 0),
    UsosActuales INT NOT NULL CONSTRAINT DF_Cupones_Usos DEFAULT 0 CHECK (UsosActuales >= 0),
    IDCategoriaAplica INT NULL CONSTRAINT FK_Cupones_Categorias FOREIGN KEY REFERENCES Categorias(IDCategoria),
    FechaInicio DATETIME2 NOT NULL,
    FechaFin DATETIME2 NOT NULL,
    Activo BIT NOT NULL CONSTRAINT DF_Cupones_Activo DEFAULT 1,
    CONSTRAINT CK_Cupones_Vigencia CHECK (FechaFin > FechaInicio),
    CONSTRAINT CK_Cupones_TopeUsos CHECK (UsosActuales <= LimiteTotalUsos)
);
GO

CREATE TABLE CuponesUsosPorCliente (
    IDCuponUso INT IDENTITY(1,1) CONSTRAINT PK_CuponesUsosPorCliente PRIMARY KEY,
    IDCupon INT NOT NULL CONSTRAINT FK_CuponUso_Cupones FOREIGN KEY REFERENCES Cupones(IDCupon),
    IDUsuario INT NOT NULL CONSTRAINT FK_CuponUso_Usuarios FOREIGN KEY REFERENCES Usuarios(IDUsuario),
    TotalUsos INT NOT NULL CONSTRAINT DF_CuponUso_Total DEFAULT 1 CHECK (TotalUsos >= 0),
    CONSTRAINT UQ_Cupon_Usuario UNIQUE (IDCupon, IDUsuario)
);
GO

CREATE TABLE Carritos (
    IDCarrito INT IDENTITY(1,1) CONSTRAINT PK_Carritos PRIMARY KEY,
    IDUsuario INT NULL CONSTRAINT FK_Carritos_Usuarios FOREIGN KEY REFERENCES Usuarios(IDUsuario),
    TokenInvitado VARCHAR(100) NULL,
    IDCupon INT NULL CONSTRAINT FK_Carritos_Cupones FOREIGN KEY REFERENCES Cupones(IDCupon),
    UltimaActividad DATETIME2 NOT NULL CONSTRAINT DF_Carritos_Actividad DEFAULT SYSDATETIME(),
    CONSTRAINT CK_Carritos_Propietario CHECK (IDUsuario IS NOT NULL OR TokenInvitado IS NOT NULL)
);
GO

CREATE TABLE CarritoItems (
    IDCarritoItem INT IDENTITY(1,1) CONSTRAINT PK_CarritoItems PRIMARY KEY,
    IDCarrito INT NOT NULL CONSTRAINT FK_CarritoItems_Carritos FOREIGN KEY REFERENCES Carritos(IDCarrito) ON DELETE CASCADE,
    IDVariante INT NOT NULL CONSTRAINT FK_CarritoItems_Variantes FOREIGN KEY REFERENCES Variantes(IDVariante),
    Cantidad INT NOT NULL CONSTRAINT CK_CarritoItems_Cantidad CHECK (Cantidad > 0),
    CONSTRAINT UQ_Carrito_Variante UNIQUE (IDCarrito, IDVariante)
);
GO

CREATE TABLE EstadosReserva (
    IDEstadoReserva INT IDENTITY(1,1) CONSTRAINT PK_EstadosReserva PRIMARY KEY,
    Codigo VARCHAR(20) NOT NULL CONSTRAINT UQ_EstadosReserva_Codigo UNIQUE,
    Nombre NVARCHAR(50) NOT NULL
);
GO

CREATE TABLE ReservasInventario (
    IDReserva INT IDENTITY(1,1) CONSTRAINT PK_ReservasInventario PRIMARY KEY,
    IDCarrito INT NOT NULL CONSTRAINT FK_Reservas_Carritos FOREIGN KEY REFERENCES Carritos(IDCarrito),
    IDVariante INT NOT NULL CONSTRAINT FK_Reservas_Variantes FOREIGN KEY REFERENCES Variantes(IDVariante),
    IDEstadoReserva INT NOT NULL CONSTRAINT FK_Reservas_Estados FOREIGN KEY REFERENCES EstadosReserva(IDEstadoReserva),
    Cantidad INT NOT NULL CONSTRAINT CK_Reservas_Cantidad CHECK (Cantidad > 0),
    FechaExpiracion DATETIME2 NOT NULL,
    FechaCreacion DATETIME2 NOT NULL CONSTRAINT DF_Reservas_Fecha DEFAULT SYSDATETIME()
);
GO

-- Pedidos, estados y devoluciones

CREATE TABLE EstadosPedido (
    IDEstadoPedido INT IDENTITY(1,1) CONSTRAINT PK_EstadosPedido PRIMARY KEY,
    Codigo VARCHAR(30) NOT NULL CONSTRAINT UQ_EstadosPedido_Codigo UNIQUE,
    Nombre NVARCHAR(50) NOT NULL,
    Descripcion NVARCHAR(200) NULL,
    EsFinal BIT NOT NULL CONSTRAINT DF_EstadosPedido_EsFinal DEFAULT 0,
    Activo BIT NOT NULL CONSTRAINT DF_EstadosPedido_Activo DEFAULT 1
);
GO

CREATE TABLE TransicionesEstadoPedido (
    IDTransicion INT IDENTITY(1,1) CONSTRAINT PK_TransicionesEstado PRIMARY KEY,
    IDEstadoOrigen INT NOT NULL CONSTRAINT FK_Transicion_Origen REFERENCES EstadosPedido(IDEstadoPedido),
    IDEstadoDestino INT NOT NULL CONSTRAINT FK_Transicion_Destino REFERENCES EstadosPedido(IDEstadoPedido),
    PermiteCancelacion BIT NOT NULL CONSTRAINT DF_Transicion_Cancela DEFAULT 0,
    PermiteDevolucion BIT NOT NULL CONSTRAINT DF_Transicion_Devuelve DEFAULT 0,
    CONSTRAINT UQ_Transicion_Origen_Destino UNIQUE (IDEstadoOrigen, IDEstadoDestino)
);
GO

CREATE TABLE Pedidos (
    IDPedido INT IDENTITY(1,1) CONSTRAINT PK_Pedidos PRIMARY KEY,
    IDUsuario INT NOT NULL CONSTRAINT FK_Pedidos_Usuarios FOREIGN KEY REFERENCES Usuarios(IDUsuario),
    IDDireccion INT NOT NULL CONSTRAINT FK_Pedidos_Direcciones FOREIGN KEY REFERENCES Direcciones(IDDireccion),
    IDCupon INT NULL CONSTRAINT FK_Pedidos_Cupones FOREIGN KEY REFERENCES Cupones(IDCupon),
    IDEstadoPedido INT NOT NULL CONSTRAINT FK_Pedidos_Estados FOREIGN KEY REFERENCES EstadosPedido(IDEstadoPedido),
    ClaveIdempotencia VARCHAR(100) NOT NULL CONSTRAINT UQ_Pedidos_Idempotencia UNIQUE,
    Subtotal DECIMAL(12,2) NOT NULL CHECK (Subtotal >= 0),
    Descuento DECIMAL(12,2) NOT NULL CHECK (Descuento >= 0),
    CostoEnvio DECIMAL(12,2) NOT NULL CONSTRAINT DF_Pedidos_Envio DEFAULT 0 CHECK (CostoEnvio >= 0),
    MontoReembolsado DECIMAL(12,2) NOT NULL CONSTRAINT DF_Pedidos_Reembolsado DEFAULT 0 CHECK (MontoReembolsado >= 0),
    Total DECIMAL(12,2) NOT NULL CHECK (Total >= 0),
    FechaCreacion DATETIME2 NOT NULL CONSTRAINT DF_Pedidos_Fecha DEFAULT SYSDATETIME()
);
GO

CREATE TABLE PedidoDetalles (
    IDPedidoDetalle INT IDENTITY(1,1) CONSTRAINT PK_PedidoDetalles PRIMARY KEY,
    IDPedido INT NOT NULL CONSTRAINT FK_Detalles_Pedidos FOREIGN KEY REFERENCES Pedidos(IDPedido),
    IDVariante INT NOT NULL CONSTRAINT FK_Detalles_Variantes FOREIGN KEY REFERENCES Variantes(IDVariante),
    CantidadComprada INT NOT NULL CHECK (CantidadComprada > 0),
    CantidadDevuelta INT NOT NULL CONSTRAINT DF_Detalles_Devuelta DEFAULT 0,
    PrecioUnitarioCongelado DECIMAL(12,2) NOT NULL CHECK (PrecioUnitarioCongelado > 0),
    DescuentoUnitarioProrrateado DECIMAL(12,2) NOT NULL CONSTRAINT DF_Detalles_DescUnit DEFAULT 0 CHECK (DescuentoUnitarioProrrateado >= 0),
    PrecioNetoUnitario DECIMAL(12,2) NOT NULL CHECK (PrecioNetoUnitario >= 0),
    SubtotalLinea DECIMAL(12,2) NOT NULL CHECK (SubtotalLinea >= 0),
    CONSTRAINT CK_Detalles_DevolucionValida CHECK (CantidadDevuelta <= CantidadComprada)
);
GO

CREATE TABLE Devoluciones (
    IDDevolucion INT IDENTITY(1,1) CONSTRAINT PK_Devoluciones PRIMARY KEY,
    IDPedido INT NOT NULL CONSTRAINT FK_Devoluciones_Pedidos FOREIGN KEY REFERENCES Pedidos(IDPedido),
    IDPedidoDetalle INT NOT NULL CONSTRAINT FK_Devoluciones_Detalles FOREIGN KEY REFERENCES PedidoDetalles(IDPedidoDetalle),
    IDUsuarioOperador INT NOT NULL CONSTRAINT FK_Devoluciones_Usuarios FOREIGN KEY REFERENCES Usuarios(IDUsuario),
    CantidadDevuelta INT NOT NULL CHECK (CantidadDevuelta > 0),
    MontoReembolsadoLinea DECIMAL(12,2) NOT NULL CHECK (MontoReembolsadoLinea >= 0),
    Motivo NVARCHAR(300) NOT NULL,
    FechaDevolucion DATETIME2 NOT NULL CONSTRAINT DF_Devoluciones_Fecha DEFAULT SYSDATETIME()
);
GO

CREATE TABLE PedidoHistorialEstados (
    IDPedidoHistorial INT IDENTITY(1,1) CONSTRAINT PK_PedidoHistorial PRIMARY KEY,
    IDPedido INT NOT NULL CONSTRAINT FK_Historial_Pedidos FOREIGN KEY REFERENCES Pedidos(IDPedido),
    IDUsuario INT NOT NULL CONSTRAINT FK_Historial_Usuarios FOREIGN KEY REFERENCES Usuarios(IDUsuario),
    IDEstadoAnterior INT NULL CONSTRAINT FK_Historial_EstadoAnt REFERENCES EstadosPedido(IDEstadoPedido),
    IDEstadoNuevo INT NOT NULL CONSTRAINT FK_Historial_EstadoNuevo REFERENCES EstadosPedido(IDEstadoPedido),
    Comentario NVARCHAR(300) NULL,
    FechaCambio DATETIME2 NOT NULL CONSTRAINT DF_Historial_Fecha DEFAULT SYSDATETIME()
);
GO

-- Bitácora de auditoría

CREATE TABLE Bitacora (
    IDBitacora BIGINT IDENTITY(1,1) CONSTRAINT PK_Bitacora PRIMARY KEY,
    IDUsuario INT NOT NULL CONSTRAINT FK_Bitacora_Usuarios FOREIGN KEY REFERENCES Usuarios(IDUsuario),
    Modulo VARCHAR(50) NOT NULL,
    Entidad VARCHAR(50) NOT NULL,
    IDEntidad INT NOT NULL,
    Accion VARCHAR(30) NOT NULL,
    ValorAnterior NVARCHAR(MAX) NULL,
    ValorNuevo NVARCHAR(MAX) NULL,
    FechaRegistro DATETIME2 NOT NULL CONSTRAINT DF_Bitacora_Fecha DEFAULT SYSDATETIME()
);
GO

CREATE TRIGGER TR_Bitacora_Inmutable ON Bitacora
INSTEAD OF UPDATE, DELETE AS
BEGIN
    RAISERROR('La Bitacora no permite actualizaciones ni eliminaciones.', 16, 1);
    ROLLBACK TRANSACTION;
END;
GO


CREATE INDEX IX_Municipios_IDDepartamento ON Municipios(IDDepartamento);
CREATE INDEX IX_Direcciones_IDUsuario_Activo ON Direcciones(IDUsuario, Activo);
CREATE INDEX IX_Productos_IDCategoria_Activo ON Productos(IDCategoria, Activo);
CREATE INDEX IX_Variantes_IDProducto_Precio ON Variantes(IDProducto, Precio, Activo);
CREATE INDEX IX_Reservas_IDVariante_Estado_Expira ON ReservasInventario(IDVariante, IDEstadoReserva, FechaExpiracion);
CREATE INDEX IX_Pedidos_IDUsuario_Estado_Fecha ON Pedidos(IDUsuario, IDEstadoPedido, FechaCreacion DESC);
CREATE INDEX IX_Kardex_IDVariante_Fecha ON Kardex(IDVariante, FechaMovimiento DESC);
CREATE INDEX IX_Bitacora_Modulo_Fecha ON Bitacora(Modulo, FechaRegistro DESC);
CREATE INDEX IX_Carritos_TokenInvitado ON Carritos(TokenInvitado) WHERE TokenInvitado IS NOT NULL;
CREATE INDEX IX_Carritos_IDUsuario ON Carritos(IDUsuario) WHERE IDUsuario IS NOT NULL;
GO

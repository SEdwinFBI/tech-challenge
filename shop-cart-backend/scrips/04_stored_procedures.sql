USE ShopCartDB;
GO

-- autenticación y usuarios
CREATE OR ALTER PROCEDURE SP_Auth_RegistrarCliente
    @Correo NVARCHAR(150),
    @PasswordHash NVARCHAR(255),
    @NombreCompleto NVARCHAR(150)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF EXISTS (SELECT 1 FROM Usuarios WITH (UPDLOCK, HOLDLOCK) WHERE Correo = @Correo)
            THROW 50010, 'El correo electrónico ya se encuentra registrado.', 1;

        DECLARE @IDRolCliente INT;
        SELECT @IDRolCliente = IDRol FROM Roles WHERE Codigo = 'CLIENTE';

        INSERT INTO Usuarios (IDRol, Correo, Password, Nombre)
        VALUES (@IDRolCliente, @Correo, @PasswordHash, @NombreCompleto);

        DECLARE @IDNuevoUsuario INT = CAST(SCOPE_IDENTITY() AS INT);

        COMMIT TRANSACTION;
        SELECT @IDNuevoUsuario AS IDUsuario, @Correo AS Correo, @NombreCompleto AS NombreCompleto, 'CLIENTE' AS Rol;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Auth_ObtenerUsuarioPorCorreo
    @Correo NVARCHAR(150)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        u.IDUsuario, 
        u.Correo, 
        u.Password AS PasswordHash, 
        u.Nombre AS NombreCompleto, 
        r.Codigo AS Rol, 
        u.Activo
    FROM Usuarios u
    INNER JOIN Roles r ON u.IDRol = r.IDRol
    WHERE u.Correo = @Correo;
END;
GO

CREATE OR ALTER PROCEDURE SP_Auth_GuardarRefreshToken
    @IDUsuario INT,
    @TokenHash VARCHAR(255),
    @FechaExpiracion DATETIME2,
    @FamilyExpiresAt DATETIME2 = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        INSERT INTO RefreshTokens (IDUsuario, TokenHash, FechaExpiracion, FamilyExpiresAt)
        VALUES (@IDUsuario, @TokenHash, @FechaExpiracion, ISNULL(@FamilyExpiresAt, DATEADD(DAY, 30, SYSDATETIME())));
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Auth_RotarRefreshToken
    @TokenHashActual VARCHAR(255),
    @NuevoTokenHash VARCHAR(255),
    @NuevaExpiracion DATETIME2
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @IDUsuario INT, @Revocado BIT, @Expiracion DATETIME2, @FamilyExpiresAt DATETIME2;
        SELECT @IDUsuario = IDUsuario, @Revocado = Revocado, @Expiracion = FechaExpiracion, @FamilyExpiresAt = FamilyExpiresAt
        FROM RefreshTokens WITH (UPDLOCK) WHERE TokenHash = @TokenHashActual;

        IF @IDUsuario IS NULL THROW 50011, 'Refresh token inválido.', 1;

        IF @Revocado = 1
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM RefreshTokens anterior
                INNER JOIN RefreshTokens sucesor ON sucesor.TokenHash = anterior.ReemplazadoPorToken
                WHERE anterior.TokenHash = @TokenHashActual
                  AND sucesor.Revocado = 0
                  AND sucesor.FechaCreacion >= DATEADD(SECOND, -10, SYSDATETIME())
            )
            BEGIN
                COMMIT TRANSACTION;
                THROW 50016, 'Ya se renovó esta sesión. Intenta de nuevo.', 1;
            END

            UPDATE RefreshTokens SET Revocado = 1 WHERE IDUsuario = @IDUsuario;
            COMMIT TRANSACTION;
            THROW 50012, 'Reutilización de token detectada. Sesiones revocadas por seguridad.', 1;
        END

        IF @Expiracion < SYSDATETIME() OR (@FamilyExpiresAt IS NOT NULL AND @FamilyExpiresAt < SYSDATETIME()) THROW 50013, 'El refresh token ha expirado.', 1;

        UPDATE RefreshTokens 
        SET Revocado = 1, ReemplazadoPorToken = @NuevoTokenHash 
        WHERE TokenHash = @TokenHashActual;

        DECLARE @ExpiracionEfectiva DATETIME2 = CASE WHEN @FamilyExpiresAt IS NOT NULL AND @NuevaExpiracion > @FamilyExpiresAt THEN @FamilyExpiresAt ELSE @NuevaExpiracion END;

        INSERT INTO RefreshTokens (IDUsuario, TokenHash, FechaExpiracion, FamilyExpiresAt) 
        VALUES (@IDUsuario, @NuevoTokenHash, @ExpiracionEfectiva, @FamilyExpiresAt);

        SELECT 
            u.IDUsuario, 
            u.Correo, 
            u.Nombre AS NombreCompleto, 
            r.Codigo AS Rol, 
            u.Activo 
        FROM Usuarios u
        INNER JOIN Roles r ON u.IDRol = r.IDRol
        WHERE u.IDUsuario = @IDUsuario AND u.Activo = 1;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Auth_RevocarRefreshToken
    @TokenHash VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE RefreshTokens SET Revocado = 1 WHERE TokenHash = @TokenHash;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Usuarios_CambiarEstado
    @IDUsuarioObjetivo INT,
    @Activo BIT,
    @IDUsuarioAdmin INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE Usuarios SET Activo = @Activo WHERE IDUsuario = @IDUsuarioObjetivo;
        IF @Activo = 0 UPDATE RefreshTokens SET Revocado = 1 WHERE IDUsuario = @IDUsuarioObjetivo;

        INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
        VALUES (@IDUsuarioAdmin, 'USUARIOS', 'Usuarios', @IDUsuarioObjetivo, 'CAMBIO_ESTADO', NULL, CONCAT('{"Activo":', @Activo, '}'));

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Usuarios_Listar
    @Busqueda NVARCHAR(150) = NULL,
    @Rol VARCHAR(20) = NULL,
    @Activo BIT = NULL,
    @Orden VARCHAR(20) = 'fecha',
    @Direccion VARCHAR(4) = 'desc',
    @Pagina INT = 1,
    @TamanoPagina INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    IF @Orden IS NULL OR @Orden NOT IN ('fecha', 'nombre', 'correo', 'rol') SET @Orden = 'fecha';
    IF @Direccion IS NULL OR @Direccion NOT IN ('asc', 'desc') SET @Direccion = 'desc';
    DECLARE @Patron NVARCHAR(500) = '%' + REPLACE(REPLACE(REPLACE(@Busqueda, '[', '[[]'), '%', '[%]'), '_', '[_]') + '%';
    IF @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina < 1 SET @TamanoPagina = 20;

    SELECT 
        u.IDUsuario, 
        u.Correo, 
        u.Nombre AS NombreCompleto, 
        r.Codigo AS Rol, 
        r.Nombre AS RolNombre, 
        u.Activo, 
        u.FechaCreacion, 
        COUNT(1) OVER() AS TotalRegistros
    INTO #Resultados
    FROM Usuarios u 
    INNER JOIN Roles r ON u.IDRol = r.IDRol
    WHERE (@Busqueda IS NULL OR u.Correo LIKE @Patron OR u.Nombre LIKE @Patron)
      AND (@Rol IS NULL OR r.Codigo = @Rol)
      AND (@Activo IS NULL OR u.Activo = @Activo);

    SELECT * FROM #Resultados
    ORDER BY
        CASE WHEN @Orden = 'fecha' AND @Direccion = 'asc' THEN FechaCreacion END ASC,
        CASE WHEN @Orden = 'fecha' AND @Direccion = 'desc' THEN FechaCreacion END DESC,
        CASE WHEN @Orden = 'nombre' AND @Direccion = 'asc' THEN NombreCompleto END ASC,
        CASE WHEN @Orden = 'nombre' AND @Direccion = 'desc' THEN NombreCompleto END DESC,
        CASE WHEN @Orden = 'correo' AND @Direccion = 'asc' THEN Correo END ASC,
        CASE WHEN @Orden = 'correo' AND @Direccion = 'desc' THEN Correo END DESC,
        CASE WHEN @Orden = 'rol' AND @Direccion = 'asc' THEN Rol END ASC,
        CASE WHEN @Orden = 'rol' AND @Direccion = 'desc' THEN Rol END DESC,
        IDUsuario DESC
    OFFSET (@Pagina - 1) * @TamanoPagina ROWS
    FETCH NEXT @TamanoPagina ROWS ONLY;
    SELECT COUNT(1) AS TotalRegistros FROM #Resultados;
END;
GO

CREATE OR ALTER PROCEDURE SP_Usuarios_CambiarRol
    @IDUsuarioObjetivo INT,
    @NuevoRol VARCHAR(20),
    @IDUsuarioAdmin INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @IDRol INT;
        SELECT @IDRol = IDRol FROM Roles WHERE Codigo = @NuevoRol;

        IF @IDRol IS NULL
            THROW 50014, 'El rol especificado no es válido.', 1;

        IF NOT EXISTS (SELECT 1 FROM Usuarios WITH (UPDLOCK) WHERE IDUsuario = @IDUsuarioObjetivo)
            THROW 50015, 'El usuario especificado no existe.', 1;

        DECLARE @RolAnterior VARCHAR(20);
        SELECT @RolAnterior = r.Codigo
        FROM Usuarios u
        INNER JOIN Roles r ON u.IDRol = r.IDRol
        WHERE u.IDUsuario = @IDUsuarioObjetivo;

        UPDATE Usuarios 
        SET IDRol = @IDRol 
        WHERE IDUsuario = @IDUsuarioObjetivo;

        INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
        VALUES (@IDUsuarioAdmin, 'USUARIOS', 'Usuarios', @IDUsuarioObjetivo, 'CAMBIO_ROL', CONCAT('{"Rol":"', @RolAnterior, '"}'), CONCAT('{"Rol":"', @NuevoRol, '"}'));

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Usuarios_ObtenerPorID
    @IDUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        u.IDUsuario, 
        u.Correo, 
        u.Nombre AS NombreCompleto, 
        r.Codigo AS Rol, 
        u.Activo, 
        u.FechaCreacion
    FROM Usuarios u 
    INNER JOIN Roles r ON u.IDRol = r.IDRol 
    WHERE u.IDUsuario = @IDUsuario;
END;
GO

CREATE OR ALTER PROCEDURE SP_Usuarios_ActualizarPerfil
    @IDUsuario INT,
    @Nombre NVARCHAR(150)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        SET @Nombre = LTRIM(RTRIM(@Nombre));
        IF @Nombre IS NULL OR LEN(@Nombre) < 3
            THROW 50097, 'El nombre debe tener al menos 3 caracteres.', 1;

        DECLARE @Anterior NVARCHAR(150);
        SELECT @Anterior = Nombre FROM Usuarios WITH (UPDLOCK) WHERE IDUsuario = @IDUsuario;
        IF @Anterior IS NULL THROW 50098, 'El usuario no existe.', 1;

        UPDATE Usuarios SET Nombre = @Nombre WHERE IDUsuario = @IDUsuario;

        INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
        VALUES (@IDUsuario, 'USUARIOS', 'Usuarios', @IDUsuario, 'MODIFICACION',
                CONCAT('{"Nombre":"', STRING_ESCAPE(@Anterior, 'json'), '"}'),
                CONCAT('{"Nombre":"', STRING_ESCAPE(@Nombre, 'json'), '"}'));
        COMMIT TRANSACTION;

        SELECT u.IDUsuario, u.Correo, u.Nombre AS NombreCompleto, r.Codigo AS Rol, u.Activo, u.FechaCreacion
        FROM Usuarios u INNER JOIN Roles r ON u.IDRol = r.IDRol
        WHERE u.IDUsuario = @IDUsuario;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Usuarios_CambiarPassword
    @IDUsuario INT,
    @PasswordHash NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF NOT EXISTS (SELECT 1 FROM Usuarios WITH (UPDLOCK) WHERE IDUsuario = @IDUsuario)
            THROW 50098, 'El usuario no existe.', 1;

        UPDATE Usuarios SET Password = @PasswordHash WHERE IDUsuario = @IDUsuario;
        UPDATE RefreshTokens SET Revocado = 1 WHERE IDUsuario = @IDUsuario AND Revocado = 0;

        INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
        VALUES (@IDUsuario, 'USUARIOS', 'Usuarios', @IDUsuario, 'CAMBIO_PASSWORD', NULL, '{"PasswordActualizado":true}');
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- catálogo de productos y categorías
CREATE OR ALTER PROCEDURE SP_Catalogo_ListarCategorias
    @SoloActivas BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.IDCategoria, c.Nombre, c.Descripcion, c.Activo,
           c.ImagenUrl,
           (SELECT COUNT(1) FROM Productos p WHERE p.IDCategoria = c.IDCategoria AND p.Activo = 1) AS TotalProductos
    FROM Categorias c
    WHERE (@SoloActivas = 0 OR c.Activo = 1)
    ORDER BY c.Nombre ASC;
END;
GO

CREATE OR ALTER PROCEDURE SP_Catalogo_GestionarCategoria
    @IDCategoria INT = NULL,
    @Nombre NVARCHAR(100),
    @Descripcion NVARCHAR(300) = NULL,
    @Activo BIT = 1,
    @IDUsuarioAdmin INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF @IDCategoria IS NULL
        BEGIN
            INSERT INTO Categorias (Nombre, Descripcion, Activo) VALUES (@Nombre, @Descripcion, @Activo);
            SET @IDCategoria = CAST(SCOPE_IDENTITY() AS INT);
            INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
            VALUES (@IDUsuarioAdmin, 'PRODUCTOS', 'Categorias', @IDCategoria, 'CREACION', NULL, CONCAT('{"Nombre":"', @Nombre, '"}'));
        END
        ELSE
        BEGIN
            UPDATE Categorias SET Nombre = @Nombre, Descripcion = @Descripcion, Activo = @Activo WHERE IDCategoria = @IDCategoria;
            INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
            VALUES (@IDUsuarioAdmin, 'PRODUCTOS', 'Categorias', @IDCategoria, 'MODIFICACION', NULL, CONCAT('{"Nombre":"', @Nombre, '","Activo":', @Activo, '}'));
        END

        COMMIT TRANSACTION;
        SELECT @IDCategoria AS IDCategoria;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Catalogo_ListarProductos
    @Busqueda NVARCHAR(150) = NULL,
    @IDCategoria INT = NULL,
    @PrecioMin DECIMAL(12,2) = NULL,
    @PrecioMax DECIMAL(12,2) = NULL,
    @SoloDisponibles BIT = 0,
    @IncluirInactivos BIT = 0,
    @OrdenarPor VARCHAR(20) = 'RECIENTES',
    @Pagina INT = 1,
    @TamanoPagina INT = 12,
    @SoloOfertas BIT = 0,
    @SoloNuevos BIT = 0,
    @SoloDestacados BIT = 0,
    @Activo BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Patron NVARCHAR(500) = '%' + REPLACE(REPLACE(REPLACE(@Busqueda, '[', '[[]'), '%', '[%]'), '_', '[_]') + '%';
    DECLARE @Offset INT = (@Pagina - 1) * @TamanoPagina;
    DECLARE @DiasNuevo INT = ISNULL((SELECT TRY_CAST(Valor AS INT) FROM ConfiguracionSistema WHERE Clave = 'DiasProductoNuevo'), 30);
    DECLARE @FechaNuevo DATETIME2 = DATEADD(DAY, -@DiasNuevo, SYSDATETIME());

    WITH ProductosFiltrados AS (
        SELECT
            p.IDProducto, p.Nombre, p.Descripcion, p.ImagenUrl, p.Activo,
            c.IDCategoria, c.Nombre AS Categoria,
            MIN(v.Precio) AS PrecioMinimo, MAX(v.Precio) AS PrecioMaximo,
            SUM(CASE WHEN v.Activo = 1 THEN disp.ExistenciaDisponible ELSE 0 END) AS StockTotalDisponible,
            p.FechaCreacion,
            p.Destacado,
            ofe.PrecioOferta, ofe.PrecioReferencia, ofe.PorcentajeDescuento,
            (SELECT ISNULL(SUM(pd.CantidadComprada - pd.CantidadDevuelta), 0)
             FROM PedidoDetalles pd
             INNER JOIN Variantes vv ON vv.IDVariante = pd.IDVariante
             INNER JOIN Pedidos pe ON pe.IDPedido = pd.IDPedido
             INNER JOIN EstadosPedido ep ON ep.IDEstadoPedido = pe.IDEstadoPedido
             WHERE vv.IDProducto = p.IDProducto
               AND ep.Codigo IN ('ENTREGADO', 'DEVUELTO_PARCIAL', 'DEVUELTO_TOTAL')) AS UnidadesVendidas
        FROM Productos p
        INNER JOIN Categorias c ON p.IDCategoria = c.IDCategoria
        INNER JOIN Variantes v ON p.IDProducto = v.IDProducto AND (v.Activo = 1 OR (@IncluirInactivos = 1 AND NOT EXISTS (SELECT 1 FROM Variantes v2 WHERE v2.IDProducto = p.IDProducto AND v2.Activo = 1)))
        CROSS APPLY dbo.FU_Inventario_ExistenciaDisponible(v.IDVariante) disp
        OUTER APPLY (
            SELECT TOP 1 vo.Precio AS PrecioOferta, vo.PrecioReferencia,
                   CAST(ROUND((vo.PrecioReferencia - vo.Precio) * 100.0 / vo.PrecioReferencia, 0) AS INT) AS PorcentajeDescuento
            FROM Variantes vo
            WHERE vo.IDProducto = p.IDProducto AND vo.Activo = 1
              AND vo.PrecioReferencia > vo.Precio
              AND (vo.PrecioReferencia - vo.Precio) * 100.0 / vo.PrecioReferencia >= 1
            ORDER BY (vo.PrecioReferencia - vo.Precio) / vo.PrecioReferencia DESC, vo.IDVariante ASC
        ) ofe
        WHERE (@IncluirInactivos = 1 OR (p.Activo = 1 AND c.Activo = 1))
          AND (@IDCategoria IS NULL OR p.IDCategoria = @IDCategoria)
          AND (@Activo IS NULL OR p.Activo = @Activo)
          AND (@Busqueda IS NULL OR p.Nombre LIKE @Patron OR p.Descripcion LIKE @Patron OR v.SKU LIKE @Patron)
          AND (@PrecioMin IS NULL OR v.Precio >= @PrecioMin)
          AND (@PrecioMax IS NULL OR v.Precio <= @PrecioMax)
          AND (@SoloNuevos = 0 OR p.FechaCreacion >= @FechaNuevo)
          AND (@SoloDestacados = 0 OR p.Destacado = 1)
          AND (@SoloOfertas = 0 OR ofe.PrecioReferencia IS NOT NULL)
        GROUP BY p.IDProducto, p.Nombre, p.Descripcion, p.ImagenUrl, p.Activo, c.IDCategoria, c.Nombre, p.FechaCreacion,
                 p.Destacado, ofe.PrecioOferta, ofe.PrecioReferencia, ofe.PorcentajeDescuento
        HAVING (@SoloDisponibles = 0 OR SUM(CASE WHEN v.Activo = 1 THEN disp.ExistenciaDisponible ELSE 0 END) > 0)
    )
    SELECT *, COUNT(1) OVER() AS TotalRegistros
    INTO #Resultados
    FROM ProductosFiltrados;

    SELECT * FROM #Resultados
    ORDER BY
        CASE WHEN @OrdenarPor = 'PRECIO_ASC' THEN PrecioMinimo END ASC,
        CASE WHEN @OrdenarPor = 'PRECIO_DESC' THEN PrecioMinimo END DESC,
        CASE WHEN @OrdenarPor = 'NOMBRE_ASC' THEN Nombre END ASC,
        CASE WHEN @OrdenarPor = 'NOMBRE_DESC' THEN Nombre END DESC,
        CASE WHEN @OrdenarPor = 'MAS_VENDIDOS' THEN UnidadesVendidas END DESC,
        CASE WHEN @OrdenarPor = 'DESTACADOS' THEN CAST(Destacado AS INT) END DESC,
        CASE WHEN @OrdenarPor = 'RECIENTES' THEN FechaCreacion END DESC,
        FechaCreacion DESC, IDProducto ASC
    OFFSET @Offset ROWS FETCH NEXT @TamanoPagina ROWS ONLY;
    SELECT COUNT(1) AS TotalRegistros FROM #Resultados;
END;
GO

CREATE OR ALTER PROCEDURE SP_Catalogo_ObtenerDetalleProducto
    @IDProducto INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT p.IDProducto, p.Nombre, p.Descripcion, p.ImagenUrl, p.Activo, c.IDCategoria, c.Nombre AS Categoria, p.Destacado
    FROM Productos p
    INNER JOIN Categorias c ON p.IDCategoria = c.IDCategoria
    WHERE p.IDProducto = @IDProducto AND p.Activo = 1 AND c.Activo = 1;

    SELECT v.IDVariante, v.SKU, v.Talla, v.Color, v.Presentacion, v.Precio, v.Activo,
           disp.ExistenciaFisica, disp.UnidadesReservadas, disp.ExistenciaDisponible,
           CASE WHEN v.PrecioReferencia > v.Precio THEN v.PrecioReferencia END AS PrecioReferencia
    FROM Variantes v
    CROSS APPLY dbo.FU_Inventario_ExistenciaDisponible(v.IDVariante) disp
    WHERE v.IDProducto = @IDProducto AND v.Activo = 1
      AND EXISTS (SELECT 1 FROM Productos p INNER JOIN Categorias c ON p.IDCategoria = c.IDCategoria WHERE p.IDProducto = @IDProducto AND p.Activo = 1 AND c.Activo = 1);

    SELECT i.IDProductoImagen, i.Url, i.Orden
    FROM ProductoImagenes i
    WHERE i.IDProducto = @IDProducto
      AND EXISTS (SELECT 1 FROM Productos p INNER JOIN Categorias c ON p.IDCategoria = c.IDCategoria WHERE p.IDProducto = @IDProducto AND p.Activo = 1 AND c.Activo = 1)
    ORDER BY i.Orden ASC;
END;
GO

CREATE OR ALTER PROCEDURE SP_Catalogo_CrearProductoConVariante
    @IDCategoria INT,
    @Nombre NVARCHAR(150),
    @Descripcion NVARCHAR(MAX) = NULL,
    @ImagenUrl NVARCHAR(500) = NULL,
    @SKU VARCHAR(50),
    @Talla VARCHAR(30) = NULL,
    @Color VARCHAR(50) = NULL,
    @Presentacion VARCHAR(50) = NULL,
    @Precio DECIMAL(12,2),
    @PrecioReferencia DECIMAL(12,2) = NULL,
    @ExistenciaInicial INT = 0,
    @IDUsuarioAdmin INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF @ImagenUrl IS NOT NULL AND @ImagenUrl NOT LIKE 'http://%' AND @ImagenUrl NOT LIKE 'https://%' AND @ImagenUrl NOT LIKE 'uploads/%'
            THROW 50094, 'La imagen debe ser una URL http(s) o una clave uploads/.', 1;

        IF @PrecioReferencia IS NOT NULL AND @PrecioReferencia <= @Precio
            THROW 50095, 'El precio de referencia debe ser mayor al precio de venta actual.', 1;

        IF EXISTS (SELECT 1 FROM Variantes WITH (UPDLOCK, HOLDLOCK) WHERE SKU = @SKU)
            THROW 50023, 'Ya existe una variante con el SKU especificado.', 1;

        INSERT INTO Productos (IDCategoria, Nombre, Descripcion, ImagenUrl)
        VALUES (@IDCategoria, @Nombre, @Descripcion, @ImagenUrl);
        DECLARE @IDProducto INT = CAST(SCOPE_IDENTITY() AS INT);

        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, PrecioReferencia, ExistenciaFisica)
        VALUES (@IDProducto, @SKU, @Talla, @Color, @Presentacion, @Precio, @PrecioReferencia, @ExistenciaInicial);
        DECLARE @IDVariante INT = CAST(SCOPE_IDENTITY() AS INT);

        IF @ExistenciaInicial > 0
        BEGIN
            DECLARE @IDTipoMovEntrada INT;
            SELECT @IDTipoMovEntrada = IDTipoMovimiento FROM TipoMovimiento WHERE Codigo = 'ENTRADA_COMPRA';

            INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo)
            VALUES (@IDVariante, @IDUsuarioAdmin, @IDTipoMovEntrada, @ExistenciaInicial, @ExistenciaInicial, 'Inventario inicial de creación');
        END

        INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
        VALUES (@IDUsuarioAdmin, 'PRODUCTOS', 'Productos', @IDProducto, 'CREACION', NULL, 
                CONCAT('{"Nombre":"', @Nombre, '","SKU":"', @SKU, '","Precio":', @Precio, '}'));

        COMMIT TRANSACTION;
        SELECT @IDProducto AS IDProducto, @IDVariante AS IDVariante;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Catalogo_ActualizarPrecioVariante
    @IDVariante INT,
    @NuevoPrecio DECIMAL(12,2),
    @IDUsuarioAdmin INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF @NuevoPrecio <= 0 THROW 50020, 'El precio debe ser mayor a cero.', 1;

        DECLARE @PrecioAnterior DECIMAL(12,2), @SKU VARCHAR(50);
        SELECT @PrecioAnterior = Precio, @SKU = SKU FROM Variantes WITH (UPDLOCK) WHERE IDVariante = @IDVariante;
        IF @SKU IS NULL THROW 50021, 'La variante no existe.', 1;

        UPDATE Variantes SET Precio = @NuevoPrecio WHERE IDVariante = @IDVariante;

        INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
        VALUES (@IDUsuarioAdmin, 'PRECIOS', 'Variantes', @IDVariante, 'MODIFICACION',
                CONCAT('{"SKU":"', @SKU, '","Precio":', @PrecioAnterior, '}'),
                CONCAT('{"SKU":"', @SKU, '","Precio":', @NuevoPrecio, '}'));

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Catalogo_EliminarODesactivarProducto
    @IDProducto INT,
    @IDUsuarioAdmin INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (SELECT 1 FROM Productos WITH (UPDLOCK) WHERE IDProducto = @IDProducto)
            THROW 50022, 'El producto no existe.', 1;

        IF EXISTS (SELECT 1 FROM PedidoDetalles pd INNER JOIN Variantes v ON pd.IDVariante = v.IDVariante WHERE v.IDProducto = @IDProducto)
        BEGIN
            UPDATE Productos SET Activo = 0 WHERE IDProducto = @IDProducto;
            UPDATE Variantes SET Activo = 0 WHERE IDProducto = @IDProducto;
            INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
            VALUES (@IDUsuarioAdmin, 'PRODUCTOS', 'Productos', @IDProducto, 'DESACTIVACION', '{"Activo":1}', '{"Activo":0}');
            COMMIT TRANSACTION;
            SELECT 'DESACTIVADO' AS Resultado, 'El producto tiene ventas asociadas; fue desactivado.' AS Mensaje;
        END
        ELSE
        BEGIN
            DELETE FROM CarritoItems WHERE IDVariante IN (SELECT IDVariante FROM Variantes WHERE IDProducto = @IDProducto);
            DELETE FROM ReservasInventario WHERE IDVariante IN (SELECT IDVariante FROM Variantes WHERE IDProducto = @IDProducto);
            DELETE FROM Kardex WHERE IDVariante IN (SELECT IDVariante FROM Variantes WHERE IDProducto = @IDProducto);
            DELETE FROM ProductoImagenes WHERE IDProducto = @IDProducto;
            DELETE FROM Favoritos WHERE IDProducto = @IDProducto;
            DELETE FROM Variantes WHERE IDProducto = @IDProducto;
            DELETE FROM Productos WHERE IDProducto = @IDProducto;
            INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
            VALUES (@IDUsuarioAdmin, 'PRODUCTOS', 'Productos', @IDProducto, 'ELIMINACION_FISICA', '{"Activo":1}', NULL);
            COMMIT TRANSACTION;
            SELECT 'ELIMINADO' AS Resultado, 'El producto sin ventas fue eliminado físicamente.' AS Mensaje;
        END
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Catalogo_ActualizarProducto
    @IDProducto INT,
    @IDCategoria INT = NULL,
    @Nombre NVARCHAR(150) = NULL,
    @Descripcion NVARCHAR(MAX) = NULL,
    @ImagenUrl NVARCHAR(500) = NULL,
    @Activo BIT = NULL,
    @IDUsuarioAdmin INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF @ImagenUrl IS NOT NULL AND @ImagenUrl NOT LIKE 'http://%' AND @ImagenUrl NOT LIKE 'https://%' AND @ImagenUrl NOT LIKE 'uploads/%'
            THROW 50094, 'La imagen debe ser una URL http(s) o una clave uploads/.', 1;

        DECLARE @CatAnterior INT, @NomAnterior NVARCHAR(150), @ActivoAnterior BIT;
        SELECT @CatAnterior = IDCategoria, @NomAnterior = Nombre, @ActivoAnterior = Activo
        FROM Productos WITH (UPDLOCK)
        WHERE IDProducto = @IDProducto;

        IF @NomAnterior IS NULL THROW 50022, 'El producto no existe.', 1;

        UPDATE Productos
        SET IDCategoria = ISNULL(@IDCategoria, IDCategoria),
            Nombre = ISNULL(@Nombre, Nombre),
            Descripcion = CASE WHEN @Descripcion IS NOT NULL THEN @Descripcion ELSE Descripcion END,
            ImagenUrl = CASE WHEN @ImagenUrl IS NOT NULL THEN @ImagenUrl ELSE ImagenUrl END,
            Activo = ISNULL(@Activo, Activo)
        WHERE IDProducto = @IDProducto;

        INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
        VALUES (@IDUsuarioAdmin, 'PRODUCTOS', 'Productos', @IDProducto, 'MODIFICACION',
                CONCAT('{"IDCategoria":', @CatAnterior, ',"Nombre":"', @NomAnterior, '","Activo":', @ActivoAnterior, '}'),
                CONCAT('{"IDCategoria":', ISNULL(@IDCategoria, @CatAnterior), ',"Nombre":"', ISNULL(@Nombre, @NomAnterior), '","Activo":', ISNULL(@Activo, @ActivoAnterior), '}'));

        COMMIT TRANSACTION;

        SELECT IDProducto, IDCategoria, Nombre, Descripcion, ImagenUrl, Activo FROM Productos WHERE IDProducto = @IDProducto;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Catalogo_CrearVariante
    @IDProducto INT,
    @SKU VARCHAR(50),
    @Talla VARCHAR(30) = NULL,
    @Color VARCHAR(50) = NULL,
    @Presentacion VARCHAR(50) = NULL,
    @Precio DECIMAL(12,2),
    @ExistenciaInicial INT = 0,
    @IDUsuarioAdmin INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (SELECT 1 FROM Productos WITH (UPDLOCK) WHERE IDProducto = @IDProducto)
            THROW 50022, 'El producto especificado no existe.', 1;

        IF @Precio <= 0
            THROW 50020, 'El precio debe ser mayor a cero.', 1;

        IF EXISTS (SELECT 1 FROM Variantes WITH (UPDLOCK, HOLDLOCK) WHERE SKU = @SKU)
            THROW 50023, 'Ya existe una variante con el SKU especificado.', 1;

        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica)
        VALUES (@IDProducto, @SKU, @Talla, @Color, @Presentacion, @Precio, @ExistenciaInicial);
        DECLARE @IDVariante INT = CAST(SCOPE_IDENTITY() AS INT);

        IF @ExistenciaInicial > 0
        BEGIN
            DECLARE @IDTipoMovEntrada INT;
            SELECT @IDTipoMovEntrada = IDTipoMovimiento FROM TipoMovimiento WHERE Codigo = 'ENTRADA_COMPRA';

            INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo)
            VALUES (@IDVariante, @IDUsuarioAdmin, @IDTipoMovEntrada, @ExistenciaInicial, @ExistenciaInicial, 'Inventario inicial de nueva variante');
        END

        INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
        VALUES (@IDUsuarioAdmin, 'PRODUCTOS', 'Variantes', @IDVariante, 'CREACION', NULL,
                CONCAT('{"IDProducto":', @IDProducto, ',"SKU":"', @SKU, '","Precio":', @Precio, ',"ExistenciaInicial":', @ExistenciaInicial, '}'));

        COMMIT TRANSACTION;

        SELECT @IDVariante AS IDVariante, @IDProducto AS IDProducto;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Catalogo_ActualizarVariante
    @IDVariante INT,
    @SKU VARCHAR(50) = NULL,
    @Talla VARCHAR(30) = NULL,
    @Color VARCHAR(50) = NULL,
    @Presentacion VARCHAR(50) = NULL,
    @Precio DECIMAL(12,2) = NULL,
    @Activo BIT = NULL,
    @IDUsuarioAdmin INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (SELECT 1 FROM Variantes WITH (UPDLOCK) WHERE IDVariante = @IDVariante)
            THROW 50021, 'La variante especificada no existe.', 1;

        IF @SKU IS NOT NULL AND EXISTS (SELECT 1 FROM Variantes WITH (UPDLOCK, HOLDLOCK) WHERE SKU = @SKU AND IDVariante <> @IDVariante)
            THROW 50023, 'Ya existe una variante con el SKU especificado.', 1;

        IF @Precio IS NOT NULL AND @Precio <= 0
            THROW 50020, 'El precio debe ser mayor a cero.', 1;

        UPDATE Variantes
        SET 
            SKU = ISNULL(@SKU, SKU),
            Talla = ISNULL(@Talla, Talla),
            Color = ISNULL(@Color, Color),
            Presentacion = ISNULL(@Presentacion, Presentacion),
            Precio = ISNULL(@Precio, Precio),
            Activo = ISNULL(@Activo, Activo)
        WHERE IDVariante = @IDVariante;

        INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
        VALUES (@IDUsuarioAdmin, 'PRODUCTOS', 'Variantes', @IDVariante, 'MODIFICACION', NULL,
                CONCAT('{"SKU":"', ISNULL(@SKU, ''), '","Precio":', ISNULL(@Precio, 0), '}'));

        COMMIT TRANSACTION;

        SELECT IDVariante, IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo
        FROM Variantes
        WHERE IDVariante = @IDVariante;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Catalogo_ListarImagenesProducto
    @IDProducto INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i.IDProductoImagen, i.IDProducto, i.Url, i.Orden
    FROM ProductoImagenes i
    INNER JOIN Productos p ON p.IDProducto = i.IDProducto AND p.Activo = 1
    WHERE i.IDProducto = @IDProducto
    ORDER BY i.Orden ASC;
END;
GO

CREATE OR ALTER PROCEDURE SP_Catalogo_AgregarImagenProducto
    @IDProducto INT,
    @Url NVARCHAR(500),
    @IDUsuarioAdmin INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF @Url IS NULL OR (@Url NOT LIKE 'http://%' AND @Url NOT LIKE 'https://%' AND @Url NOT LIKE 'uploads/%')
            THROW 50094, 'La imagen debe ser una URL http(s) o una clave uploads/.', 1;
        IF NOT EXISTS (SELECT 1 FROM Productos WITH (UPDLOCK, HOLDLOCK) WHERE IDProducto = @IDProducto)
            THROW 50090, 'El producto no existe.', 1;
        IF (SELECT COUNT(1) FROM ProductoImagenes WHERE IDProducto = @IDProducto) >= 10
            THROW 50092, 'Un producto admite como maximo 10 imagenes en su galeria.', 1;

        DECLARE @Orden INT = ISNULL((SELECT MAX(Orden) FROM ProductoImagenes WHERE IDProducto = @IDProducto), 0) + 1;
        INSERT INTO ProductoImagenes (IDProducto, Url, Orden) VALUES (@IDProducto, @Url, @Orden);
        DECLARE @IDNuevo INT = SCOPE_IDENTITY();

        INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
        VALUES (@IDUsuarioAdmin, 'PRODUCTOS', 'ProductoImagenes', @IDNuevo, 'CREACION', NULL,
                CONCAT('{"IDProducto":', @IDProducto, ',"Url":"', STRING_ESCAPE(@Url, 'json'), '","Orden":', @Orden, '}'));
        COMMIT TRANSACTION;

        SELECT IDProductoImagen, IDProducto, Url, Orden FROM ProductoImagenes WHERE IDProductoImagen = @IDNuevo;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Catalogo_EliminarImagenProducto
    @IDProductoImagen INT,
    @IDUsuarioAdmin INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @IDProducto INT, @Url NVARCHAR(500), @Orden INT;
        SELECT @IDProducto = IDProducto, @Url = Url, @Orden = Orden
        FROM ProductoImagenes WITH (UPDLOCK, HOLDLOCK) WHERE IDProductoImagen = @IDProductoImagen;
        IF @IDProducto IS NULL THROW 50091, 'La imagen no existe.', 1;

        DELETE FROM ProductoImagenes WHERE IDProductoImagen = @IDProductoImagen;

        INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
        VALUES (@IDUsuarioAdmin, 'PRODUCTOS', 'ProductoImagenes', @IDProductoImagen, 'ELIMINACION_FISICA',
                CONCAT('{"IDProducto":', @IDProducto, ',"Url":"', STRING_ESCAPE(@Url, 'json'), '","Orden":', @Orden, '}'), NULL);
        COMMIT TRANSACTION;
        SELECT @Url AS Url;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Catalogo_ActualizarPrecioReferencia
    @IDVariante INT,
    @PrecioReferencia DECIMAL(12,2) = NULL,
    @IDUsuarioAdmin INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @Precio DECIMAL(12,2), @Anterior DECIMAL(12,2), @SKU VARCHAR(50);
        SELECT @Precio = Precio, @Anterior = PrecioReferencia, @SKU = SKU
        FROM Variantes WITH (UPDLOCK) WHERE IDVariante = @IDVariante;
        IF @SKU IS NULL THROW 50093, 'La variante no existe.', 1;
        IF @PrecioReferencia IS NOT NULL AND @PrecioReferencia <= @Precio
            THROW 50095, 'El precio de referencia debe ser mayor al precio de venta actual.', 1;

        UPDATE Variantes SET PrecioReferencia = @PrecioReferencia WHERE IDVariante = @IDVariante;

        INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
        VALUES (@IDUsuarioAdmin, 'PRECIOS', 'Variantes', @IDVariante, 'MODIFICACION',
                CONCAT('{"SKU":"', STRING_ESCAPE(@SKU, 'json'), '","PrecioReferencia":', ISNULL(CONVERT(VARCHAR(20), @Anterior), 'null'), '}'),
                CONCAT('{"SKU":"', STRING_ESCAPE(@SKU, 'json'), '","PrecioReferencia":', ISNULL(CONVERT(VARCHAR(20), @PrecioReferencia), 'null'), '}'));
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Catalogo_MarcarDestacado
    @IDProducto INT,
    @Destacado BIT,
    @IDUsuarioAdmin INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @Anterior BIT;
        SELECT @Anterior = Destacado FROM Productos WITH (UPDLOCK) WHERE IDProducto = @IDProducto;
        IF @Anterior IS NULL THROW 50090, 'El producto no existe.', 1;

        UPDATE Productos SET Destacado = @Destacado WHERE IDProducto = @IDProducto;

        INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
        VALUES (@IDUsuarioAdmin, 'PRODUCTOS', 'Productos', @IDProducto, 'MODIFICACION',
                CONCAT('{"Destacado":', CAST(@Anterior AS INT), '}'),
                CONCAT('{"Destacado":', CAST(@Destacado AS INT), '}'));
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Catalogo_ActualizarImagenCategoria
    @IDCategoria INT,
    @ImagenUrl NVARCHAR(500) = NULL,
    @IDUsuarioAdmin INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF @ImagenUrl IS NOT NULL AND @ImagenUrl NOT LIKE 'http://%' AND @ImagenUrl NOT LIKE 'https://%'
            THROW 50094, 'La URL de la imagen debe iniciar con http:// o https://.', 1;

        DECLARE @Anterior NVARCHAR(500), @Existe BIT = 0;
        SELECT @Anterior = ImagenUrl, @Existe = 1 FROM Categorias WITH (UPDLOCK) WHERE IDCategoria = @IDCategoria;
        IF @Existe = 0 THROW 50096, 'La categoria no existe.', 1;

        UPDATE Categorias SET ImagenUrl = @ImagenUrl WHERE IDCategoria = @IDCategoria;

        INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
        VALUES (@IDUsuarioAdmin, 'PRODUCTOS', 'Categorias', @IDCategoria, 'MODIFICACION',
                CONCAT('{"ImagenUrl":', ISNULL('"' + STRING_ESCAPE(@Anterior, 'json') + '"', 'null'), '}'),
                CONCAT('{"ImagenUrl":', ISNULL('"' + STRING_ESCAPE(@ImagenUrl, 'json') + '"', 'null'), '}'));
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Catalogo_ObtenerDetalleAdmin
    @IDProducto INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT p.IDProducto, p.Nombre, p.Descripcion, p.ImagenUrl, p.Activo, c.IDCategoria, c.Nombre AS Categoria, p.Destacado
    FROM Productos p
    INNER JOIN Categorias c ON p.IDCategoria = c.IDCategoria
    WHERE p.IDProducto = @IDProducto;

    SELECT v.IDVariante, v.IDProducto, v.SKU, v.Talla, v.Color, v.Presentacion, v.Precio, v.Activo,
           disp.ExistenciaFisica, disp.UnidadesReservadas, disp.ExistenciaDisponible,
           v.PrecioReferencia
    FROM Variantes v
    CROSS APPLY dbo.FU_Inventario_ExistenciaDisponible(v.IDVariante) disp
    WHERE v.IDProducto = @IDProducto
    ORDER BY v.IDVariante ASC;

    SELECT i.IDProductoImagen, i.IDProducto, i.Url, i.Orden
    FROM ProductoImagenes i
    WHERE i.IDProducto = @IDProducto
    ORDER BY i.Orden ASC;
END;
GO

CREATE OR ALTER PROCEDURE SP_Catalogo_ContextoRevision
    @Nombre NVARCHAR(150), @IDProducto INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP (20) IDCategoria, Nombre, Descripcion FROM Categorias WHERE Activo = 1 ORDER BY IDCategoria;
    SELECT TOP (20) p.IDProducto, p.Nombre, p.Descripcion, c.Nombre AS Categoria
    FROM Productos p INNER JOIN Categorias c ON c.IDCategoria = p.IDCategoria
    OUTER APPLY (
        SELECT COUNT(DISTINCT token.value) AS Coincidencias
        FROM STRING_SPLIT(@Nombre, ' ') token
        WHERE LEN(token.value) >= 3 AND CHARINDEX(token.value COLLATE Latin1_General_CI_AI, p.Nombre COLLATE Latin1_General_CI_AI) > 0
    ) similitud
    WHERE (@IDProducto IS NULL OR p.IDProducto <> @IDProducto) AND similitud.Coincidencias > 0
    ORDER BY CASE WHEN p.Nombre COLLATE Latin1_General_CI_AI = @Nombre COLLATE Latin1_General_CI_AI THEN 0 ELSE 1 END,
        similitud.Coincidencias DESC, p.IDProducto;
END;
GO

CREATE OR ALTER PROCEDURE SP_Favoritos_Listar
    @IDUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        p.IDProducto, p.Nombre, p.Descripcion, p.ImagenUrl, p.Activo,
        c.IDCategoria, c.Nombre AS Categoria,
        MIN(v.Precio) AS PrecioMinimo, MAX(v.Precio) AS PrecioMaximo,
        SUM(disp.ExistenciaDisponible) AS StockTotalDisponible,
        p.FechaCreacion, p.Destacado,
        ofe.PrecioOferta, ofe.PrecioReferencia, ofe.PorcentajeDescuento,
        f.FechaCreacion AS FechaFavorito
    FROM Favoritos f
    INNER JOIN Productos p ON p.IDProducto = f.IDProducto AND p.Activo = 1
    INNER JOIN Categorias c ON c.IDCategoria = p.IDCategoria AND c.Activo = 1
    INNER JOIN Variantes v ON v.IDProducto = p.IDProducto AND v.Activo = 1
    CROSS APPLY dbo.FU_Inventario_ExistenciaDisponible(v.IDVariante) disp
    OUTER APPLY (
        SELECT TOP 1 vo.Precio AS PrecioOferta, vo.PrecioReferencia,
               CAST(ROUND((vo.PrecioReferencia - vo.Precio) * 100.0 / vo.PrecioReferencia, 0) AS INT) AS PorcentajeDescuento
        FROM Variantes vo
        WHERE vo.IDProducto = p.IDProducto AND vo.Activo = 1
          AND vo.PrecioReferencia > vo.Precio
          AND (vo.PrecioReferencia - vo.Precio) * 100.0 / vo.PrecioReferencia >= 1
        ORDER BY (vo.PrecioReferencia - vo.Precio) / vo.PrecioReferencia DESC, vo.IDVariante ASC
    ) ofe
    WHERE f.IDUsuario = @IDUsuario
    GROUP BY p.IDProducto, p.Nombre, p.Descripcion, p.ImagenUrl, p.Activo, c.IDCategoria, c.Nombre, p.FechaCreacion,
             p.Destacado, ofe.PrecioOferta, ofe.PrecioReferencia, ofe.PorcentajeDescuento, f.FechaCreacion
    ORDER BY f.FechaCreacion DESC;
END;
GO

CREATE OR ALTER PROCEDURE SP_Favoritos_ListarIDs
    @IDUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT IDProducto FROM Favoritos WHERE IDUsuario = @IDUsuario ORDER BY FechaCreacion DESC;
END;
GO

CREATE OR ALTER PROCEDURE SP_Favoritos_Agregar
    @IDUsuario INT,
    @IDProducto INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF NOT EXISTS (SELECT 1 FROM Productos WHERE IDProducto = @IDProducto AND Activo = 1)
            THROW 50090, 'El producto no existe o no esta disponible.', 1;
        IF NOT EXISTS (SELECT 1 FROM Favoritos WITH (UPDLOCK, HOLDLOCK) WHERE IDUsuario = @IDUsuario AND IDProducto = @IDProducto)
            INSERT INTO Favoritos (IDUsuario, IDProducto) VALUES (@IDUsuario, @IDProducto);
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Favoritos_Quitar
    @IDUsuario INT,
    @IDProducto INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM Favoritos WHERE IDUsuario = @IDUsuario AND IDProducto = @IDProducto;
END;
GO

CREATE OR ALTER PROCEDURE SP_Recomendaciones_RegistrarVista
    @Propietario VARCHAR(70), @IDProducto INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF NOT EXISTS (SELECT 1 FROM Productos WHERE IDProducto = @IDProducto AND Activo = 1) RETURN;
    BEGIN TRANSACTION;
    IF EXISTS (SELECT 1 FROM RecomendacionVistas WITH (UPDLOCK, HOLDLOCK)
               WHERE Propietario = @Propietario AND IDProducto = @IDProducto)
        UPDATE RecomendacionVistas
        SET Visitas = CASE WHEN UltimaVista < DATEADD(DAY, -30, SYSDATETIME()) THEN 1
                           WHEN Visitas < 3 THEN Visitas + 1 ELSE 3 END,
            UltimaVista = SYSDATETIME()
        WHERE Propietario = @Propietario AND IDProducto = @IDProducto
          AND UltimaVista < DATEADD(MINUTE, -1, SYSDATETIME());
    ELSE
        INSERT INTO RecomendacionVistas (Propietario, IDProducto, Visitas) VALUES (@Propietario, @IDProducto, 1);
    DELETE FROM RecomendacionVistas WHERE IDRecomendacionVista IN (
        SELECT IDRecomendacionVista FROM RecomendacionVistas WHERE Propietario = @Propietario
        ORDER BY UltimaVista DESC, IDRecomendacionVista DESC OFFSET 50 ROWS);
    COMMIT;
END;
GO

CREATE OR ALTER PROCEDURE SP_Recomendaciones_PurgarVistas
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Borradas INT = 1;
    WHILE @Borradas > 0
    BEGIN
        DELETE TOP (5000) FROM RecomendacionVistas WHERE UltimaVista < DATEADD(DAY, -90, SYSDATETIME());
        SET @Borradas = @@ROWCOUNT;
    END;
END;
GO

CREATE OR ALTER PROCEDURE SP_Recomendaciones_ObtenerContexto
    @Propietario VARCHAR(70), @IDUsuario INT = NULL, @TokenInvitado VARCHAR(100) = NULL,
    @IDProducto INT = NULL, @Contexto VARCHAR(20) = 'producto',
    @IDCategoria INT = NULL, @PrecioMin DECIMAL(12,2) = NULL, @PrecioMax DECIMAL(12,2) = NULL,
    @Busqueda NVARCHAR(150) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Patron NVARCHAR(500) = '%' + REPLACE(REPLACE(REPLACE(@Busqueda, '[', '[[]'), '%', '[%]'), '_', '[_]') + '%';
    CREATE TABLE #Senales (IDProducto INT, Tipo VARCHAR(10), Peso FLOAT);
    INSERT INTO #Senales
    SELECT IDProducto, 'VISTA', Visitas * POWER(CAST(0.5 AS FLOAT), DATEDIFF(DAY, UltimaVista, SYSDATETIME()) / 14.0)
    FROM RecomendacionVistas WHERE Propietario = @Propietario AND UltimaVista >= DATEADD(DAY, -90, SYSDATETIME());
    INSERT INTO #Senales SELECT IDProducto, 'FAVORITO', 3 FROM Favoritos WHERE IDUsuario = @IDUsuario;
    INSERT INTO #Senales
    SELECT DISTINCT v.IDProducto, 'CARRITO', 4 FROM Carritos c
    INNER JOIN CarritoItems ci ON ci.IDCarrito = c.IDCarrito
    INNER JOIN Variantes v ON v.IDVariante = ci.IDVariante
    WHERE (@IDUsuario IS NOT NULL AND c.IDUsuario = @IDUsuario)
       OR (@IDUsuario IS NULL AND c.IDUsuario IS NULL AND c.TokenInvitado = @TokenInvitado);
    INSERT INTO #Senales
    SELECT v.IDProducto, 'COMPRA', 6 * MAX(POWER(CAST(0.5 AS FLOAT), DATEDIFF(DAY, pe.FechaCreacion, SYSDATETIME()) / 30.0))
    FROM Pedidos pe INNER JOIN EstadosPedido e ON pe.IDEstadoPedido = e.IDEstadoPedido
    INNER JOIN PedidoDetalles pd ON pd.IDPedido = pe.IDPedido
    INNER JOIN Variantes v ON v.IDVariante = pd.IDVariante
    WHERE pe.IDUsuario = @IDUsuario AND e.Codigo NOT IN ('CANCELADO', 'DEVUELTO_TOTAL')
      AND pd.CantidadComprada > pd.CantidadDevuelta AND pe.FechaCreacion >= DATEADD(DAY, -90, SYSDATETIME())
    GROUP BY v.IDProducto;

    SELECT TOP (40) s.IDProducto, p.IDCategoria, p.Nombre, p.Descripcion, c.Nombre AS Categoria,
        s.Tipo, s.Peso, precio.PrecioMinimo
    FROM #Senales s INNER JOIN Productos p ON p.IDProducto = s.IDProducto
    INNER JOIN Categorias c ON c.IDCategoria = p.IDCategoria
    OUTER APPLY (SELECT MIN(v.Precio) AS PrecioMinimo FROM Variantes v WHERE v.IDProducto = p.IDProducto AND v.Activo = 1) precio
    WHERE p.Activo = 1 AND (@Contexto <> 'favoritos' OR s.Tipo = 'FAVORITO')
    ORDER BY s.Peso DESC, s.IDProducto, s.Tipo;

    DECLARE @IDCategoriaRef INT, @PrecioRef DECIMAL(12,2), @PrecioFavoritos DECIMAL(12,2), @ConCarrito BIT = 0, @ConFavoritos BIT = 0;
    IF @IDProducto IS NOT NULL
        SELECT @IDCategoriaRef = p.IDCategoria,
               @PrecioRef = (SELECT MIN(v.Precio) FROM Variantes v WHERE v.IDProducto = p.IDProducto AND v.Activo = 1)
        FROM Productos p WHERE p.IDProducto = @IDProducto;
    IF EXISTS (SELECT 1 FROM #Senales WHERE Tipo = 'CARRITO') SET @ConCarrito = 1;
    IF EXISTS (SELECT 1 FROM #Senales WHERE Tipo = 'FAVORITO') SET @ConFavoritos = 1;
    SELECT @PrecioFavoritos = AVG(CAST(m.Precio AS DECIMAL(12,2)))
    FROM #Senales s CROSS APPLY (SELECT MIN(v.Precio) AS Precio FROM Variantes v WHERE v.IDProducto = s.IDProducto AND v.Activo = 1) m
    WHERE s.Tipo = 'FAVORITO' AND m.Precio IS NOT NULL;

    CREATE TABLE #Ventas (IDProducto INT PRIMARY KEY, Unidades INT, Unidades90 INT);
    INSERT INTO #Ventas
    SELECT v.IDProducto, SUM(pd.CantidadComprada - pd.CantidadDevuelta),
        SUM(CASE WHEN pe.FechaCreacion >= DATEADD(DAY, -90, SYSDATETIME()) THEN pd.CantidadComprada - pd.CantidadDevuelta ELSE 0 END)
    FROM Pedidos pe INNER JOIN EstadosPedido e ON e.IDEstadoPedido = pe.IDEstadoPedido
    INNER JOIN PedidoDetalles pd ON pd.IDPedido = pe.IDPedido
    INNER JOIN Variantes v ON v.IDVariante = pd.IDVariante
    WHERE e.Codigo IN ('ENTREGADO', 'DEVUELTO_PARCIAL')
    GROUP BY v.IDProducto;

    ;WITH Candidatos AS (
    SELECT p.IDProducto, p.IDCategoria, p.Nombre, p.Descripcion, p.ImagenUrl, p.Activo,
        c.Nombre AS Categoria, MIN(v.Precio) AS PrecioMinimo, MAX(v.Precio) AS PrecioMaximo,
        SUM(disp.ExistenciaDisponible) AS StockTotalDisponible, p.Destacado,
        ofe.PrecioOferta, ofe.PrecioReferencia, ofe.PorcentajeDescuento,
        COALESCE(afinidad.Peso, 0) AS Afinidad,
        COALESCE(vt.Unidades, 0) AS Unidades, COALESCE(vt.Unidades90, 0) AS Unidades90
    FROM Productos p INNER JOIN Categorias c ON c.IDCategoria = p.IDCategoria AND c.Activo = 1
    INNER JOIN Variantes v ON v.IDProducto = p.IDProducto AND v.Activo = 1
    CROSS APPLY FU_Inventario_ExistenciaDisponible(v.IDVariante) disp
    LEFT JOIN #Ventas vt ON vt.IDProducto = p.IDProducto
    OUTER APPLY (
        SELECT TOP (1) vo.Precio AS PrecioOferta, vo.PrecioReferencia,
            CAST(ROUND((vo.PrecioReferencia - vo.Precio) * 100.0 / vo.PrecioReferencia, 0) AS INT) AS PorcentajeDescuento
        FROM Variantes vo CROSS APPLY FU_Inventario_ExistenciaDisponible(vo.IDVariante) vd
        WHERE vo.IDProducto = p.IDProducto AND vo.Activo = 1 AND vd.ExistenciaDisponible > 0
          AND vo.PrecioReferencia > vo.Precio AND (vo.PrecioReferencia - vo.Precio) * 100.0 / vo.PrecioReferencia >= 1
          AND (@PrecioMin IS NULL OR vo.Precio >= @PrecioMin) AND (@PrecioMax IS NULL OR vo.Precio <= @PrecioMax)
        ORDER BY (vo.PrecioReferencia - vo.Precio) / vo.PrecioReferencia DESC, vo.IDVariante
    ) ofe
    OUTER APPLY (SELECT SUM(s.Peso) AS Peso FROM #Senales s
                 INNER JOIN Productos preferido ON preferido.IDProducto = s.IDProducto
                 WHERE preferido.IDCategoria = p.IDCategoria AND s.Tipo <> 'CARRITO') afinidad
    WHERE p.Activo = 1 AND disp.ExistenciaDisponible > 0
      AND (@Contexto <> 'ofertas' OR ofe.PrecioReferencia IS NOT NULL)
      AND (@IDCategoria IS NULL OR p.IDCategoria = @IDCategoria)
      AND (@PrecioMin IS NULL OR v.Precio >= @PrecioMin) AND (@PrecioMax IS NULL OR v.Precio <= @PrecioMax)
      AND (@Busqueda IS NULL OR p.Nombre LIKE @Patron OR p.Descripcion LIKE @Patron OR v.SKU LIKE @Patron)
      AND (@Contexto <> 'favoritos' OR NOT EXISTS (SELECT 1 FROM #Senales s WHERE s.IDProducto = p.IDProducto AND s.Tipo = 'FAVORITO'))
      AND (@Contexto <> 'carrito' OR @ConCarrito = 0 OR NOT EXISTS (
            SELECT 1 FROM #Senales s INNER JOIN Productos k ON k.IDProducto = s.IDProducto
            WHERE s.Tipo = 'CARRITO' AND k.IDCategoria = p.IDCategoria))
      AND (@IDProducto IS NULL OR p.IDProducto <> @IDProducto)
      AND NOT EXISTS (SELECT 1 FROM #Senales s WHERE s.IDProducto = p.IDProducto AND s.Tipo = 'CARRITO')
    GROUP BY p.IDProducto, p.IDCategoria, p.Nombre, p.Descripcion, p.ImagenUrl, p.Activo,
        c.Nombre, p.Destacado, afinidad.Peso, vt.Unidades, vt.Unidades90,
        ofe.PrecioOferta, ofe.PrecioReferencia, ofe.PorcentajeDescuento
    ), Claves AS (
        SELECT *,
            CAST(CASE @Contexto
                WHEN 'producto' THEN CASE WHEN IDCategoria = @IDCategoriaRef THEN 0 ELSE 1 END
                WHEN 'carrito' THEN -Unidades
                WHEN 'inicio' THEN -(Unidades90 + CASE WHEN Afinidad > 4 THEN 1.0 ELSE Afinidad / 4.0 END)
                WHEN 'favoritos' THEN CASE WHEN @ConFavoritos = 1 AND NOT EXISTS (
                    SELECT 1 FROM #Senales s INNER JOIN Productos f ON f.IDProducto = s.IDProducto
                    WHERE s.Tipo = 'FAVORITO' AND f.IDCategoria = Candidatos.IDCategoria) THEN 1 ELSE 0 END
                WHEN 'ofertas' THEN -Afinidad
                ELSE 0 END AS FLOAT) AS Clave1,
            CAST(CASE @Contexto
                WHEN 'producto' THEN CASE WHEN IDCategoria = @IDCategoriaRef THEN ABS(PrecioMinimo - @PrecioRef) ELSE -Afinidad END
                WHEN 'favoritos' THEN CASE WHEN @ConFavoritos = 1 THEN ABS(PrecioMinimo - @PrecioFavoritos) ELSE -Unidades END
                WHEN 'ofertas' THEN -COALESCE(PorcentajeDescuento, 0)
                ELSE 0 END AS FLOAT) AS Clave2
        FROM Candidatos
    ), Ordenados AS (
        SELECT *, ROW_NUMBER() OVER (ORDER BY Clave1, Clave2, Destacado DESC, IDProducto) AS Orden FROM Claves
    )
    SELECT TOP (30) IDProducto, IDCategoria, Nombre, Descripcion, ImagenUrl, Activo, Categoria,
        PrecioMinimo, PrecioMaximo, StockTotalDisponible, Destacado, Afinidad, PrecioOferta, PrecioReferencia, PorcentajeDescuento
    FROM Ordenados ORDER BY Orden;
END;
GO

CREATE OR ALTER PROCEDURE SP_Recomendaciones_BuscarCandidatos
    @Busqueda NVARCHAR(150), @IDCategoria INT = NULL, @PrecioMin DECIMAL(12,2) = NULL,
    @PrecioMax DECIMAL(12,2) = NULL, @SoloOfertas BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Patron NVARCHAR(500) = '%' + REPLACE(REPLACE(REPLACE(@Busqueda, '[', '[[]'), '%', '[%]'), '_', '[_]') + '%';
    DECLARE @Terminos TABLE (Palabra NVARCHAR(150) COLLATE Latin1_General_CI_AI PRIMARY KEY);
    INSERT INTO @Terminos SELECT DISTINCT LOWER(value) COLLATE Latin1_General_CI_AI
    FROM STRING_SPLIT(REPLACE(REPLACE(REPLACE(@Busqueda, ',', ' '), '.', ' '), '-', ' '), ' ')
    WHERE LEN(value) >= 2 AND LOWER(value) COLLATE Latin1_General_CI_AI NOT IN ('de', 'del', 'la', 'el', 'los', 'las', 'para', 'con', 'un', 'una', 'por', 'en', 'que', 'quiero', 'busco');
    INSERT INTO @Terminos
    SELECT DISTINCT s.Sinonimo COLLATE Latin1_General_CI_AI FROM SinonimosBusqueda s
    WHERE EXISTS (SELECT 1 FROM @Terminos t WHERE t.Palabra = s.Termino COLLATE Latin1_General_CI_AI)
      AND NOT EXISTS (SELECT 1 FROM @Terminos t WHERE t.Palabra = s.Sinonimo COLLATE Latin1_General_CI_AI);
    SELECT TOP (20) p.IDProducto, p.Nombre, p.Descripcion, p.ImagenUrl, p.Activo, p.IDCategoria,
        c.Nombre AS Categoria, MIN(v.Precio) AS PrecioMinimo, MAX(v.Precio) AS PrecioMaximo,
        SUM(disp.ExistenciaDisponible) AS StockTotalDisponible, ofe.PrecioOferta, ofe.PrecioReferencia, ofe.PorcentajeDescuento
    FROM Productos p INNER JOIN Categorias c ON c.IDCategoria = p.IDCategoria AND c.Activo = 1
    INNER JOIN Variantes v ON v.IDProducto = p.IDProducto AND v.Activo = 1
    CROSS APPLY FU_Inventario_ExistenciaDisponible(v.IDVariante) disp
    CROSS APPLY (SELECT COUNT(*) AS Coincidencias FROM @Terminos t
        WHERE CHARINDEX(t.Palabra, p.Nombre COLLATE Latin1_General_CI_AI) > 0
           OR CHARINDEX(t.Palabra, p.Descripcion COLLATE Latin1_General_CI_AI) > 0) terminos
    OUTER APPLY (
        SELECT TOP (1) vo.Precio AS PrecioOferta, vo.PrecioReferencia,
            CAST(ROUND((vo.PrecioReferencia - vo.Precio) * 100.0 / vo.PrecioReferencia, 0) AS INT) AS PorcentajeDescuento
        FROM Variantes vo CROSS APPLY FU_Inventario_ExistenciaDisponible(vo.IDVariante) vd
        WHERE vo.IDProducto = p.IDProducto AND vo.Activo = 1 AND vd.ExistenciaDisponible > 0
          AND vo.PrecioReferencia > vo.Precio AND (vo.PrecioReferencia - vo.Precio) * 100.0 / vo.PrecioReferencia >= 1
          AND (@PrecioMin IS NULL OR vo.Precio >= @PrecioMin) AND (@PrecioMax IS NULL OR vo.Precio <= @PrecioMax)
        ORDER BY (vo.PrecioReferencia - vo.Precio) / vo.PrecioReferencia DESC, vo.IDVariante
    ) ofe
    WHERE p.Activo = 1 AND disp.ExistenciaDisponible > 0 AND terminos.Coincidencias > 0
      AND (@IDCategoria IS NULL OR p.IDCategoria = @IDCategoria)
      AND (@PrecioMin IS NULL OR v.Precio >= @PrecioMin) AND (@PrecioMax IS NULL OR v.Precio <= @PrecioMax)
      AND (@SoloOfertas = 0 OR ofe.PrecioReferencia IS NOT NULL)
      AND NOT (p.Nombre LIKE @Patron OR COALESCE(p.Descripcion, '') LIKE @Patron
          OR EXISTS (SELECT 1 FROM Variantes normal WHERE normal.IDProducto = p.IDProducto AND normal.Activo = 1 AND normal.SKU LIKE @Patron))
    GROUP BY p.IDProducto, p.Nombre, p.Descripcion, p.ImagenUrl, p.Activo, p.IDCategoria, c.Nombre,
        terminos.Coincidencias, ofe.PrecioOferta, ofe.PrecioReferencia, ofe.PorcentajeDescuento
    ORDER BY terminos.Coincidencias DESC, p.IDProducto;
END;
GO

-- inventario y kardex
CREATE OR ALTER PROCEDURE SP_Inventario_RegistrarMovimiento
    @IDVariante INT,
    @IDUsuario INT,
    @TipoMovimiento VARCHAR(30), -- 'ENTRADA_COMPRA', 'SALIDA_VENTA', 'AJUSTE_POSITIVO'
    @Cantidad INT,
    @Motivo NVARCHAR(300)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF @Motivo IS NULL OR LEN(TRIM(@Motivo)) < 5 THROW 50030, 'El movimiento exige un motivo válido.', 1;
        IF @Cantidad = 0 THROW 50031, 'La cantidad del movimiento no puede ser cero.', 1;

        DECLARE @IDTipoMov INT;
        SELECT @IDTipoMov = IDTipoMovimiento FROM TipoMovimiento WHERE Codigo = @TipoMovimiento;
        IF @IDTipoMov IS NULL THROW 50034, 'El tipo de movimiento especificado no es válido.', 1;

        DECLARE @ExistenciaActual INT, @NuevoSaldo INT;
        SELECT @ExistenciaActual = ExistenciaFisica FROM Variantes WITH (UPDLOCK, ROWLOCK) WHERE IDVariante = @IDVariante;
        IF @ExistenciaActual IS NULL THROW 50032, 'La variante indicada no existe.', 1;

        SET @NuevoSaldo = @ExistenciaActual + @Cantidad;
        IF @NuevoSaldo < 0 THROW 50033, 'Operación rechazada: El ajuste dejaría la existencia en negativo.', 1;

        UPDATE Variantes SET ExistenciaFisica = @NuevoSaldo WHERE IDVariante = @IDVariante;

        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo)
        VALUES (@IDVariante, @IDUsuario, @IDTipoMov, @Cantidad, @NuevoSaldo, @Motivo);

        INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
        VALUES (@IDUsuario, 'INVENTARIO', 'Variantes', @IDVariante, @TipoMovimiento,
                CONCAT('{"ExistenciaFisica":', @ExistenciaActual, '}'),
                CONCAT('{"ExistenciaFisica":', @NuevoSaldo, ',"Motivo":"', @Motivo, '"}'));

        COMMIT TRANSACTION;
        SELECT @NuevoSaldo AS ExistenciaFisicaActualizada;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Inventario_ListarKardex
    @IDVariante INT = NULL,
    @TipoMovimiento VARCHAR(30) = NULL,
    @FechaDesde DATETIME2 = NULL,
    @FechaHasta DATETIME2 = NULL,
    @Orden VARCHAR(20) = 'fecha',
    @Direccion VARCHAR(4) = 'desc',
    @Pagina INT = 1,
    @TamanoPagina INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    IF @Orden IS NULL OR @Orden NOT IN ('fecha', 'cantidad', 'tipo') SET @Orden = 'fecha';
    IF @Direccion IS NULL OR @Direccion NOT IN ('asc', 'desc') SET @Direccion = 'desc';
    DECLARE @Offset INT = (@Pagina - 1) * @TamanoPagina;

    SELECT 
        k.IDKardex, k.IDVariante, v.SKU, p.Nombre AS Producto,
        u.Correo AS UsuarioEjecutor, tm.Codigo AS TipoMovimiento, k.Cantidad,
        k.SaldoPosterior, k.Motivo, k.IDPedidoReferencia, k.FechaMovimiento,
        COUNT(1) OVER() AS TotalRegistros
    INTO #Resultados
    FROM Kardex k
    INNER JOIN Variantes v ON k.IDVariante = v.IDVariante
    INNER JOIN Productos p ON v.IDProducto = p.IDProducto
    INNER JOIN Usuarios u ON k.IDUsuario = u.IDUsuario
    INNER JOIN TipoMovimiento tm ON k.IDTipoMovimiento = tm.IDTipoMovimiento
    WHERE (@IDVariante IS NULL OR k.IDVariante = @IDVariante)
      AND (@TipoMovimiento IS NULL OR tm.Codigo = @TipoMovimiento)
      AND (@FechaDesde IS NULL OR k.FechaMovimiento >= @FechaDesde)
      AND (@FechaHasta IS NULL OR k.FechaMovimiento <= @FechaHasta);

    SELECT * FROM #Resultados
    ORDER BY
        CASE WHEN @Orden = 'fecha' AND @Direccion = 'asc' THEN FechaMovimiento END ASC,
        CASE WHEN @Orden = 'fecha' AND @Direccion = 'desc' THEN FechaMovimiento END DESC,
        CASE WHEN @Orden = 'cantidad' AND @Direccion = 'asc' THEN Cantidad END ASC,
        CASE WHEN @Orden = 'cantidad' AND @Direccion = 'desc' THEN Cantidad END DESC,
        CASE WHEN @Orden = 'tipo' AND @Direccion = 'asc' THEN TipoMovimiento END ASC,
        CASE WHEN @Orden = 'tipo' AND @Direccion = 'desc' THEN TipoMovimiento END DESC,
        IDKardex DESC
    OFFSET @Offset ROWS FETCH NEXT @TamanoPagina ROWS ONLY;
    SELECT COUNT(1) AS TotalRegistros FROM #Resultados;
END;
GO

CREATE OR ALTER PROCEDURE SP_Inventario_ListarExistenciasBajas
    @Busqueda NVARCHAR(150) = NULL,
    @Orden VARCHAR(20) = 'existencia',
    @Direccion VARCHAR(4) = 'asc',
    @Pagina INT = 1,
    @TamanoPagina INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    IF @Orden IS NULL OR @Orden NOT IN ('existencia', 'producto', 'sku') SET @Orden = 'existencia';
    IF @Direccion IS NULL OR @Direccion NOT IN ('asc', 'desc') SET @Direccion = 'asc';
    DECLARE @Patron NVARCHAR(500) = '%' + REPLACE(REPLACE(REPLACE(@Busqueda, '[', '[[]'), '%', '[%]'), '_', '[_]') + '%';
    DECLARE @Offset INT = (@Pagina - 1) * @TamanoPagina;

    SELECT *, COUNT(1) OVER() AS TotalRegistros
    INTO #Bajas
    FROM VW_Inventario_ExistenciasBajas
    WHERE @Busqueda IS NULL OR Producto LIKE @Patron OR SKU LIKE @Patron;

    SELECT * FROM #Bajas
    ORDER BY
        CASE WHEN @Orden = 'existencia' AND @Direccion = 'asc' THEN ExistenciaDisponible END ASC,
        CASE WHEN @Orden = 'existencia' AND @Direccion = 'desc' THEN ExistenciaDisponible END DESC,
        CASE WHEN @Orden = 'producto' AND @Direccion = 'asc' THEN Producto END ASC,
        CASE WHEN @Orden = 'producto' AND @Direccion = 'desc' THEN Producto END DESC,
        CASE WHEN @Orden = 'sku' AND @Direccion = 'asc' THEN SKU END ASC,
        CASE WHEN @Orden = 'sku' AND @Direccion = 'desc' THEN SKU END DESC,
        IDVariante DESC
    OFFSET @Offset ROWS FETCH NEXT @TamanoPagina ROWS ONLY;
    SELECT COUNT(1) AS TotalRegistros FROM #Bajas;
END;
GO

-- carrito y cupones
CREATE OR ALTER PROCEDURE SP_Carritos_ObtenerDetalle
    @IDUsuario INT = NULL,
    @TokenInvitado VARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @IDCarrito INT;
    IF @IDUsuario IS NOT NULL
        SELECT @IDCarrito = IDCarrito FROM Carritos WHERE IDUsuario = @IDUsuario;
    ELSE
        SELECT @IDCarrito = IDCarrito FROM Carritos WHERE TokenInvitado = @TokenInvitado AND IDUsuario IS NULL;

    SELECT 
        ci.IDCarritoItem, ci.IDVariante, p.IDProducto, p.Nombre AS Producto, p.ImagenUrl,
        v.SKU, v.Talla, v.Color, v.Precio AS PrecioUnitario, ci.Cantidad,
        CAST((ci.Cantidad * v.Precio) AS DECIMAL(12,2)) AS SubtotalLinea,
        -- Disponible para este carrito
        CAST(v.ExistenciaFisica - ISNULL(otros.Reservado, 0) AS INT) AS ExistenciaDisponible
    FROM CarritoItems ci
    INNER JOIN Variantes v ON ci.IDVariante = v.IDVariante
    INNER JOIN Productos p ON v.IDProducto = p.IDProducto
    OUTER APPLY (
        SELECT SUM(r.Cantidad) AS Reservado
        FROM ReservasInventario r
        INNER JOIN EstadosReserva er ON er.IDEstadoReserva = r.IDEstadoReserva
        WHERE r.IDVariante = v.IDVariante AND er.Codigo = 'ACTIVA'
          AND r.FechaExpiracion > SYSDATETIME() AND r.IDCarrito <> @IDCarrito
    ) otros
    WHERE ci.IDCarrito = @IDCarrito;

    SELECT 
        c.IDCarrito, cup.Codigo AS CodigoCuponAplicado,
        calc.SubtotalCarrito AS Subtotal, calc.DescuentoCalculado AS Descuento,
        CAST((calc.SubtotalCarrito - calc.DescuentoCalculado) AS DECIMAL(12,2)) AS Total
    FROM Carritos c
    LEFT JOIN Cupones cup ON c.IDCupon = cup.IDCupon
    OUTER APPLY dbo.FU_Cupones_CalculoDescuento(c.IDCarrito, ISNULL(@IDUsuario, 0)) calc
    WHERE c.IDCarrito = @IDCarrito;
END;
GO

CREATE OR ALTER PROCEDURE SP_Carritos_GestionarItem
    @IDUsuario INT = NULL,
    @TokenInvitado VARCHAR(100) = NULL,
    @IDVariante INT,
    @Cantidad INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @IDCarrito INT;
        IF @IDUsuario IS NOT NULL
            SELECT @IDCarrito = IDCarrito FROM Carritos WITH (UPDLOCK, HOLDLOCK) WHERE IDUsuario = @IDUsuario;
        ELSE
            SELECT @IDCarrito = IDCarrito FROM Carritos WITH (UPDLOCK, HOLDLOCK) WHERE TokenInvitado = @TokenInvitado AND IDUsuario IS NULL;

        IF @IDCarrito IS NULL
        BEGIN
            INSERT INTO Carritos (IDUsuario, TokenInvitado) VALUES (@IDUsuario, @TokenInvitado);
            SET @IDCarrito = CAST(SCOPE_IDENTITY() AS INT);
        END

        IF @Cantidad <= 0
        BEGIN
            DELETE FROM CarritoItems WHERE IDCarrito = @IDCarrito AND IDVariante = @IDVariante;
        END
        ELSE
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM Variantes v WITH (UPDLOCK, HOLDLOCK)
                INNER JOIN Productos p WITH (HOLDLOCK) ON v.IDProducto = p.IDProducto
                INNER JOIN Categorias c WITH (HOLDLOCK) ON p.IDCategoria = c.IDCategoria
                WHERE v.IDVariante = @IDVariante AND v.Activo = 1 AND p.Activo = 1 AND c.Activo = 1)
                THROW 50041, 'El producto o su variante ya no está disponible en el catálogo.', 1;
            -- Tope para este carrito: existencia física menos lo apartado por otros carritos.
            -- Sin esto, quien ya reservó no podría conservar la cantidad que apartó.
            DECLARE @Disponible INT;
            SELECT @Disponible = v.ExistenciaFisica - ISNULL((
                SELECT SUM(r.Cantidad)
                FROM ReservasInventario r
                INNER JOIN EstadosReserva er ON er.IDEstadoReserva = r.IDEstadoReserva
                WHERE r.IDVariante = v.IDVariante AND er.Codigo = 'ACTIVA'
                  AND r.FechaExpiracion > SYSDATETIME() AND r.IDCarrito <> @IDCarrito), 0)
            FROM Variantes v WHERE v.IDVariante = @IDVariante;
            IF @Disponible IS NULL OR @Cantidad > @Disponible
                THROW 50040, 'No hay suficiente existencia disponible para agregar la cantidad solicitada.', 1;

            IF EXISTS (SELECT 1 FROM CarritoItems WITH (UPDLOCK, ROWLOCK) WHERE IDCarrito = @IDCarrito AND IDVariante = @IDVariante)
                UPDATE CarritoItems SET Cantidad = @Cantidad WHERE IDCarrito = @IDCarrito AND IDVariante = @IDVariante;
            ELSE
                INSERT INTO CarritoItems (IDCarrito, IDVariante, Cantidad) VALUES (@IDCarrito, @IDVariante, @Cantidad);
        END

        UPDATE Carritos SET UltimaActividad = SYSDATETIME() WHERE IDCarrito = @IDCarrito;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Carritos_FusionarCarrito
    @TokenInvitado VARCHAR(100),
    @IDUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @IDCarritoInvitado INT, @IDCarritoUsuario INT;
        SELECT @IDCarritoInvitado = IDCarrito FROM Carritos WITH (UPDLOCK, HOLDLOCK) WHERE TokenInvitado = @TokenInvitado AND IDUsuario IS NULL;
        IF @IDCarritoInvitado IS NULL BEGIN COMMIT TRANSACTION; RETURN; END

        SELECT @IDCarritoUsuario = IDCarrito FROM Carritos WITH (UPDLOCK, HOLDLOCK) WHERE IDUsuario = @IDUsuario;
        IF @IDCarritoUsuario IS NULL
        BEGIN
            UPDATE Carritos SET IDUsuario = @IDUsuario, TokenInvitado = NULL, UltimaActividad = SYSDATETIME() WHERE IDCarrito = @IDCarritoInvitado;
        END
        ELSE
        BEGIN
            MERGE CarritoItems AS Target
            USING (
                SELECT ci.IDVariante, ci.Cantidad, disp.ExistenciaDisponible
                FROM CarritoItems ci CROSS APPLY dbo.FU_Inventario_ExistenciaDisponible(ci.IDVariante) disp
                WHERE ci.IDCarrito = @IDCarritoInvitado AND disp.ExistenciaDisponible > 0
            ) AS Source
            ON (Target.IDCarrito = @IDCarritoUsuario AND Target.IDVariante = Source.IDVariante)
            WHEN MATCHED THEN
                UPDATE SET Target.Cantidad = CASE WHEN (Target.Cantidad + Source.Cantidad) > Source.ExistenciaDisponible THEN Source.ExistenciaDisponible ELSE (Target.Cantidad + Source.Cantidad) END
            WHEN NOT MATCHED THEN
                INSERT (IDCarrito, IDVariante, Cantidad) VALUES (@IDCarritoUsuario, Source.IDVariante, CASE WHEN Source.Cantidad > Source.ExistenciaDisponible THEN Source.ExistenciaDisponible ELSE Source.Cantidad END);

            DELETE FROM Carritos WHERE IDCarrito = @IDCarritoInvitado;
            UPDATE Carritos SET UltimaActividad = SYSDATETIME() WHERE IDCarrito = @IDCarritoUsuario;
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Cupones_AplicarAlCarrito
    @IDUsuario INT,
    @CodigoCupon VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @IDCarrito INT;
        SELECT @IDCarrito = IDCarrito FROM Carritos WITH (UPDLOCK) WHERE IDUsuario = @IDUsuario;
        IF @IDCarrito IS NULL THROW 50045, 'No tienes un carrito activo.', 1;

        DECLARE @IDCupon INT, @Minimo DECIMAL(12,2), @LimiteTotal INT, @LimiteCliente INT, @UsosActuales INT,
                @IDCatCupon INT, @Activo BIT, @Inicio DATETIME2, @Fin DATETIME2;

        SELECT @IDCupon = IDCupon, @Minimo = MontoMinimoCompra, @LimiteTotal = LimiteTotalUsos,
               @LimiteCliente = LimiteUsosPorCliente, @UsosActuales = UsosActuales,
               @IDCatCupon = IDCategoriaAplica, @Activo = Activo, @Inicio = FechaInicio, @Fin = FechaFin
        FROM Cupones WITH (UPDLOCK) WHERE Codigo = @CodigoCupon;

        IF @IDCupon IS NULL THROW 50055, 'El código de cupón ingresado no existe.', 1;
        IF @Activo = 0 THROW 50100, 'El cupón se encuentra inactivo.', 1;
        IF SYSDATETIME() > @Fin THROW 50056, 'El cupón se encuentra vencido.', 1;
        IF SYSDATETIME() < @Inicio THROW 50099, 'El cupón todavía no está vigente.', 1;
        IF @UsosActuales >= @LimiteTotal THROW 50057, 'El cupón se ha agotado .', 1;

        DECLARE @Subtotal DECIMAL(12,2);
        SELECT @Subtotal = ISNULL(SUM(ci.Cantidad * v.Precio), 0)
        FROM CarritoItems ci INNER JOIN Variantes v ON ci.IDVariante = v.IDVariante WHERE ci.IDCarrito = @IDCarrito;

        IF @Subtotal < @Minimo
        BEGIN
            DECLARE @ErrorMinimo NVARCHAR(2048) = (
                SELECT @Minimo AS montoMinimo, @Subtotal AS subtotal, @Minimo - @Subtotal AS montoFaltante
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            );
            THROW 50058, @ErrorMinimo, 1;
        END;

        IF @IDCatCupon IS NOT NULL AND NOT EXISTS (
            SELECT 1
            FROM CarritoItems ci
            INNER JOIN Variantes v ON ci.IDVariante = v.IDVariante
            INNER JOIN Productos p ON v.IDProducto = p.IDProducto
            WHERE ci.IDCarrito = @IDCarrito AND p.IDCategoria = @IDCatCupon
        )
            THROW 50069, 'El cupón no aplica a estos productos.', 1;

        IF (
            SELECT COUNT(1) 
            FROM Pedidos p 
            INNER JOIN EstadosPedido ep ON p.IDEstadoPedido = ep.IDEstadoPedido
            WHERE p.IDCupon = @IDCupon AND p.IDUsuario = @IDUsuario AND ep.Codigo <> 'CANCELADO'
        ) >= @LimiteCliente
            THROW 50059, 'Ya has alcanzado el límite de usos permitidos de este cupón para tu cuenta.', 1;

        UPDATE Carritos SET IDCupon = @IDCupon, UltimaActividad = SYSDATETIME() WHERE IDCarrito = @IDCarrito;
        COMMIT TRANSACTION;

        SELECT @IDCupon AS IDCupon, 'Cupón aplicado correctamente.' AS Mensaje;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Cupones_RemoverDelCarrito
    @IDUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @IDCarrito INT;
        SELECT @IDCarrito = IDCarrito FROM Carritos WITH (UPDLOCK) WHERE IDUsuario = @IDUsuario;
        IF @IDCarrito IS NULL THROW 50045, 'No tienes un carrito activo.', 1;

        UPDATE Carritos 
        SET IDCupon = NULL, UltimaActividad = SYSDATETIME() 
        WHERE IDCarrito = @IDCarrito;

        COMMIT TRANSACTION;
        SELECT 'Cupón removido del carrito exitosamente.' AS Mensaje;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO


CREATE OR ALTER PROCEDURE SP_Cupones_CrearActualizar
    @IDCupon INT = NULL,
    @Codigo VARCHAR(50),
    @TipoDescuento VARCHAR(20), -- 'PORCENTAJE' o 'MONTO_FIJO'
    @Valor DECIMAL(12,2),
    @MontoMinimoCompra DECIMAL(12,2),
    @LimiteTotalUsos INT,
    @LimiteUsosPorCliente INT,
    @IDCategoriaAplica INT = NULL,
    @FechaInicio DATETIME2,
    @FechaFin DATETIME2,
    @Activo BIT = 1,
    @IDUsuarioAdmin INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @IDTipoDescuento INT;
        SELECT @IDTipoDescuento = IDTipoDescuento FROM TipoDescuento WHERE Codigo = @TipoDescuento;
        IF @IDTipoDescuento IS NULL THROW 50060, 'El tipo de descuento indicado no es válido.', 1;

        IF @IDCupon IS NULL
        BEGIN
            INSERT INTO Cupones (Codigo, IDTipoDescuento, Valor, MontoMinimoCompra, LimiteTotalUsos, LimiteUsosPorCliente, IDCategoriaAplica, FechaInicio, FechaFin, Activo)
            VALUES (@Codigo, @IDTipoDescuento, @Valor, @MontoMinimoCompra, @LimiteTotalUsos, @LimiteUsosPorCliente, @IDCategoriaAplica, @FechaInicio, @FechaFin, @Activo);
            SET @IDCupon = CAST(SCOPE_IDENTITY() AS INT);
            INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
            VALUES (@IDUsuarioAdmin, 'CUPONES', 'Cupones', @IDCupon, 'CREACION', NULL, CONCAT('{"Codigo":"', @Codigo, '","Valor":', @Valor, '}'));
        END
        ELSE
        BEGIN
            UPDATE Cupones 
            SET Codigo = @Codigo, IDTipoDescuento = @IDTipoDescuento, Valor = @Valor, MontoMinimoCompra = @MontoMinimoCompra,
                LimiteTotalUsos = @LimiteTotalUsos, LimiteUsosPorCliente = @LimiteUsosPorCliente,
                IDCategoriaAplica = @IDCategoriaAplica, FechaInicio = @FechaInicio, FechaFin = @FechaFin, Activo = @Activo
            WHERE IDCupon = @IDCupon;
            INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
            VALUES (@IDUsuarioAdmin, 'CUPONES', 'Cupones', @IDCupon, 'MODIFICACION', NULL, CONCAT('{"Codigo":"', @Codigo, '","Activo":', @Activo, '}'));
        END

        COMMIT TRANSACTION;
        SELECT @IDCupon AS IDCupon;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Cupones_Listar
    @Orden VARCHAR(20) = 'fecha',
    @Direccion VARCHAR(4) = 'desc',
    @Busqueda NVARCHAR(50) = NULL,
    @Activo BIT = NULL,
    @Vigencia VARCHAR(12) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @Orden IS NULL OR @Orden NOT IN ('fecha', 'codigo', 'vigencia', 'usos') SET @Orden = 'fecha';
    IF @Direccion IS NULL OR @Direccion NOT IN ('asc', 'desc') SET @Direccion = 'desc';
    IF @Vigencia IS NOT NULL AND @Vigencia NOT IN ('VIGENTE', 'VENCIDO', 'POR_INICIAR') SET @Vigencia = NULL;
    DECLARE @Patron NVARCHAR(200) = '%' + REPLACE(REPLACE(REPLACE(@Busqueda, '[', '[[]'), '%', '[%]'), '_', '[_]') + '%';
    DECLARE @Ahora DATETIME2 = SYSDATETIME();

    SELECT 
        c.IDCupon, 
        c.Codigo, 
        td.Codigo AS TipoDescuento, 
        c.Valor, 
        c.MontoMinimoCompra, 
        c.LimiteTotalUsos, 
        c.LimiteUsosPorCliente, 
        c.UsosActuales, 
        c.IDCategoriaAplica, 
        c.FechaInicio, 
        c.FechaFin, 
        c.Activo
    FROM Cupones c
    INNER JOIN TipoDescuento td ON c.IDTipoDescuento = td.IDTipoDescuento
    WHERE (@Busqueda IS NULL OR @Busqueda = '' OR c.Codigo LIKE @Patron)
      AND (@Activo IS NULL OR c.Activo = @Activo)
      AND (@Vigencia IS NULL
           OR (@Vigencia = 'VIGENTE' AND c.FechaInicio <= @Ahora AND c.FechaFin >= @Ahora)
           OR (@Vigencia = 'VENCIDO' AND c.FechaFin < @Ahora)
           OR (@Vigencia = 'POR_INICIAR' AND c.FechaInicio > @Ahora))
    ORDER BY
        CASE WHEN @Orden = 'fecha' AND @Direccion = 'asc' THEN c.IDCupon END ASC,
        CASE WHEN @Orden = 'fecha' AND @Direccion = 'desc' THEN c.IDCupon END DESC,
        CASE WHEN @Orden = 'codigo' AND @Direccion = 'asc' THEN c.Codigo END ASC,
        CASE WHEN @Orden = 'codigo' AND @Direccion = 'desc' THEN c.Codigo END DESC,
        CASE WHEN @Orden = 'vigencia' AND @Direccion = 'asc' THEN c.FechaFin END ASC,
        CASE WHEN @Orden = 'vigencia' AND @Direccion = 'desc' THEN c.FechaFin END DESC,
        CASE WHEN @Orden = 'usos' AND @Direccion = 'asc' THEN c.UsosActuales END ASC,
        CASE WHEN @Orden = 'usos' AND @Direccion = 'desc' THEN c.UsosActuales END DESC,
        c.IDCupon DESC;
END;
GO

-- checkout, reservas, pedidos y devoluciones
CREATE OR ALTER PROCEDURE SP_Direcciones_CrearListar
    @IDUsuario INT = NULL,
    @Accion VARCHAR(10),
    @Etiqueta NVARCHAR(50) = NULL,
    @IDMunicipio INT = NULL,
    @IDDepartamento INT = NULL,
    @IDTarifaEnvio INT = NULL,
    @Municipio NVARCHAR(100) = NULL,
    @DireccionExacta NVARCHAR(300) = NULL,
    @TelefonoContacto VARCHAR(20) = NULL,
    @IDDireccion INT = NULL,
    @Predeterminada BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Accion = 'CATALOGO' OR @Accion = 'MUNICIPIOS'
    BEGIN
        SELECT 
            m.IDMunicipio,
            m.Nombre AS Municipio,
            dep.IDDepartamento,
            dep.Nombre AS Departamento,
            t.IDTarifaEnvio,
            t.CostoEnvio,
            t.MontoMinimoGratis AS MontoMinimoEnvioGratis
        FROM Municipios m
        INNER JOIN Departamentos dep ON m.IDDepartamento = dep.IDDepartamento
        LEFT JOIN TarifasEnvio t ON dep.IDDepartamento = t.IDDepartamento
        WHERE m.Activo = 1 AND dep.Activo = 1
        ORDER BY dep.Nombre, m.Nombre;
        RETURN;
    END

    IF @Accion = 'CREAR'
    BEGIN
        BEGIN TRY
            BEGIN TRANSACTION;

            IF @IDMunicipio IS NULL AND @Municipio IS NOT NULL
            BEGIN
                IF @IDDepartamento IS NOT NULL
                BEGIN
                    SELECT TOP 1 @IDMunicipio = IDMunicipio 
                    FROM Municipios 
                    WHERE IDDepartamento = @IDDepartamento AND Nombre = @Municipio;
                END
                ELSE IF @IDTarifaEnvio IS NOT NULL
                BEGIN
                    SELECT TOP 1 @IDMunicipio = m.IDMunicipio 
                    FROM Municipios m
                    INNER JOIN TarifasEnvio t ON m.IDDepartamento = t.IDDepartamento
                    WHERE t.IDTarifaEnvio = @IDTarifaEnvio AND m.Nombre = @Municipio;
                END
                ELSE
                BEGIN
                    SELECT TOP 1 @IDMunicipio = IDMunicipio 
                    FROM Municipios 
                    WHERE Nombre = @Municipio;
                END
            END
            ELSE IF @IDMunicipio IS NULL AND @IDTarifaEnvio IS NOT NULL
            BEGIN
                SELECT TOP 1 @IDMunicipio = m.IDMunicipio
                FROM Municipios m
                INNER JOIN TarifasEnvio t ON m.IDDepartamento = t.IDDepartamento
                WHERE t.IDTarifaEnvio = @IDTarifaEnvio;
            END

            IF @IDMunicipio IS NULL
                THROW 50060, 'No se pudo determinar el municipio para la dirección.', 1;

            DECLARE @TieneActivas BIT = 0;
            IF EXISTS (SELECT 1 FROM Direcciones WITH (UPDLOCK, HOLDLOCK) WHERE IDUsuario = @IDUsuario AND Activo = 1)
                SET @TieneActivas = 1;

         
            IF @TieneActivas = 0 SET @Predeterminada = 1;
            ELSE IF @Predeterminada = 1
                UPDATE Direcciones SET Predeterminada = 0 WHERE IDUsuario = @IDUsuario AND Predeterminada = 1;

            INSERT INTO Direcciones (IDUsuario, IDMunicipio, Etiqueta, Direccion, Telefono, Predeterminada)
            VALUES (@IDUsuario, @IDMunicipio, @Etiqueta, @DireccionExacta, @TelefonoContacto, ISNULL(@Predeterminada, 0));

            COMMIT TRANSACTION;
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            THROW;
        END CATCH
    END

    IF @Accion = 'ELIMINAR'
    BEGIN
        BEGIN TRY
            BEGIN TRANSACTION;

            DECLARE @PropietarioDireccion INT, @DireccionActiva BIT;
            SELECT @PropietarioDireccion = IDUsuario, @DireccionActiva = Activo
            FROM Direcciones WITH (UPDLOCK, HOLDLOCK) WHERE IDDireccion = @IDDireccion;
            IF @PropietarioDireccion IS NULL THROW 50075, 'La dirección no existe.', 1;
            IF @PropietarioDireccion <> @IDUsuario THROW 50076, 'No tienes permiso para usar esta dirección.', 1;
            IF @DireccionActiva = 0 THROW 50075, 'La dirección no existe o ya fue eliminada.', 1;
            DECLARE @EraPredeterminada BIT;
            SELECT @EraPredeterminada = Predeterminada FROM Direcciones WHERE IDDireccion = @IDDireccion;
            UPDATE Direcciones SET Activo = 0, Predeterminada = 0 WHERE IDDireccion = @IDDireccion;

            IF @EraPredeterminada = 1
            BEGIN
                UPDATE Direcciones SET Predeterminada = 1
                WHERE IDDireccion = (SELECT MIN(IDDireccion) FROM Direcciones WHERE IDUsuario = @IDUsuario AND Activo = 1);
            END

            COMMIT TRANSACTION;
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            THROW;
        END CATCH
    END

    SELECT 
        d.IDDireccion, 
        d.IDMunicipio,
        d.Etiqueta, 
        dep.IDDepartamento, 
        dep.Nombre AS Departamento, 
        t.CostoEnvio, 
        t.MontoMinimoGratis AS MontoMinimoEnvioGratis,
        m.Nombre AS Municipio, 
        d.Direccion AS DireccionExacta, 
        d.Telefono AS TelefonoContacto,
        d.Predeterminada
    FROM Direcciones d 
    INNER JOIN Municipios m ON d.IDMunicipio = m.IDMunicipio
    INNER JOIN Departamentos dep ON m.IDDepartamento = dep.IDDepartamento
    LEFT JOIN TarifasEnvio t ON dep.IDDepartamento = t.IDDepartamento
    WHERE d.IDUsuario = @IDUsuario AND d.Activo = 1
    ORDER BY d.Predeterminada DESC, d.IDDireccion ASC;
END;
GO

CREATE OR ALTER PROCEDURE SP_Direcciones_MarcarPredeterminada
    @IDUsuario INT,
    @IDDireccion INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @Propietario INT, @EstaActiva BIT;
        SELECT @Propietario = IDUsuario, @EstaActiva = Activo
        FROM Direcciones WITH (UPDLOCK, HOLDLOCK) WHERE IDDireccion = @IDDireccion;
        IF @Propietario IS NULL THROW 50075, 'La dirección no existe.', 1;
      
        IF @Propietario <> @IDUsuario THROW 50075, 'La dirección no existe.', 1;
        IF @EstaActiva = 0 THROW 50075, 'La dirección no existe o ya fue eliminada.', 1;

        UPDATE Direcciones SET Predeterminada = 0
        WHERE IDUsuario = @IDUsuario AND Predeterminada = 1 AND IDDireccion <> @IDDireccion;
        UPDATE Direcciones SET Predeterminada = 1 WHERE IDDireccion = @IDDireccion;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Inventario_ReservarExistencia
    @IDUsuario INT,
    @IDCarrito INT,
    @DuracionMinutos INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (SELECT 1 FROM Carritos WITH (UPDLOCK) WHERE IDCarrito = @IDCarrito AND IDUsuario = @IDUsuario)
            THROW 50050, 'Acceso denegado al carrito.', 1;

        -- Bloquea las variantes 
        DECLARE @ExistenciaBloqueada INT;
        SELECT @ExistenciaBloqueada = v.ExistenciaFisica
        FROM Variantes v WITH (UPDLOCK, HOLDLOCK)
        WHERE v.IDVariante IN (SELECT IDVariante FROM CarritoItems WHERE IDCarrito = @IDCarrito)
        ORDER BY v.IDVariante;

        DECLARE @IDEstadoActiva INT, @IDEstadoLiberada INT;
        SELECT @IDEstadoActiva = IDEstadoReserva FROM EstadosReserva WHERE Codigo = 'ACTIVA';
        SELECT @IDEstadoLiberada = IDEstadoReserva FROM EstadosReserva WHERE Codigo = 'LIBERADA';

        UPDATE ReservasInventario 
        SET IDEstadoReserva = @IDEstadoLiberada 
        WHERE IDCarrito = @IDCarrito AND IDEstadoReserva = @IDEstadoActiva;

        IF EXISTS (
            SELECT 1 FROM CarritoItems ci
            INNER JOIN Variantes v WITH (UPDLOCK, ROWLOCK) ON ci.IDVariante = v.IDVariante
            CROSS APPLY dbo.FU_Inventario_ExistenciaDisponible(v.IDVariante) disp
            WHERE ci.IDCarrito = @IDCarrito AND ci.Cantidad > disp.ExistenciaDisponible
        )
        BEGIN
            THROW 50051, 'Uno o más artículos de tu carrito agotaron su existencia disponible.', 1;
        END

        DECLARE @MinutosReserva INT = @DuracionMinutos;
        IF @MinutosReserva IS NULL
            SELECT @MinutosReserva = TRY_CAST(Valor AS INT) FROM ConfiguracionSistema WHERE Clave = 'DURACION_RESERVA_MINUTOS';
        IF @MinutosReserva IS NULL OR @MinutosReserva NOT BETWEEN 1 AND 1440 SET @MinutosReserva = 15;
        DECLARE @Expiracion DATETIME2 = DATEADD(MINUTE, @MinutosReserva, SYSDATETIME());

        INSERT INTO ReservasInventario (IDCarrito, IDVariante, IDEstadoReserva, Cantidad, FechaExpiracion)
        SELECT @IDCarrito, IDVariante, @IDEstadoActiva, Cantidad, @Expiracion 
        FROM CarritoItems 
        WHERE IDCarrito = @IDCarrito;

        COMMIT TRANSACTION;
        SELECT @Expiracion AS FechaExpiracionReserva, SYSDATETIME() AS FechaServidor,
               @MinutosReserva * 60 AS DuracionReservaSegundos;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Inventario_LimpiarReservasVencidas
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @IDEstadoActiva INT, @IDEstadoExpirada INT;
        SELECT @IDEstadoActiva = IDEstadoReserva FROM EstadosReserva WHERE Codigo = 'ACTIVA';
        SELECT @IDEstadoExpirada = IDEstadoReserva FROM EstadosReserva WHERE Codigo = 'EXPIRADA';

        UPDATE ReservasInventario 
        SET IDEstadoReserva = @IDEstadoExpirada 
        WHERE IDEstadoReserva = @IDEstadoActiva AND FechaExpiracion <= SYSDATETIME();

        DECLARE @Liberadas INT = @@ROWCOUNT;

        COMMIT TRANSACTION;
        SELECT @Liberadas AS ReservasLiberadas;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Pedidos_CrearPedido
    @IDUsuario INT,
    @IDCarrito INT,
    @IDDireccion INT,
    @ClaveIdempotencia VARCHAR(100),
    @SimularFalloPago BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @IDPedidoExistente INT;
        SELECT @IDPedidoExistente = IDPedido FROM Pedidos WITH (UPDLOCK, HOLDLOCK) WHERE ClaveIdempotencia = @ClaveIdempotencia AND IDUsuario = @IDUsuario;
        IF @IDPedidoExistente IS NOT NULL
        BEGIN
            COMMIT TRANSACTION;
            SELECT @IDPedidoExistente AS IDPedido, 1 AS FueIdempotente, 'Pedido procesado previamente .' AS Mensaje;
            RETURN;
        END

        IF EXISTS (SELECT 1 FROM Pedidos WHERE ClaveIdempotencia = @ClaveIdempotencia AND IDUsuario <> @IDUsuario)
            THROW 50113, 'Esa clave de idempotencia ya está en uso.', 1;

        IF EXISTS (
            SELECT 1 FROM ReservasInventario r
            INNER JOIN EstadosReserva e ON r.IDEstadoReserva = e.IDEstadoReserva
            WHERE r.IDReserva = (SELECT MAX(r2.IDReserva) FROM ReservasInventario r2 WHERE r2.IDCarrito = @IDCarrito)
              AND (e.Codigo = 'EXPIRADA' OR (e.Codigo = 'ACTIVA' AND r.FechaExpiracion <= SYSDATETIME())))
            THROW 50112, 'Tu reserva venció. Vuelve a reservar para pagar.', 1;

        IF @SimularFalloPago = 1
            THROW 50060, 'Pago rechazado por el emisor. Puedes reintentar mientras tu reserva siga vigente.', 1;

        DECLARE @IDCupon INT;
        SELECT @IDCupon = IDCupon FROM Carritos WHERE IDCarrito = @IDCarrito AND IDUsuario = @IDUsuario;
        IF @@ROWCOUNT = 0 THROW 50061, 'Acceso no autorizado al carrito.', 1;

        DECLARE @PropietarioDireccion INT, @DireccionActiva BIT;
        SELECT @PropietarioDireccion = IDUsuario, @DireccionActiva = Activo
        FROM Direcciones WITH (HOLDLOCK) WHERE IDDireccion = @IDDireccion;
        IF @PropietarioDireccion IS NULL THROW 50075, 'La dirección no existe.', 1;
        IF @PropietarioDireccion <> @IDUsuario THROW 50076, 'No tienes permiso para usar esta dirección.', 1;
        IF @DireccionActiva = 0 THROW 50075, 'La dirección no existe o ya fue eliminada.', 1;

        DECLARE @CostoEnvioBase DECIMAL(12,2);
        SELECT @CostoEnvioBase = CostoEnvioBase FROM dbo.FU_Pedidos_CalcularTotal(@IDUsuario, @IDCarrito, @IDDireccion);

        IF @CostoEnvioBase IS NULL THROW 50062, 'Dirección inválida o no pertenece al cliente.', 1;

        IF EXISTS (SELECT 1 FROM CarritoItems ci
            INNER JOIN Variantes v WITH (UPDLOCK, HOLDLOCK) ON ci.IDVariante = v.IDVariante
            INNER JOIN Productos p WITH (HOLDLOCK) ON v.IDProducto = p.IDProducto
            INNER JOIN Categorias c WITH (HOLDLOCK) ON p.IDCategoria = c.IDCategoria
            WHERE ci.IDCarrito = @IDCarrito AND (v.Activo = 0 OR p.Activo = 0 OR c.Activo = 0))
            THROW 50041, 'El producto o su variante ya no está disponible en el catálogo.', 1;

        DECLARE @IDEstadoReservaActiva INT;
        SELECT @IDEstadoReservaActiva = IDEstadoReserva FROM EstadosReserva WHERE Codigo = 'ACTIVA';

        IF EXISTS (
            SELECT 1 FROM CarritoItems ci
            INNER JOIN Variantes v WITH (UPDLOCK, ROWLOCK) ON ci.IDVariante = v.IDVariante
            OUTER APPLY (
                SELECT ISNULL(SUM(r.Cantidad), 0) AS ReservadoPorOtros FROM ReservasInventario r WITH (UPDLOCK)
                WHERE r.IDVariante = v.IDVariante AND r.IDEstadoReserva = @IDEstadoReservaActiva AND r.FechaExpiracion > SYSDATETIME() AND r.IDCarrito <> @IDCarrito
            ) res
            WHERE ci.IDCarrito = @IDCarrito AND ((v.ExistenciaFisica - res.ReservadoPorOtros) < ci.Cantidad)
        )
        BEGIN
            THROW 50063, 'Otro cliente acaba de comprar la última unidad disponible.', 1;
        END

        DECLARE @Subtotal DECIMAL(12,2), @CostoEnvioFinal DECIMAL(12,2), @Total DECIMAL(12,2), @Descuento DECIMAL(12,2) = 0;
        SELECT @Subtotal = Subtotal, @Descuento = Descuento, @CostoEnvioFinal = CostoEnvio, @Total = Total
        FROM dbo.FU_Pedidos_CalcularTotal(@IDUsuario, @IDCarrito, @IDDireccion);
        IF @Subtotal IS NULL OR @Subtotal <= 0 THROW 50064, 'El carrito está vacío.', 1;

        DECLARE @IDCatCupon INT = NULL;
        IF @IDCupon IS NOT NULL
        BEGIN
            DECLARE @TipoDescuento VARCHAR(20), @Valor DECIMAL(12,2), @Minimo DECIMAL(12,2),
                    @LimiteTotal INT, @LimiteCliente INT, @UsosActuales INT, @Activo BIT, @Inicio DATETIME2, @Fin DATETIME2;
            
            SELECT 
                @TipoDescuento = td.Codigo, 
                @Valor = c.Valor, 
                @Minimo = c.MontoMinimoCompra,
                @LimiteTotal = c.LimiteTotalUsos, 
                @LimiteCliente = c.LimiteUsosPorCliente,
                @UsosActuales = c.UsosActuales, 
                @IDCatCupon = c.IDCategoriaAplica,
                @Activo = c.Activo, 
                @Inicio = c.FechaInicio, 
                @Fin = c.FechaFin
            FROM Cupones c WITH (UPDLOCK, ROWLOCK)
            INNER JOIN TipoDescuento td ON c.IDTipoDescuento = td.IDTipoDescuento
            WHERE c.IDCupon = @IDCupon;

            IF @Activo = 0 THROW 50100, 'El cupón se encuentra inactivo.', 1;
            IF SYSDATETIME() > @Fin THROW 50056, 'El cupón se encuentra vencido.', 1;
            IF SYSDATETIME() < @Inicio THROW 50099, 'El cupón todavía no está vigente.', 1;
            IF @UsosActuales >= @LimiteTotal THROW 50066, 'El cupón agotó su límite total de usos.', 1;
            IF @Subtotal < @Minimo
            BEGIN
                DECLARE @ErrorMinimo NVARCHAR(2048) = (
                    SELECT @Minimo AS montoMinimo, @Subtotal AS subtotal, @Minimo - @Subtotal AS montoFaltante
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
                );
                THROW 50067, @ErrorMinimo, 1;
            END;

            IF (
                SELECT COUNT(1) 
                FROM Pedidos p 
                INNER JOIN EstadosPedido ep ON p.IDEstadoPedido = ep.IDEstadoPedido
                WHERE p.IDCupon = @IDCupon AND p.IDUsuario = @IDUsuario AND ep.Codigo <> 'CANCELADO'
            ) >= @LimiteCliente
            OR (
                SELECT ISNULL(TotalUsos, 0)
                FROM CuponesUsosPorCliente
                WHERE IDCupon = @IDCupon AND IDUsuario = @IDUsuario
            ) >= @LimiteCliente
                THROW 50068, 'Ya utilizaste este cupón el máximo permitido.', 1;

            DECLARE @BaseDescuento DECIMAL(12,2) = @Subtotal;
            IF @IDCatCupon IS NOT NULL
            BEGIN
                SELECT @BaseDescuento = ISNULL(SUM(ci.Cantidad * v.Precio), 0)
                FROM CarritoItems ci INNER JOIN Variantes v ON ci.IDVariante = v.IDVariante INNER JOIN Productos p ON v.IDProducto = p.IDProducto
                WHERE ci.IDCarrito = @IDCarrito AND p.IDCategoria = @IDCatCupon;
                IF @BaseDescuento <= 0 THROW 50069, 'El cupón no aplica a estos productos.', 1;
            END

            UPDATE Cupones SET UsosActuales = UsosActuales + 1 WHERE IDCupon = @IDCupon;

            IF EXISTS (SELECT 1 FROM CuponesUsosPorCliente WHERE IDCupon = @IDCupon AND IDUsuario = @IDUsuario)
            BEGIN
                UPDATE CuponesUsosPorCliente 
                SET TotalUsos = TotalUsos + 1 
                WHERE IDCupon = @IDCupon AND IDUsuario = @IDUsuario;
            END
            ELSE
            BEGIN
                INSERT INTO CuponesUsosPorCliente (IDCupon, IDUsuario, TotalUsos)
                VALUES (@IDCupon, @IDUsuario, 1);
            END
        END


        DECLARE @IDEstadoPagado INT;
        SELECT @IDEstadoPagado = IDEstadoPedido FROM EstadosPedido WHERE Codigo = 'PAGADO';

        INSERT INTO Pedidos (IDUsuario, IDDireccion, IDCupon, IDEstadoPedido, ClaveIdempotencia, Subtotal, Descuento, CostoEnvio, Total)
        VALUES (@IDUsuario, @IDDireccion, @IDCupon, @IDEstadoPagado, @ClaveIdempotencia, @Subtotal, @Descuento, @CostoEnvioFinal, @Total);
        DECLARE @IDNuevoPedido INT = CAST(SCOPE_IDENTITY() AS INT);

      
        ;WITH Lineas AS (
            SELECT ci.IDVariante, ci.Cantidad, v.Precio, ci.Cantidad * v.Precio AS Bruto,
                CASE WHEN @IDCatCupon IS NULL OR p.IDCategoria = @IDCatCupon
                    THEN ci.Cantidad * v.Precio ELSE 0 END AS BaseElegible
            FROM CarritoItems ci
            INNER JOIN Variantes v ON v.IDVariante = ci.IDVariante
            INNER JOIN Productos p ON p.IDProducto = v.IDProducto
            WHERE ci.IDCarrito = @IDCarrito
        ), Acumulados AS (
            SELECT *, SUM(BaseElegible) OVER (ORDER BY IDVariante ROWS UNBOUNDED PRECEDING) AS Acumulado,
                SUM(BaseElegible) OVER () AS BaseTotal FROM Lineas
        ), Descuentos AS (
            SELECT *, CAST(CASE WHEN @Descuento = 0 THEN 0 ELSE
                ROUND(@Descuento * (CAST(Acumulado AS DECIMAL(12,2)) / NULLIF(CAST(BaseTotal AS DECIMAL(12,2)), 0)), 2)
                - ROUND(@Descuento * (CAST(Acumulado - BaseElegible AS DECIMAL(12,2)) / NULLIF(CAST(BaseTotal AS DECIMAL(12,2)), 0)), 2)
                END AS DECIMAL(12,2)) AS DescuentoLinea FROM Acumulados
        )
        INSERT INTO PedidoDetalles (IDPedido, IDVariante, CantidadComprada, PrecioUnitarioCongelado, DescuentoUnitarioProrrateado, PrecioNetoUnitario, SubtotalLinea)
        SELECT @IDNuevoPedido, IDVariante, Cantidad, Precio,
            ROUND(DescuentoLinea / Cantidad, 2), ROUND((Bruto - DescuentoLinea) / Cantidad, 2),
            Bruto - DescuentoLinea FROM Descuentos;

        UPDATE v SET v.ExistenciaFisica = v.ExistenciaFisica - ci.Cantidad
        FROM Variantes v INNER JOIN CarritoItems ci ON v.IDVariante = ci.IDVariante WHERE ci.IDCarrito = @IDCarrito;

        DECLARE @IDTipoSalidaVenta INT;
        SELECT @IDTipoSalidaVenta = IDTipoMovimiento FROM TipoMovimiento WHERE Codigo = 'SALIDA_VENTA';

        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia)
        SELECT ci.IDVariante, @IDUsuario, @IDTipoSalidaVenta, -ci.Cantidad, v.ExistenciaFisica, CONCAT('Salida por venta en Pedido #', @IDNuevoPedido), @IDNuevoPedido
        FROM CarritoItems ci INNER JOIN Variantes v ON ci.IDVariante = v.IDVariante WHERE ci.IDCarrito = @IDCarrito;

        DECLARE @IDEstadoConsumida INT;
        SELECT @IDEstadoConsumida = IDEstadoReserva FROM EstadosReserva WHERE Codigo = 'CONSUMIDA';

        UPDATE ReservasInventario 
        SET IDEstadoReserva = @IDEstadoConsumida 
        WHERE IDCarrito = @IDCarrito AND IDEstadoReserva = @IDEstadoReservaActiva;

        INSERT INTO PedidoHistorialEstados (IDPedido, IDUsuario, IDEstadoAnterior, IDEstadoNuevo, Comentario) 
        VALUES (@IDNuevoPedido, @IDUsuario, NULL, @IDEstadoPagado, 'Pago confirmado');

        INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo) 
        VALUES (@IDUsuario, 'PEDIDOS', 'Pedidos', @IDNuevoPedido, 'CREACION', NULL, CONCAT('{"Estado":"PAGADO","Total":', @Total, '}'));

        DELETE FROM CarritoItems WHERE IDCarrito = @IDCarrito;
        UPDATE Carritos SET IDCupon = NULL, UltimaActividad = SYSDATETIME() WHERE IDCarrito = @IDCarrito;

        COMMIT TRANSACTION;
        SELECT @IDNuevoPedido AS IDPedido, 0 AS FueIdempotente, 'Pedido confirmado exitosamente.' AS Mensaje;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Pagos_ObtenerContexto
    @IDUsuario INT,
    @IDCarrito INT,
    @IDDireccion INT,
    @ClaveIdempotencia NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        (SELECT TOP 1 p.IDPedido FROM Pedidos p
         WHERE p.ClaveIdempotencia = @ClaveIdempotencia AND p.IDUsuario = @IDUsuario) AS IDPedidoExistente,
        (SELECT t.Total FROM dbo.FU_Pedidos_CalcularTotal(@IDUsuario, @IDCarrito, @IDDireccion) t
         WHERE t.Subtotal > 0 AND t.CostoEnvioBase IS NOT NULL) AS MontoTotal,
        (SELECT TOP 1 i.Estado FROM IntentosPago i
         WHERE i.ClaveIdempotencia = @ClaveIdempotencia AND i.IDUsuario = @IDUsuario
           AND i.Estado IN ('AUTORIZADO','PENDIENTE_CONCILIACION')
         ORDER BY i.IDIntentoPago DESC) AS EstadoIntentoActivo,
        CAST(CASE WHEN EXISTS (SELECT 1 FROM Pedidos p WHERE p.ClaveIdempotencia = @ClaveIdempotencia AND p.IDUsuario <> @IDUsuario)
                    OR EXISTS (SELECT 1 FROM IntentosPago i WHERE i.ClaveIdempotencia = @ClaveIdempotencia AND i.IDUsuario <> @IDUsuario)
                  THEN 1 ELSE 0 END AS BIT) AS ClaveEnUsoPorOtro,
        CAST(CASE WHEN EXISTS (
                    SELECT 1 FROM ReservasInventario r
                    INNER JOIN EstadosReserva e ON r.IDEstadoReserva = e.IDEstadoReserva
                    WHERE r.IDReserva = (SELECT MAX(r2.IDReserva) FROM ReservasInventario r2 WHERE r2.IDCarrito = @IDCarrito)
                      AND (e.Codigo = 'EXPIRADA' OR (e.Codigo = 'ACTIVA' AND r.FechaExpiracion <= SYSDATETIME())))
                  THEN 1 ELSE 0 END AS BIT) AS ReservaVencida;
END;
GO

CREATE OR ALTER PROCEDURE SP_Pagos_RegistrarIntento
    @IDUsuario INT,
    @ClaveIdempotencia NVARCHAR(100),
    @Monto DECIMAL(12,2),
    @Estado NVARCHAR(30),
    @ReferenciaPasarela NVARCHAR(100) = NULL,
    @Detalle NVARCHAR(400) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        IF @Estado NOT IN ('AUTORIZADO','RECHAZADO','PENDIENTE_CONCILIACION')
            THROW 50110, 'Estado inicial de intento de pago inválido.', 1;

        INSERT INTO IntentosPago (IDUsuario, ClaveIdempotencia, Monto, Estado, ReferenciaPasarela, Detalle)
        VALUES (@IDUsuario, @ClaveIdempotencia, @Monto, @Estado, @ReferenciaPasarela, @Detalle);

        SELECT CAST(SCOPE_IDENTITY() AS INT) AS IDIntentoPago;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Pagos_ActualizarEstado
    @IDIntentoPago INT,
    @NuevoEstado NVARCHAR(30),
    @IDPedido INT = NULL,
    @Detalle NVARCHAR(400) = NULL,
    @Monto DECIMAL(12,2) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @EstadoActual NVARCHAR(30);
        SELECT @EstadoActual = Estado FROM IntentosPago WITH (UPDLOCK, HOLDLOCK) WHERE IDIntentoPago = @IDIntentoPago;
        IF @EstadoActual IS NULL THROW 50111, 'El intento de pago no existe.', 1;

        IF @EstadoActual <> @NuevoEstado
        BEGIN
            IF NOT (
                (@EstadoActual = 'AUTORIZADO' AND @NuevoEstado IN ('CAPTURADO','ANULADO','PENDIENTE_CONCILIACION'))
                OR (@EstadoActual = 'PENDIENTE_CONCILIACION' AND @NuevoEstado IN ('CAPTURADO','ANULADO'))
            )
                THROW 50110, 'Transición de estado de pago no permitida.', 1;

            UPDATE IntentosPago
            SET Estado = @NuevoEstado,
                IDPedido = ISNULL(@IDPedido, IDPedido),
                Detalle = ISNULL(@Detalle, Detalle),
                Monto = ISNULL(@Monto, Monto),
                FechaActualizacion = SYSDATETIME()
            WHERE IDIntentoPago = @IDIntentoPago;
        END

        COMMIT TRANSACTION;
        SELECT IDIntentoPago, Estado, IDPedido, Monto FROM IntentosPago WHERE IDIntentoPago = @IDIntentoPago;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Pagos_ListarPendientes
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i.IDIntentoPago, i.IDUsuario, i.ClaveIdempotencia, i.Monto, i.Estado, i.ReferenciaPasarela,
           i.FechaCreacion, DATEDIFF(MINUTE, i.FechaCreacion, SYSDATETIME()) AS MinutosAntiguedad,
           ped.IDPedido AS IDPedidoExistente, ped.Total AS TotalPedido
    FROM IntentosPago i
    OUTER APPLY (
        SELECT TOP 1 p.IDPedido, p.Total FROM Pedidos p
        WHERE p.ClaveIdempotencia = i.ClaveIdempotencia AND p.IDUsuario = i.IDUsuario
    ) ped
    WHERE i.Estado = 'PENDIENTE_CONCILIACION'
    ORDER BY i.IDIntentoPago;
END;
GO

CREATE OR ALTER PROCEDURE SP_Pagos_Listar
    @Estado NVARCHAR(30) = NULL,
    @Pagina INT = 1,
    @TamanoPagina INT = 15,
    @Direccion VARCHAR(4) = 'desc'
AS
BEGIN
    SET NOCOUNT ON;
    IF @Direccion IS NULL OR @Direccion NOT IN ('asc', 'desc') SET @Direccion = 'desc';
    DECLARE @Offset INT = (@Pagina - 1) * @TamanoPagina;

    SELECT i.IDIntentoPago, i.IDUsuario, u.Correo, i.ClaveIdempotencia, i.Monto, i.Estado,
           i.ReferenciaPasarela, i.Detalle, i.IDPedido, i.FechaCreacion, i.FechaActualizacion
    FROM IntentosPago i
    INNER JOIN Usuarios u ON u.IDUsuario = i.IDUsuario
    WHERE (@Estado IS NULL OR i.Estado = @Estado)
    ORDER BY
        CASE WHEN @Direccion = 'asc' THEN i.FechaCreacion END ASC,
        CASE WHEN @Direccion = 'desc' THEN i.FechaCreacion END DESC,
        i.IDIntentoPago DESC
    OFFSET @Offset ROWS FETCH NEXT @TamanoPagina ROWS ONLY;

    SELECT COUNT(1) AS TotalRegistros FROM IntentosPago WHERE (@Estado IS NULL OR Estado = @Estado);
END;
GO

CREATE OR ALTER PROCEDURE SP_Pedidos_ObtenerPorID
    @IDPedido INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM VW_Pedidos_Historial WHERE IDPedido = @IDPedido;

    SELECT pd.IDPedidoDetalle, pd.IDVariante, v.SKU, p.Nombre AS Producto, v.Talla, v.Color,
           pd.CantidadComprada, pd.CantidadDevuelta, pd.PrecioUnitarioCongelado,
           pd.DescuentoUnitarioProrrateado, pd.PrecioNetoUnitario, pd.SubtotalLinea
    FROM PedidoDetalles pd
    INNER JOIN Variantes v ON pd.IDVariante = v.IDVariante
    INNER JOIN Productos p ON v.IDProducto = p.IDProducto
    WHERE pd.IDPedido = @IDPedido;

    SELECT 
        h.IDPedidoHistorial, 
        u.Correo AS Usuario, 
        epAnt.Nombre AS EstadoAnterior, 
        epNuevo.Nombre AS EstadoNuevo, 
        h.Comentario, 
        h.FechaCambio
    FROM PedidoHistorialEstados h 
    INNER JOIN Usuarios u ON h.IDUsuario = u.IDUsuario
    LEFT JOIN EstadosPedido epAnt ON h.IDEstadoAnterior = epAnt.IDEstadoPedido
    INNER JOIN EstadosPedido epNuevo ON h.IDEstadoNuevo = epNuevo.IDEstadoPedido
    WHERE h.IDPedido = @IDPedido 
    ORDER BY h.FechaCambio ASC;
END;
GO

CREATE OR ALTER PROCEDURE SP_Pedidos_ListarPaginado
    @IDUsuarioFiltro INT = NULL,
    @Estado VARCHAR(30) = NULL,
    @FechaInicio DATETIME2 = NULL,
    @FechaFin DATETIME2 = NULL,
    @Pagina INT = 1,
    @TamanoPagina INT = 15,
    @Busqueda NVARCHAR(100) = NULL,
    @Orden VARCHAR(20) = 'fecha',
    @Direccion VARCHAR(4) = 'desc',
    @Cliente NVARCHAR(100) = NULL,
    @TotalMin DECIMAL(12,2) = NULL,
    @TotalMax DECIMAL(12,2) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @Orden IS NULL OR @Orden NOT IN ('fecha', 'total', 'estado', 'cliente') SET @Orden = 'fecha';
    IF @Direccion IS NULL OR @Direccion NOT IN ('asc', 'desc') SET @Direccion = 'desc';
    DECLARE @Patron NVARCHAR(500) = '%' + REPLACE(REPLACE(REPLACE(@Busqueda, '[', '[[]'), '%', '[%]'), '_', '[_]') + '%';
    DECLARE @PatronCliente NVARCHAR(500) = '%' + REPLACE(REPLACE(REPLACE(@Cliente, '[', '[[]'), '%', '[%]'), '_', '[_]') + '%';
    DECLARE @Offset INT = (@Pagina - 1) * @TamanoPagina;

    SELECT vh.*, COUNT(1) OVER() AS TotalRegistros
    INTO #Resultados
    FROM VW_Pedidos_Historial vh
    WHERE (@IDUsuarioFiltro IS NULL OR vh.IDUsuario = @IDUsuarioFiltro)
      AND (@Estado IS NULL OR vh.Estado = @Estado)
      AND (@FechaInicio IS NULL OR vh.FechaCreacion >= @FechaInicio)
      AND (@FechaFin IS NULL OR vh.FechaCreacion <= @FechaFin)
      AND (@Cliente IS NULL OR @Cliente = '' OR vh.Cliente LIKE @PatronCliente OR vh.Correo LIKE @PatronCliente)
      AND (@TotalMin IS NULL OR vh.Total >= @TotalMin)
      AND (@TotalMax IS NULL OR vh.Total <= @TotalMax)
      AND (@Busqueda IS NULL OR @Busqueda = ''
           OR vh.Cliente LIKE @Patron
           OR vh.Correo LIKE @Patron
           OR vh.Estado LIKE @Patron
           OR vh.IDPedido = TRY_CAST(REPLACE(UPPER(@Busqueda), 'ORD-', '') AS INT));

    SELECT * FROM #Resultados
    ORDER BY
        CASE WHEN @Orden = 'fecha' AND @Direccion = 'asc' THEN FechaCreacion END ASC,
        CASE WHEN @Orden = 'fecha' AND @Direccion = 'desc' THEN FechaCreacion END DESC,
        CASE WHEN @Orden = 'total' AND @Direccion = 'asc' THEN Total END ASC,
        CASE WHEN @Orden = 'total' AND @Direccion = 'desc' THEN Total END DESC,
        CASE WHEN @Orden = 'estado' AND @Direccion = 'asc' THEN Estado END ASC,
        CASE WHEN @Orden = 'estado' AND @Direccion = 'desc' THEN Estado END DESC,
        CASE WHEN @Orden = 'cliente' AND @Direccion = 'asc' THEN Cliente END ASC,
        CASE WHEN @Orden = 'cliente' AND @Direccion = 'desc' THEN Cliente END DESC,
        IDPedido DESC
    OFFSET @Offset ROWS FETCH NEXT @TamanoPagina ROWS ONLY;
    SELECT COUNT(1) AS TotalRegistros FROM #Resultados;
END;
GO

CREATE OR ALTER PROCEDURE SP_Pedidos_CambiarEstado
    @IDPedido INT,
    @NuevoEstado VARCHAR(30),
    @IDUsuario INT,
    @RolUsuario VARCHAR(20),
    @Comentario NVARCHAR(300) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @IDEstadoActual INT, @EstadoActualCodigo VARCHAR(30), @IDPropietario INT, @IDCupon INT;
        SELECT 
            @IDEstadoActual = p.IDEstadoPedido,
            @EstadoActualCodigo = ep.Codigo, 
            @IDPropietario = p.IDUsuario, 
            @IDCupon = p.IDCupon 
        FROM Pedidos p WITH (UPDLOCK)
        INNER JOIN EstadosPedido ep ON p.IDEstadoPedido = ep.IDEstadoPedido
        WHERE p.IDPedido = @IDPedido;

        IF @EstadoActualCodigo IS NULL THROW 50070, 'El pedido no existe.', 1;

        IF @RolUsuario = 'CLIENTE'
        BEGIN
            IF @IDPropietario <> @IDUsuario THROW 50071, 'No tienes permiso para modificar este pedido.', 1;
            IF @NuevoEstado <> 'CANCELADO' THROW 50072, 'El cliente solo puede solicitar cancelación.', 1;
        END

        DECLARE @IDEstadoNuevo INT;
        SELECT @IDEstadoNuevo = IDEstadoPedido FROM EstadosPedido WHERE Codigo = @NuevoEstado;
        IF @IDEstadoNuevo IS NULL THROW 50074, 'El nuevo estado no existe en el catálogo.', 1;

        
        IF NOT EXISTS (
            SELECT 1 FROM TransicionesEstadoPedido 
            WHERE IDEstadoOrigen = @IDEstadoActual AND IDEstadoDestino = @IDEstadoNuevo
        )
        BEGIN
            THROW 50073, 'Transición de estado no permitida.', 1;
        END

        UPDATE Pedidos SET IDEstadoPedido = @IDEstadoNuevo WHERE IDPedido = @IDPedido;

        IF @NuevoEstado = 'CANCELADO'
        BEGIN
            UPDATE v SET v.ExistenciaFisica = v.ExistenciaFisica + pd.CantidadComprada
            FROM Variantes v INNER JOIN PedidoDetalles pd ON v.IDVariante = pd.IDVariante WHERE pd.IDPedido = @IDPedido;

            DECLARE @IDTipoAjustePos INT;
            SELECT @IDTipoAjustePos = IDTipoMovimiento FROM TipoMovimiento WHERE Codigo = 'AJUSTE_POSITIVO';

            INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia)
            SELECT pd.IDVariante, @IDUsuario, @IDTipoAjustePos, pd.CantidadComprada, v.ExistenciaFisica, CONCAT('Reintegro por cancelación Pedido #', @IDPedido), @IDPedido
            FROM PedidoDetalles pd INNER JOIN Variantes v ON pd.IDVariante = v.IDVariante WHERE pd.IDPedido = @IDPedido;

            IF @IDCupon IS NOT NULL
            BEGIN
                UPDATE Cupones SET UsosActuales = CASE WHEN UsosActuales > 0 THEN UsosActuales - 1 ELSE 0 END WHERE IDCupon = @IDCupon;
                UPDATE CuponesUsosPorCliente 
                SET TotalUsos = CASE WHEN TotalUsos > 0 THEN TotalUsos - 1 ELSE 0 END 
                WHERE IDCupon = @IDCupon AND IDUsuario = @IDPropietario;
            END
        END

        INSERT INTO PedidoHistorialEstados (IDPedido, IDUsuario, IDEstadoAnterior, IDEstadoNuevo, Comentario)
        VALUES (@IDPedido, @IDUsuario, @IDEstadoActual, @IDEstadoNuevo, @Comentario);

        INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
        VALUES (@IDUsuario, 'PEDIDOS', 'Pedidos', @IDPedido, 'CAMBIO_ESTADO', CONCAT('{"Estado":"', @EstadoActualCodigo, '"}'), CONCAT('{"Estado":"', @NuevoEstado, '"}'));

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE SP_Pedidos_ProcesarDevolucionLinea
    @IDPedido INT,
    @IDPedidoDetalle INT,
    @CantidadADevolver INT,
    @Motivo NVARCHAR(300),
    @IDUsuarioOperador INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @IDEstadoPedido INT, @EstadoPedidoCodigo VARCHAR(30), @IDCupon INT, @IDUsuarioCliente INT;
        SELECT 
            @IDEstadoPedido = p.IDEstadoPedido,
            @EstadoPedidoCodigo = ep.Codigo, 
            @IDCupon = p.IDCupon,
            @IDUsuarioCliente = p.IDUsuario
        FROM Pedidos p WITH (UPDLOCK)
        INNER JOIN EstadosPedido ep ON p.IDEstadoPedido = ep.IDEstadoPedido
        WHERE p.IDPedido = @IDPedido;

        IF @EstadoPedidoCodigo NOT IN ('ENTREGADO', 'DEVUELTO_PARCIAL')
            THROW 50080, 'Solo se permiten devoluciones de pedidos entregado o parcialmente devueltos.', 1;

        DECLARE @IDVariante INT, @Comprada INT, @DevueltaPrevia INT, @SubtotalLinea DECIMAL(12,2);
        SELECT @IDVariante = IDVariante, @Comprada = CantidadComprada, @DevueltaPrevia = CantidadDevuelta, @SubtotalLinea = SubtotalLinea
        FROM PedidoDetalles WITH (UPDLOCK) WHERE IDPedidoDetalle = @IDPedidoDetalle AND IDPedido = @IDPedido;
        IF @IDVariante IS NULL THROW 50081, 'La línea de pedido no existe.', 1;
        IF (@DevueltaPrevia + @CantidadADevolver) > @Comprada THROW 50082, 'No se puede devolver más cantidad de la vendida.', 1;

        IF @CantidadADevolver <= 0 THROW 50082, 'La cantidad a devolver debe ser positiva.', 1;
        DECLARE @MontoReembolsoLinea DECIMAL(12,2) =
            ROUND(@SubtotalLinea * (CAST(@DevueltaPrevia + @CantidadADevolver AS DECIMAL(12,2)) / @Comprada), 2)
            - ROUND(@SubtotalLinea * (CAST(@DevueltaPrevia AS DECIMAL(12,2)) / @Comprada), 2);
        UPDATE PedidoDetalles SET CantidadDevuelta = CantidadDevuelta + @CantidadADevolver WHERE IDPedidoDetalle = @IDPedidoDetalle;

        INSERT INTO Devoluciones (IDPedido, IDPedidoDetalle, IDUsuarioOperador, CantidadDevuelta, MontoReembolsadoLinea, Motivo)
        VALUES (@IDPedido, @IDPedidoDetalle, @IDUsuarioOperador, @CantidadADevolver, @MontoReembolsoLinea, @Motivo);

        UPDATE Variantes SET ExistenciaFisica = ExistenciaFisica + @CantidadADevolver WHERE IDVariante = @IDVariante;
        DECLARE @SaldoActual INT;
        SELECT @SaldoActual = ExistenciaFisica FROM Variantes WITH (UPDLOCK) WHERE IDVariante = @IDVariante;

        DECLARE @IDTipoDevolucionCliente INT;
        SELECT @IDTipoDevolucionCliente = IDTipoMovimiento FROM TipoMovimiento WHERE Codigo = 'DEVOLUCION_CLIENTE';

        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia)
        VALUES (@IDVariante, @IDUsuarioOperador, @IDTipoDevolucionCliente, @CantidadADevolver, @SaldoActual, CONCAT('Devolución Pedido #', @IDPedido, ': ', @Motivo), @IDPedido);

        DECLARE @NuevoEstadoCodigo VARCHAR(30) = 'DEVUELTO_PARCIAL';
        IF NOT EXISTS (SELECT 1 FROM PedidoDetalles WHERE IDPedido = @IDPedido AND CantidadDevuelta < CantidadComprada)
        BEGIN
            SET @NuevoEstadoCodigo = 'DEVUELTO_TOTAL';
            IF @IDCupon IS NOT NULL
            BEGIN
                UPDATE Cupones SET UsosActuales = CASE WHEN UsosActuales > 0 THEN UsosActuales - 1 ELSE 0 END WHERE IDCupon = @IDCupon;
                UPDATE CuponesUsosPorCliente 
                SET TotalUsos = CASE WHEN TotalUsos > 0 THEN TotalUsos - 1 ELSE 0 END 
                WHERE IDCupon = @IDCupon AND IDUsuario = @IDUsuarioCliente;
            END
        END

        DECLARE @IDEstadoNuevo INT;
        SELECT @IDEstadoNuevo = IDEstadoPedido FROM EstadosPedido WHERE Codigo = @NuevoEstadoCodigo;

        UPDATE Pedidos 
        SET IDEstadoPedido = @IDEstadoNuevo, 
            MontoReembolsado = MontoReembolsado + @MontoReembolsoLinea 
        WHERE IDPedido = @IDPedido;

        INSERT INTO PedidoHistorialEstados (IDPedido, IDUsuario, IDEstadoAnterior, IDEstadoNuevo, Comentario) 
        VALUES (@IDPedido, @IDUsuarioOperador, @IDEstadoPedido, @IDEstadoNuevo, CONCAT('Devolución Q', @MontoReembolsoLinea));

        INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo) 
        VALUES (@IDUsuarioOperador, 'PEDIDOS', 'Devoluciones', @IDPedido, 'DEVOLUCION', CONCAT('{"Estado":"', @EstadoPedidoCodigo, '"}'), CONCAT('{"Estado":"', @NuevoEstadoCodigo, '","MontoReembolsado":', @MontoReembolsoLinea, '}'));

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- dashboard y bitácora
CREATE OR ALTER PROCEDURE SP_Dashboard_ResumenMetricas
    @FechaInicio DATETIME2,
    @FechaFin DATETIME2
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @HorasAbandono INT = 24;
    SELECT @HorasAbandono = TRY_CAST(Valor AS INT) FROM ConfiguracionSistema WHERE Clave = 'CARRITO_ABANDONADO_HORAS';

    SELECT 
        COUNT(p.IDPedido) AS TotalPedidosCompletados,
        ISNULL(SUM(p.Total - p.MontoReembolsado), 0.00) AS VentasNetasQuetzales,
        CASE WHEN COUNT(p.IDPedido) > 0 THEN CAST(ROUND(SUM(p.Total - p.MontoReembolsado) / COUNT(p.IDPedido), 2) AS DECIMAL(12,2)) ELSE 0.00 END AS TicketPromedioQuetzales,
        (SELECT COUNT(1) FROM Carritos c WHERE EXISTS (SELECT 1 FROM CarritoItems ci WHERE ci.IDCarrito = c.IDCarrito) AND c.UltimaActividad <= DATEADD(HOUR, -ISNULL(@HorasAbandono, 24), SYSDATETIME())) AS CarritosAbandonadosActuales
    FROM Pedidos p
    INNER JOIN EstadosPedido ep ON p.IDEstadoPedido = ep.IDEstadoPedido
    WHERE ep.Codigo IN ('ENTREGADO', 'DEVUELTO_PARCIAL', 'DEVUELTO_TOTAL')
      AND p.FechaCreacion BETWEEN @FechaInicio AND @FechaFin;

    SELECT TOP 10
        pr.IDProducto, pr.Nombre AS Producto,
        SUM(pd.CantidadComprada - pd.CantidadDevuelta) AS UnidadesNetasVendidas,
        SUM(pd.SubtotalLinea - ROUND(pd.SubtotalLinea * (CAST(pd.CantidadDevuelta AS DECIMAL(12,2)) / pd.CantidadComprada), 2)) AS IngresosNetosQuetzales
    FROM PedidoDetalles pd
    INNER JOIN Pedidos p ON pd.IDPedido = p.IDPedido
    INNER JOIN EstadosPedido ep ON p.IDEstadoPedido = ep.IDEstadoPedido
    INNER JOIN Variantes v ON pd.IDVariante = v.IDVariante
    INNER JOIN Productos pr ON v.IDProducto = pr.IDProducto
    WHERE ep.Codigo IN ('ENTREGADO', 'DEVUELTO_PARCIAL', 'DEVUELTO_TOTAL')
      AND p.FechaCreacion BETWEEN @FechaInicio AND @FechaFin
    GROUP BY pr.IDProducto, pr.Nombre
    HAVING SUM(pd.CantidadComprada - pd.CantidadDevuelta) > 0
    ORDER BY UnidadesNetasVendidas DESC;

    SELECT 
        c.IDCategoria,
        c.Nombre AS Categoria,
        COUNT(DISTINCT p.IDPedido) AS TotalPedidos,
        COUNT(DISTINCT p.IDPedido) AS TotalPedidosCompletados,
        SUM(pd.CantidadComprada - pd.CantidadDevuelta) AS UnidadesNetasVendidas,
        SUM(pd.SubtotalLinea - ROUND(pd.SubtotalLinea * (CAST(pd.CantidadDevuelta AS DECIMAL(12,2)) / pd.CantidadComprada), 2)) AS VentasNetasQuetzales,
        SUM((pd.CantidadComprada - pd.CantidadDevuelta) * pd.PrecioUnitarioCongelado) AS MontoBrutoQuetzales
    FROM Categorias c
    INNER JOIN Productos pr ON c.IDCategoria = pr.IDCategoria
    INNER JOIN Variantes v ON pr.IDProducto = v.IDProducto
    INNER JOIN PedidoDetalles pd ON v.IDVariante = pd.IDVariante
    INNER JOIN Pedidos p ON pd.IDPedido = p.IDPedido
    INNER JOIN EstadosPedido ep ON p.IDEstadoPedido = ep.IDEstadoPedido
    WHERE ep.Codigo IN ('ENTREGADO', 'DEVUELTO_PARCIAL', 'DEVUELTO_TOTAL')
      AND p.FechaCreacion BETWEEN @FechaInicio AND @FechaFin
    GROUP BY c.IDCategoria, c.Nombre;
END;
GO

CREATE OR ALTER PROCEDURE SP_Dashboard_VentasPorPeriodo
    @Agrupacion VARCHAR(10) = 'DIA',
    @FechaInicio DATETIME2,
    @FechaFin DATETIME2
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        CASE 
            WHEN @Agrupacion = 'DIA' THEN CONVERT(VARCHAR(10), p.FechaCreacion, 23)
            WHEN @Agrupacion = 'SEMANA' THEN CONCAT(YEAR(p.FechaCreacion), '-W', RIGHT('0' + CAST(DATEPART(ISO_WEEK, p.FechaCreacion) AS VARCHAR(2)), 2))
            ELSE FORMAT(p.FechaCreacion, 'yyyy-MM')
        END AS Periodo,
        COUNT(p.IDPedido) AS NumeroPedidos,
        SUM(p.Total - p.MontoReembolsado) AS VentasQuetzales
    FROM Pedidos p
    INNER JOIN EstadosPedido ep ON p.IDEstadoPedido = ep.IDEstadoPedido
    WHERE ep.Codigo IN ('ENTREGADO', 'DEVUELTO_PARCIAL', 'DEVUELTO_TOTAL')
      AND p.FechaCreacion BETWEEN @FechaInicio AND @FechaFin
    GROUP BY 
        CASE 
            WHEN @Agrupacion = 'DIA' THEN CONVERT(VARCHAR(10), p.FechaCreacion, 23)
            WHEN @Agrupacion = 'SEMANA' THEN CONCAT(YEAR(p.FechaCreacion), '-W', RIGHT('0' + CAST(DATEPART(ISO_WEEK, p.FechaCreacion) AS VARCHAR(2)), 2))
            ELSE FORMAT(p.FechaCreacion, 'yyyy-MM')
        END
    ORDER BY Periodo ASC;
END;
GO

CREATE OR ALTER PROCEDURE SP_Bitacora_Listar
    @Modulo VARCHAR(50) = NULL,
    @Orden VARCHAR(20) = 'fecha',
    @Direccion VARCHAR(4) = 'desc',
    @Pagina INT = 1,
    @TamanoPagina INT = 20,
    @Accion VARCHAR(50) = NULL,
    @Busqueda NVARCHAR(150) = NULL,
    @FechaDesde DATETIME2 = NULL,
    @FechaHasta DATETIME2 = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @Orden IS NULL OR @Orden NOT IN ('fecha', 'modulo', 'usuario') SET @Orden = 'fecha';
    IF @Direccion IS NULL OR @Direccion NOT IN ('asc', 'desc') SET @Direccion = 'desc';
    DECLARE @PatronAccion NVARCHAR(500) = '%' + REPLACE(REPLACE(REPLACE(@Accion, '[', '[[]'), '%', '[%]'), '_', '[_]') + '%';
    DECLARE @Patron NVARCHAR(500) = '%' + REPLACE(REPLACE(REPLACE(@Busqueda, '[', '[[]'), '%', '[%]'), '_', '[_]') + '%';
    DECLARE @Offset INT = (@Pagina - 1) * @TamanoPagina;

    SELECT 
        b.IDBitacora, 
        b.FechaRegistro, 
        u.Correo AS Usuario, 
        r.Codigo AS Rol,
        b.Modulo, 
        b.Entidad, 
        b.IDEntidad, 
        b.Accion, 
        b.ValorAnterior, 
        b.ValorNuevo,
        COUNT(1) OVER() AS TotalRegistros
    INTO #Resultados
    FROM Bitacora b 
    INNER JOIN Usuarios u ON b.IDUsuario = u.IDUsuario
    INNER JOIN Roles r ON u.IDRol = r.IDRol
    WHERE (@Modulo IS NULL OR b.Modulo = @Modulo)
      AND (@Accion IS NULL OR @Accion = '' OR b.Accion LIKE @PatronAccion)
      AND (@Busqueda IS NULL OR @Busqueda = '' OR u.Correo LIKE @Patron)
      AND (@FechaDesde IS NULL OR b.FechaRegistro >= @FechaDesde)
      AND (@FechaHasta IS NULL OR b.FechaRegistro <= @FechaHasta);

    SELECT * FROM #Resultados
    ORDER BY
        CASE WHEN @Orden = 'fecha' AND @Direccion = 'asc' THEN FechaRegistro END ASC,
        CASE WHEN @Orden = 'fecha' AND @Direccion = 'desc' THEN FechaRegistro END DESC,
        CASE WHEN @Orden = 'modulo' AND @Direccion = 'asc' THEN Modulo END ASC,
        CASE WHEN @Orden = 'modulo' AND @Direccion = 'desc' THEN Modulo END DESC,
        CASE WHEN @Orden = 'usuario' AND @Direccion = 'asc' THEN Usuario END ASC,
        CASE WHEN @Orden = 'usuario' AND @Direccion = 'desc' THEN Usuario END DESC,
        IDBitacora DESC
    OFFSET @Offset ROWS FETCH NEXT @TamanoPagina ROWS ONLY;
    SELECT COUNT(1) AS TotalRegistros FROM #Resultados;
END;
GO

CREATE OR ALTER PROCEDURE SP_Sistema_Ping
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 1 AS Ok;
END;
GO

-- Se puede ejecutar varias veces sin duplicar datos.

IF COL_LENGTH('dbo.Variantes', 'PrecioReferencia') IS NULL
BEGIN
    ALTER TABLE dbo.Variantes ADD PrecioReferencia DECIMAL(12,2) NULL
        CONSTRAINT CK_Variantes_PrecioReferencia CHECK (PrecioReferencia IS NULL OR PrecioReferencia > 0);
END
GO

IF COL_LENGTH('dbo.Productos', 'Destacado') IS NULL
BEGIN
    ALTER TABLE dbo.Productos ADD Destacado BIT NOT NULL
        CONSTRAINT DF_Productos_Destacado DEFAULT 0;
END
GO

IF OBJECT_ID('dbo.ProductoImagenes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductoImagenes (
        IDProductoImagen INT IDENTITY(1,1) CONSTRAINT PK_ProductoImagenes PRIMARY KEY,
        IDProducto INT NOT NULL CONSTRAINT FK_ProductoImagenes_Productos FOREIGN KEY REFERENCES dbo.Productos(IDProducto),
        Url NVARCHAR(500) NOT NULL,
        Orden INT NOT NULL CONSTRAINT CK_ProductoImagenes_Orden CHECK (Orden > 0),
        FechaCreacion DATETIME2 NOT NULL CONSTRAINT DF_ProductoImagenes_Fecha DEFAULT SYSDATETIME(),
        CONSTRAINT UQ_ProductoImagenes_Orden UNIQUE (IDProducto, Orden)
    );
END
GO

IF OBJECT_ID('dbo.Favoritos', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Favoritos (
        IDFavorito INT IDENTITY(1,1) CONSTRAINT PK_Favoritos PRIMARY KEY,
        IDUsuario INT NOT NULL CONSTRAINT FK_Favoritos_Usuarios FOREIGN KEY REFERENCES dbo.Usuarios(IDUsuario),
        IDProducto INT NOT NULL CONSTRAINT FK_Favoritos_Productos FOREIGN KEY REFERENCES dbo.Productos(IDProducto),
        FechaCreacion DATETIME2 NOT NULL CONSTRAINT DF_Favoritos_Fecha DEFAULT SYSDATETIME(),
        CONSTRAINT UQ_Favoritos_UsuarioProducto UNIQUE (IDUsuario, IDProducto)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.ConfiguracionSistema WHERE Clave = 'DiasProductoNuevo')
BEGIN
    INSERT INTO dbo.ConfiguracionSistema (Clave, Valor, Descripcion)
    VALUES ('DiasProductoNuevo', '30', N'Dias durante los cuales un producto recien creado se considera "nuevo" en la tienda');
END
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
    @SoloDestacados BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Offset INT = (@Pagina - 1) * @TamanoPagina;
    DECLARE @DiasNuevo INT = ISNULL((SELECT TRY_CAST(Valor AS INT) FROM ConfiguracionSistema WHERE Clave = 'DiasProductoNuevo'), 30);
    DECLARE @FechaNuevo DATETIME2 = DATEADD(DAY, -@DiasNuevo, SYSDATETIME());

    WITH ProductosFiltrados AS (
        SELECT
            p.IDProducto, p.Nombre, p.Descripcion, p.ImagenUrl, p.Activo,
            c.IDCategoria, c.Nombre AS Categoria,
            MIN(v.Precio) AS PrecioMinimo, MAX(v.Precio) AS PrecioMaximo,
            SUM(disp.ExistenciaDisponible) AS StockTotalDisponible,
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
        INNER JOIN Variantes v ON p.IDProducto = v.IDProducto AND v.Activo = 1
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
          AND (@Busqueda IS NULL OR p.Nombre LIKE '%' + @Busqueda + '%' OR p.Descripcion LIKE '%' + @Busqueda + '%' OR v.SKU LIKE '%' + @Busqueda + '%')
          AND (@PrecioMin IS NULL OR v.Precio >= @PrecioMin)
          AND (@PrecioMax IS NULL OR v.Precio <= @PrecioMax)
          AND (@SoloNuevos = 0 OR p.FechaCreacion >= @FechaNuevo)
          AND (@SoloDestacados = 0 OR p.Destacado = 1)
          AND (@SoloOfertas = 0 OR ofe.PrecioReferencia IS NOT NULL)
        GROUP BY p.IDProducto, p.Nombre, p.Descripcion, p.ImagenUrl, p.Activo, c.IDCategoria, c.Nombre, p.FechaCreacion,
                 p.Destacado, ofe.PrecioOferta, ofe.PrecioReferencia, ofe.PorcentajeDescuento
        HAVING (@SoloDisponibles = 0 OR SUM(disp.ExistenciaDisponible) > 0)
    )
    SELECT *, COUNT(1) OVER() AS TotalRegistros
    INTO #Resultados
    FROM ProductosFiltrados;

    SELECT * FROM #Resultados
    ORDER BY
        CASE WHEN @OrdenarPor = 'PRECIO_ASC' THEN PrecioMinimo END ASC,
        CASE WHEN @OrdenarPor = 'PRECIO_DESC' THEN PrecioMinimo END DESC,
        CASE WHEN @OrdenarPor = 'NOMBRE_ASC' THEN Nombre END ASC,
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
        IF @Url IS NULL OR (@Url NOT LIKE 'http://%' AND @Url NOT LIKE 'https://%')
            THROW 50094, 'La URL de la imagen debe iniciar con http:// o https://.', 1;
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
        VALUES (@IDUsuarioAdmin, 'PRODUCTOS', 'ProductoImagenes', @IDProductoImagen, 'DESACTIVACION',
                CONCAT('{"IDProducto":', @IDProducto, ',"Url":"', STRING_ESCAPE(@Url, 'json'), '","Orden":', @Orden, '}'), NULL);
        COMMIT TRANSACTION;
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

-- Datos demo; solo si no existen.
IF NOT EXISTS (SELECT 1 FROM ProductoImagenes)
BEGIN
    INSERT INTO ProductoImagenes (IDProducto, Url, Orden)
    SELECT IDProducto, ImagenUrl, 1 FROM Productos WHERE ImagenUrl IS NOT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM Productos WHERE Destacado = 1)
BEGIN
    UPDATE Productos SET Destacado = 1
    WHERE IDProducto IN (SELECT TOP (6) IDProducto FROM Productos WHERE Activo = 1 ORDER BY IDProducto ASC);
END
GO

IF NOT EXISTS (SELECT 1 FROM Variantes WHERE PrecioReferencia IS NOT NULL)
BEGIN
    UPDATE Variantes SET PrecioReferencia = ROUND(Precio * 1.25, 2)
    WHERE Activo = 1 AND IDVariante % 3 = 0;
END
GO

IF COL_LENGTH('dbo.Categorias', 'ImagenUrl') IS NULL
BEGIN
    ALTER TABLE dbo.Categorias ADD ImagenUrl NVARCHAR(500) NULL;
END
GO

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

IF NOT EXISTS (SELECT 1 FROM Categorias WHERE ImagenUrl IS NOT NULL)
BEGIN
    UPDATE c SET ImagenUrl = (SELECT TOP 1 p.ImagenUrl FROM Productos p
                              WHERE p.IDCategoria = c.IDCategoria AND p.ImagenUrl IS NOT NULL
                              ORDER BY p.IDProducto ASC)
    FROM Categorias c;
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.ConfiguracionSistema WHERE Clave = 'UmbralExistenciasBajas')
BEGIN
    INSERT INTO dbo.ConfiguracionSistema (Clave, Valor, Descripcion)
    VALUES ('UmbralExistenciasBajas', '5', N'Una variante activa con existencia disponible menor o igual a este valor aparece en el reporte de existencias bajas');
END
GO

CREATE OR ALTER VIEW VW_Inventario_ExistenciasBajas
AS
SELECT
    v.IDVariante, v.SKU, v.Talla, v.Color, v.Presentacion,
    p.IDProducto, p.Nombre AS Producto,
    c.IDCategoria, c.Nombre AS Categoria,
    disp.ExistenciaFisica, disp.UnidadesReservadas, disp.ExistenciaDisponible,
    cfg.Umbral AS UmbralAplicado
FROM Variantes v
INNER JOIN Productos p ON p.IDProducto = v.IDProducto AND p.Activo = 1
INNER JOIN Categorias c ON c.IDCategoria = p.IDCategoria AND c.Activo = 1
CROSS APPLY dbo.FU_Inventario_ExistenciaDisponible(v.IDVariante) disp
CROSS APPLY (SELECT ISNULL(TRY_CAST((SELECT Valor FROM ConfiguracionSistema WHERE Clave = 'UmbralExistenciasBajas') AS INT), 5) AS Umbral) cfg
WHERE v.Activo = 1 AND disp.ExistenciaDisponible <= cfg.Umbral;
GO

CREATE OR ALTER PROCEDURE SP_Inventario_ListarExistenciasBajas
    @Busqueda NVARCHAR(150) = NULL,
    @Pagina INT = 1,
    @TamanoPagina INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Offset INT = (@Pagina - 1) * @TamanoPagina;

    SELECT *, COUNT(1) OVER() AS TotalRegistros
    INTO #Bajas
    FROM VW_Inventario_ExistenciasBajas
    WHERE @Busqueda IS NULL OR Producto LIKE '%' + @Busqueda + '%' OR SKU LIKE '%' + @Busqueda + '%';

    SELECT * FROM #Bajas
    ORDER BY ExistenciaDisponible ASC, Producto ASC, SKU ASC
    OFFSET @Offset ROWS FETCH NEXT @TamanoPagina ROWS ONLY;
    SELECT COUNT(1) AS TotalRegistros FROM #Bajas;
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

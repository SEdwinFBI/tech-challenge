IF OBJECT_ID('dbo.RecomendacionVistas', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RecomendacionVistas (
        IDRecomendacionVista BIGINT IDENTITY(1,1) CONSTRAINT PK_RecomendacionVistas PRIMARY KEY,
        Propietario VARCHAR(70) NOT NULL,
        IDProducto INT NOT NULL REFERENCES dbo.Productos(IDProducto) ON DELETE CASCADE,
        Visitas INT NOT NULL CHECK (Visitas BETWEEN 1 AND 3),
        UltimaVista DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT UQ_RecomendacionVistas_PropietarioProducto UNIQUE (Propietario, IDProducto)
    );
END;
GO
CREATE OR ALTER PROCEDURE dbo.SP_Recomendaciones_RegistrarVista
    @Propietario VARCHAR(70), @IDProducto INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE IDProducto = @IDProducto AND Activo = 1) RETURN;
    BEGIN TRANSACTION;
    IF EXISTS (SELECT 1 FROM dbo.RecomendacionVistas WITH (UPDLOCK, HOLDLOCK)
               WHERE Propietario = @Propietario AND IDProducto = @IDProducto)
        UPDATE dbo.RecomendacionVistas
        SET Visitas = CASE WHEN UltimaVista < DATEADD(DAY, -30, SYSDATETIME()) THEN 1
                           WHEN Visitas < 3 THEN Visitas + 1 ELSE 3 END,
            UltimaVista = SYSDATETIME()
        WHERE Propietario = @Propietario AND IDProducto = @IDProducto
          AND UltimaVista < DATEADD(MINUTE, -1, SYSDATETIME());
    ELSE
        INSERT INTO dbo.RecomendacionVistas (Propietario, IDProducto, Visitas) VALUES (@Propietario, @IDProducto, 1);
    COMMIT;
END;
GO
CREATE OR ALTER PROCEDURE dbo.SP_Recomendaciones_ObtenerContexto
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
    FROM dbo.RecomendacionVistas WHERE Propietario = @Propietario AND UltimaVista >= DATEADD(DAY, -90, SYSDATETIME());
    INSERT INTO #Senales SELECT IDProducto, 'FAVORITO', 3 FROM dbo.Favoritos WHERE IDUsuario = @IDUsuario;
    INSERT INTO #Senales
    SELECT DISTINCT v.IDProducto, 'CARRITO', 4 FROM dbo.Carritos c
    INNER JOIN dbo.CarritoItems ci ON ci.IDCarrito = c.IDCarrito
    INNER JOIN dbo.Variantes v ON v.IDVariante = ci.IDVariante
    WHERE (@IDUsuario IS NOT NULL AND c.IDUsuario = @IDUsuario)
       OR (@IDUsuario IS NULL AND c.IDUsuario IS NULL AND c.TokenInvitado = @TokenInvitado);
    INSERT INTO #Senales
    SELECT v.IDProducto, 'COMPRA', 6 * MAX(POWER(CAST(0.5 AS FLOAT), DATEDIFF(DAY, pe.FechaCreacion, SYSDATETIME()) / 30.0))
    FROM dbo.Pedidos pe INNER JOIN dbo.EstadosPedido e ON pe.IDEstadoPedido = e.IDEstadoPedido
    INNER JOIN dbo.PedidoDetalles pd ON pd.IDPedido = pe.IDPedido
    INNER JOIN dbo.Variantes v ON v.IDVariante = pd.IDVariante
    WHERE pe.IDUsuario = @IDUsuario AND e.Codigo NOT IN ('CANCELADO', 'DEVUELTO_TOTAL')
      AND pd.CantidadComprada > pd.CantidadDevuelta AND pe.FechaCreacion >= DATEADD(DAY, -90, SYSDATETIME())
    GROUP BY v.IDProducto;

    SELECT TOP (40) s.IDProducto, p.IDCategoria, p.Nombre, p.Descripcion, c.Nombre AS Categoria,
        s.Tipo, s.Peso, precio.PrecioMinimo
    FROM #Senales s INNER JOIN dbo.Productos p ON p.IDProducto = s.IDProducto
    INNER JOIN dbo.Categorias c ON c.IDCategoria = p.IDCategoria
    OUTER APPLY (SELECT MIN(v.Precio) AS PrecioMinimo FROM dbo.Variantes v WHERE v.IDProducto = p.IDProducto AND v.Activo = 1) precio
    WHERE p.Activo = 1 AND (@Contexto <> 'favoritos' OR s.Tipo = 'FAVORITO')
    ORDER BY s.Peso DESC, s.IDProducto, s.Tipo;

    ;WITH Candidatos AS (
    SELECT p.IDProducto, p.IDCategoria, p.Nombre, p.Descripcion, p.ImagenUrl, p.Activo,
        c.Nombre AS Categoria, MIN(v.Precio) AS PrecioMinimo, MAX(v.Precio) AS PrecioMaximo,
        SUM(disp.ExistenciaDisponible) AS StockTotalDisponible, p.Destacado,
        ofe.PrecioOferta, ofe.PrecioReferencia, ofe.PorcentajeDescuento,
        COALESCE(afinidad.Peso, 0) AS Afinidad
    FROM dbo.Productos p INNER JOIN dbo.Categorias c ON c.IDCategoria = p.IDCategoria AND c.Activo = 1
    INNER JOIN dbo.Variantes v ON v.IDProducto = p.IDProducto AND v.Activo = 1
    CROSS APPLY dbo.FU_Inventario_ExistenciaDisponible(v.IDVariante) disp
    OUTER APPLY (
        SELECT TOP (1) vo.Precio AS PrecioOferta, vo.PrecioReferencia,
            CAST(ROUND((vo.PrecioReferencia - vo.Precio) * 100.0 / vo.PrecioReferencia, 0) AS INT) AS PorcentajeDescuento
        FROM dbo.Variantes vo CROSS APPLY dbo.FU_Inventario_ExistenciaDisponible(vo.IDVariante) vd
        WHERE vo.IDProducto = p.IDProducto AND vo.Activo = 1 AND vd.ExistenciaDisponible > 0
          AND vo.PrecioReferencia > vo.Precio AND (vo.PrecioReferencia - vo.Precio) * 100.0 / vo.PrecioReferencia >= 1
          AND (@PrecioMin IS NULL OR vo.Precio >= @PrecioMin) AND (@PrecioMax IS NULL OR vo.Precio <= @PrecioMax)
        ORDER BY (vo.PrecioReferencia - vo.Precio) / vo.PrecioReferencia DESC, vo.IDVariante
    ) ofe
    OUTER APPLY (SELECT SUM(s.Peso) AS Peso FROM #Senales s
                 INNER JOIN dbo.Productos preferido ON preferido.IDProducto = s.IDProducto
                 WHERE preferido.IDCategoria = p.IDCategoria AND (@Contexto <> 'favoritos' OR s.Tipo = 'FAVORITO')) afinidad
    WHERE p.Activo = 1 AND disp.ExistenciaDisponible > 0
      AND (@Contexto <> 'ofertas' OR ofe.PrecioReferencia IS NOT NULL)
      AND (@IDCategoria IS NULL OR p.IDCategoria = @IDCategoria)
      AND (@PrecioMin IS NULL OR v.Precio >= @PrecioMin) AND (@PrecioMax IS NULL OR v.Precio <= @PrecioMax)
      AND (@Busqueda IS NULL OR p.Nombre LIKE @Patron OR p.Descripcion LIKE @Patron OR v.SKU LIKE @Patron)
      AND (@Contexto <> 'favoritos' OR NOT EXISTS (SELECT 1 FROM #Senales s WHERE s.IDProducto = p.IDProducto AND s.Tipo = 'FAVORITO'))
      AND (@IDProducto IS NULL OR p.IDProducto <> @IDProducto)
      AND NOT EXISTS (SELECT 1 FROM #Senales s WHERE s.IDProducto = p.IDProducto AND s.Tipo = 'CARRITO')
    GROUP BY p.IDProducto, p.IDCategoria, p.Nombre, p.Descripcion, p.ImagenUrl, p.Activo,
        c.Nombre, p.Destacado, afinidad.Peso, ofe.PrecioOferta, ofe.PrecioReferencia, ofe.PorcentajeDescuento
    ), Ordenados AS (
        SELECT *, ROW_NUMBER() OVER (ORDER BY Afinidad DESC, Destacado DESC, IDProducto) AS PosAfinidad,
            ROW_NUMBER() OVER (ORDER BY CASE WHEN Afinidad = 0 THEN 0 ELSE 1 END, Destacado DESC, IDProducto) AS PosExploracion
        FROM Candidatos
    )
    SELECT IDProducto, IDCategoria, Nombre, Descripcion, ImagenUrl, Activo, Categoria,
        PrecioMinimo, PrecioMaximo, StockTotalDisponible, Destacado, Afinidad, PrecioOferta, PrecioReferencia, PorcentajeDescuento
    FROM Ordenados WHERE PosAfinidad <= 20 OR PosExploracion <= 10
    ORDER BY Afinidad DESC, Destacado DESC, IDProducto;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_Recomendaciones_BuscarCandidatos
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
    SELECT DISTINCT s.Alternativa FROM (VALUES
        (N'zapatos', N'tenis'), (N'zapatillas', N'tenis'), (N'tenis', N'zapatillas'), (N'calzado', N'zapatos'),
        (N'camisas', N'camisa'), (N'camisa', N'blusa'), (N'blusa', N'camisa'),
        (N'auriculares', N'audifonos'), (N'audifonos', N'auriculares'), (N'inalambricos', N'bluetooth'),
        (N'bolso', N'morral'), (N'morral', N'bolso'), (N'portatil', N'laptop'),
        (N'taza', N'vaso'), (N'cargador', N'carga'), (N'cafetera', N'prensa')
    ) s(Termino, Alternativa)
    WHERE EXISTS (SELECT 1 FROM @Terminos t WHERE t.Palabra = s.Termino COLLATE Latin1_General_CI_AI)
      AND NOT EXISTS (SELECT 1 FROM @Terminos t WHERE t.Palabra = s.Alternativa COLLATE Latin1_General_CI_AI);
    SELECT TOP (20) p.IDProducto, p.Nombre, p.Descripcion, p.ImagenUrl, p.Activo, p.IDCategoria,
        c.Nombre AS Categoria, MIN(v.Precio) AS PrecioMinimo, MAX(v.Precio) AS PrecioMaximo,
        SUM(disp.ExistenciaDisponible) AS StockTotalDisponible, ofe.PrecioOferta, ofe.PrecioReferencia, ofe.PorcentajeDescuento
    FROM dbo.Productos p INNER JOIN dbo.Categorias c ON c.IDCategoria = p.IDCategoria AND c.Activo = 1
    INNER JOIN dbo.Variantes v ON v.IDProducto = p.IDProducto AND v.Activo = 1
    CROSS APPLY dbo.FU_Inventario_ExistenciaDisponible(v.IDVariante) disp
    CROSS APPLY (SELECT COUNT(*) AS Coincidencias FROM @Terminos t
        WHERE CHARINDEX(t.Palabra, p.Nombre COLLATE Latin1_General_CI_AI) > 0
           OR CHARINDEX(t.Palabra, p.Descripcion COLLATE Latin1_General_CI_AI) > 0) terminos
    OUTER APPLY (
        SELECT TOP (1) vo.Precio AS PrecioOferta, vo.PrecioReferencia,
            CAST(ROUND((vo.PrecioReferencia - vo.Precio) * 100.0 / vo.PrecioReferencia, 0) AS INT) AS PorcentajeDescuento
        FROM dbo.Variantes vo CROSS APPLY dbo.FU_Inventario_ExistenciaDisponible(vo.IDVariante) vd
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
          OR EXISTS (SELECT 1 FROM dbo.Variantes normal WHERE normal.IDProducto = p.IDProducto AND normal.Activo = 1 AND normal.SKU LIKE @Patron))
    GROUP BY p.IDProducto, p.Nombre, p.Descripcion, p.ImagenUrl, p.Activo, p.IDCategoria, c.Nombre,
        terminos.Coincidencias, ofe.PrecioOferta, ofe.PrecioReferencia, ofe.PorcentajeDescuento
    ORDER BY terminos.Coincidencias DESC, p.IDProducto;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_Catalogo_ContextoRevision
    @Nombre NVARCHAR(150), @IDProducto INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP (20) IDCategoria, Nombre, Descripcion FROM dbo.Categorias WHERE Activo = 1 ORDER BY IDCategoria;
    SELECT TOP (20) p.IDProducto, p.Nombre, p.Descripcion, c.Nombre AS Categoria
    FROM dbo.Productos p INNER JOIN dbo.Categorias c ON c.IDCategoria = p.IDCategoria
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

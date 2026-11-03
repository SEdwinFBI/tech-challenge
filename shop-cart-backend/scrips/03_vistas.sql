USE ShopCartDB;
GO


CREATE OR ALTER VIEW VW_Dashboard_VentasPorCategoria AS
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
GROUP BY c.IDCategoria, c.Nombre;
GO

CREATE OR ALTER VIEW VW_Pedidos_Historial AS
SELECT 
    p.IDPedido,
    p.IDUsuario,
    u.Nombre AS Cliente,
    u.Correo,
    ep.Codigo AS Estado,
    ep.Nombre AS EstadoNombre,
    p.Subtotal,
    p.Descuento,
    p.CostoEnvio,
    p.MontoReembolsado,
    p.Total,
    (p.Total - p.MontoReembolsado) AS TotalNetoPagado,
    CAST(ROUND((p.Total - p.MontoReembolsado) / 1.12, 2) AS DECIMAL(12,2)) AS BaseImponibleSinIVA,
    CAST((p.Total - p.MontoReembolsado) - ROUND((p.Total - p.MontoReembolsado) / 1.12, 2) AS DECIMAL(12,2)) AS MontoIVA12,
    c.Codigo AS CodigoCupon,
    dep.Nombre AS Departamento,
    m.Nombre AS Municipio,
    d.Direccion AS DireccionExacta,
    p.FechaCreacion
FROM Pedidos p
INNER JOIN Usuarios u ON p.IDUsuario = u.IDUsuario
INNER JOIN EstadosPedido ep ON p.IDEstadoPedido = ep.IDEstadoPedido
INNER JOIN Direcciones d ON p.IDDireccion = d.IDDireccion
INNER JOIN Municipios m ON d.IDMunicipio = m.IDMunicipio
INNER JOIN Departamentos dep ON m.IDDepartamento = dep.IDDepartamento
LEFT JOIN Cupones c ON p.IDCupon = c.IDCupon;
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

USE ShopCartDB;
GO


CREATE OR ALTER FUNCTION FU_Inventario_ExistenciaDisponible (@IDVariante INT)
RETURNS TABLE WITH SCHEMABINDING AS
RETURN (
    SELECT 
        v.IDVariante,
        v.ExistenciaFisica,
        ISNULL(SUM(CASE WHEN er.Codigo = 'ACTIVA' AND r.FechaExpiracion > SYSDATETIME() THEN r.Cantidad ELSE 0 END), 0) AS UnidadesReservadas,
        v.ExistenciaFisica - ISNULL(SUM(CASE WHEN er.Codigo = 'ACTIVA' AND r.FechaExpiracion > SYSDATETIME() THEN r.Cantidad ELSE 0 END), 0) AS ExistenciaDisponible
    FROM dbo.Variantes v
    LEFT JOIN dbo.ReservasInventario r ON v.IDVariante = r.IDVariante
    LEFT JOIN dbo.EstadosReserva er ON r.IDEstadoReserva = er.IDEstadoReserva
    WHERE v.IDVariante = @IDVariante
    GROUP BY v.IDVariante, v.ExistenciaFisica
);
GO

CREATE OR ALTER FUNCTION FU_Cupones_CalculoDescuento (@IDCarrito INT, @IDUsuario INT)
RETURNS TABLE AS
RETURN (
    WITH CalculoBase AS (
        SELECT 
            c.IDCarrito,
            c.IDCupon,
            ISNULL(SUM(ci.Cantidad * v.Precio), 0) AS SubtotalCarrito,
            ISNULL(SUM(CASE WHEN cup.IDCategoriaAplica IS NULL OR p.IDCategoria = cup.IDCategoriaAplica 
                            THEN ci.Cantidad * v.Precio ELSE 0 END), 0) AS BaseDescuento,
            td.Codigo AS CodigoTipoDescuento,
            cup.Valor,
            cup.MontoMinimoCompra,
            cup.Activo,
            cup.FechaInicio,
            cup.FechaFin,
            cup.UsosActuales,
            cup.LimiteTotalUsos,
            cup.LimiteUsosPorCliente,
            (
                SELECT COUNT(1) 
                FROM Pedidos ped 
                INNER JOIN EstadosPedido ep ON ped.IDEstadoPedido = ep.IDEstadoPedido
                WHERE ped.IDCupon = cup.IDCupon 
                  AND ped.IDUsuario = @IDUsuario 
                  AND ep.Codigo <> 'CANCELADO'
            ) AS UsosDelCliente
        FROM Carritos c
        LEFT JOIN CarritoItems ci ON c.IDCarrito = ci.IDCarrito
        LEFT JOIN Variantes v ON ci.IDVariante = v.IDVariante
        LEFT JOIN Productos p ON v.IDProducto = p.IDProducto
        LEFT JOIN Cupones cup ON c.IDCupon = cup.IDCupon
        LEFT JOIN TipoDescuento td ON cup.IDTipoDescuento = td.IDTipoDescuento
        WHERE c.IDCarrito = @IDCarrito
        GROUP BY c.IDCarrito, c.IDCupon, cup.IDCupon, td.Codigo, cup.Valor, cup.MontoMinimoCompra, 
                 cup.Activo, cup.FechaInicio, cup.FechaFin, cup.UsosActuales, cup.LimiteTotalUsos, cup.LimiteUsosPorCliente
    )
    SELECT 
        SubtotalCarrito,
        CASE 
            WHEN IDCupon IS NULL OR Activo = 0 OR SYSDATETIME() NOT BETWEEN FechaInicio AND FechaFin THEN 0
            WHEN UsosActuales >= LimiteTotalUsos OR UsosDelCliente >= LimiteUsosPorCliente THEN 0
            WHEN SubtotalCarrito < MontoMinimoCompra OR BaseDescuento <= 0 THEN 0
            WHEN CodigoTipoDescuento = 'PORCENTAJE' THEN 
                CASE WHEN ROUND(BaseDescuento * (Valor / 100.0), 2) > SubtotalCarrito THEN SubtotalCarrito 
                     ELSE ROUND(BaseDescuento * (Valor / 100.0), 2) END
            ELSE 
                CASE WHEN Valor > BaseDescuento THEN BaseDescuento ELSE Valor END
        END AS DescuentoCalculado
    FROM CalculoBase
);
GO

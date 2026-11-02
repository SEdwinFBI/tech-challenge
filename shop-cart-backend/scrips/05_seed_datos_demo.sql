USE ShopCartDB;
GO

SET QUOTED_IDENTIFIER ON;
GO


CREATE OR ALTER PROCEDURE SP_Sistema_AplicarSeed
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

    -- Roles
    IF NOT EXISTS (SELECT 1 FROM Roles WHERE Codigo = 'CLIENTE')
        INSERT INTO Roles (Codigo, Nombre) VALUES ('CLIENTE', 'Cliente');
    IF NOT EXISTS (SELECT 1 FROM Roles WHERE Codigo = 'OPERADOR')
        INSERT INTO Roles (Codigo, Nombre) VALUES ('OPERADOR', 'Operador de Pedidos e Inventario');
    IF NOT EXISTS (SELECT 1 FROM Roles WHERE Codigo = 'ADMINISTRADOR')
        INSERT INTO Roles (Codigo, Nombre) VALUES ('ADMINISTRADOR', 'Administrador General');

    -- Tipos de descuento
    IF NOT EXISTS (SELECT 1 FROM TipoDescuento WHERE Codigo = 'PORCENTAJE')
        INSERT INTO TipoDescuento (Codigo, Descripcion) VALUES ('PORCENTAJE', 'Descuento porcentual sobre el subtotal');
    IF NOT EXISTS (SELECT 1 FROM TipoDescuento WHERE Codigo = 'MONTO_FIJO')
        INSERT INTO TipoDescuento (Codigo, Descripcion) VALUES ('MONTO_FIJO', 'Descuento en quetzales directo al subtotal');

    -- Tipos de movimiento de kardex
    IF NOT EXISTS (SELECT 1 FROM TipoMovimiento WHERE Codigo = 'ENTRADA_COMPRA')
        INSERT INTO TipoMovimiento (Codigo, Nombre, Naturaleza, Activo) VALUES ('ENTRADA_COMPRA', 'Entrada por compra o recepcion', 1, 1);
    IF NOT EXISTS (SELECT 1 FROM TipoMovimiento WHERE Codigo = 'SALIDA_VENTA')
        INSERT INTO TipoMovimiento (Codigo, Nombre, Naturaleza, Activo) VALUES ('SALIDA_VENTA', 'Salida por venta de pedido', -1, 1);
    IF NOT EXISTS (SELECT 1 FROM TipoMovimiento WHERE Codigo = 'AJUSTE_POSITIVO')
        INSERT INTO TipoMovimiento (Codigo, Nombre, Naturaleza, Activo) VALUES ('AJUSTE_POSITIVO', 'Ajuste manual de inventario positivo', 1, 1);
    IF NOT EXISTS (SELECT 1 FROM TipoMovimiento WHERE Codigo = 'AJUSTE_NEGATIVO')
        INSERT INTO TipoMovimiento (Codigo, Nombre, Naturaleza, Activo) VALUES ('AJUSTE_NEGATIVO', 'Ajuste manual de inventario negativo', -1, 1);
    IF NOT EXISTS (SELECT 1 FROM TipoMovimiento WHERE Codigo = 'DEVOLUCION_CLIENTE')
        INSERT INTO TipoMovimiento (Codigo, Nombre, Naturaleza, Activo) VALUES ('DEVOLUCION_CLIENTE', 'Reintegro por devolucion de cliente', 1, 1);

    -- Estados de reserva
    IF NOT EXISTS (SELECT 1 FROM EstadosReserva WHERE Codigo = 'ACTIVA')
        INSERT INTO EstadosReserva (Codigo, Nombre) VALUES ('ACTIVA', 'Reserva activa (15 min)');
    IF NOT EXISTS (SELECT 1 FROM EstadosReserva WHERE Codigo = 'CONSUMIDA')
        INSERT INTO EstadosReserva (Codigo, Nombre) VALUES ('CONSUMIDA', 'Reserva convertida en pedido');
    IF NOT EXISTS (SELECT 1 FROM EstadosReserva WHERE Codigo = 'EXPIRADA')
        INSERT INTO EstadosReserva (Codigo, Nombre) VALUES ('EXPIRADA', 'Reserva expirada por tiempo');
    IF NOT EXISTS (SELECT 1 FROM EstadosReserva WHERE Codigo = 'LIBERADA')
        INSERT INTO EstadosReserva (Codigo, Nombre) VALUES ('LIBERADA', 'Reserva liberada manualmente');

    -- Estados de pedido
    IF NOT EXISTS (SELECT 1 FROM EstadosPedido WHERE Codigo = 'PAGADO')
        INSERT INTO EstadosPedido (Codigo, Nombre, Descripcion, EsFinal) VALUES ('PAGADO', 'Pagado', 'Pedido pagado exitosamente tras checkout', 0);
    IF NOT EXISTS (SELECT 1 FROM EstadosPedido WHERE Codigo = 'EN_PREPARACION')
        INSERT INTO EstadosPedido (Codigo, Nombre, Descripcion, EsFinal) VALUES ('EN_PREPARACION', 'En Preparación', 'El operador está alistando los productos', 0);
    IF NOT EXISTS (SELECT 1 FROM EstadosPedido WHERE Codigo = 'DESPACHADO')
        INSERT INTO EstadosPedido (Codigo, Nombre, Descripcion, EsFinal) VALUES ('DESPACHADO', 'Despachado', 'Entregado a ruta de mensajería', 0);
    IF NOT EXISTS (SELECT 1 FROM EstadosPedido WHERE Codigo = 'ENTREGADO')
        INSERT INTO EstadosPedido (Codigo, Nombre, Descripcion, EsFinal) VALUES ('ENTREGADO', 'Entregado', 'Cliente recibió el pedido', 1);
    IF NOT EXISTS (SELECT 1 FROM EstadosPedido WHERE Codigo = 'CANCELADO')
        INSERT INTO EstadosPedido (Codigo, Nombre, Descripcion, EsFinal) VALUES ('CANCELADO', 'Cancelado', 'Cancelado antes del despacho, stock reintegrado', 1);
    IF NOT EXISTS (SELECT 1 FROM EstadosPedido WHERE Codigo = 'DEVUELTO_PARCIAL')
        INSERT INTO EstadosPedido (Codigo, Nombre, Descripcion, EsFinal) VALUES ('DEVUELTO_PARCIAL', 'Devuelto Parcial', 'Una o varias líneas fueron devueltas', 0);
    IF NOT EXISTS (SELECT 1 FROM EstadosPedido WHERE Codigo = 'DEVUELTO_TOTAL')
        INSERT INTO EstadosPedido (Codigo, Nombre, Descripcion, EsFinal) VALUES ('DEVUELTO_TOTAL', 'Devuelto Total', 'La totalidad del pedido fue reintegrada', 1);

    -- Transiciones de estado de pedido
    MERGE INTO TransicionesEstadoPedido AS Target
    USING (
        SELECT eo.IDEstadoPedido AS IDEstadoOrigen, ed.IDEstadoPedido AS IDEstadoDestino, v.PermiteCancelacion, v.PermiteDevolucion
        FROM (VALUES 
            ('PAGADO', 'EN_PREPARACION', 0, 0),
            ('PAGADO', 'CANCELADO', 1, 0),
            ('EN_PREPARACION', 'DESPACHADO', 0, 0),
            ('EN_PREPARACION', 'CANCELADO', 1, 0),
            ('DESPACHADO', 'ENTREGADO', 0, 0),
            ('ENTREGADO', 'DEVUELTO_PARCIAL', 0, 1),
            ('ENTREGADO', 'DEVUELTO_TOTAL', 0, 1),
            ('DEVUELTO_PARCIAL', 'DEVUELTO_TOTAL', 0, 1)
        ) AS v(CodOrigen, CodDestino, PermiteCancelacion, PermiteDevolucion)
        INNER JOIN EstadosPedido eo ON eo.Codigo = v.CodOrigen
        INNER JOIN EstadosPedido ed ON ed.Codigo = v.CodDestino
    ) AS Source
    ON Target.IDEstadoOrigen = Source.IDEstadoOrigen AND Target.IDEstadoDestino = Source.IDEstadoDestino
    WHEN MATCHED THEN
        UPDATE SET Target.PermiteCancelacion = Source.PermiteCancelacion, Target.PermiteDevolucion = Source.PermiteDevolucion
    WHEN NOT MATCHED THEN
        INSERT (IDEstadoOrigen, IDEstadoDestino, PermiteCancelacion, PermiteDevolucion) 
        VALUES (Source.IDEstadoOrigen, Source.IDEstadoDestino, Source.PermiteCancelacion, Source.PermiteDevolucion);

    -- Configuración del sistema
    MERGE INTO ConfiguracionSistema AS Target
    USING (VALUES 
        ('CARRITO_ABANDONADO_HORAS', '24', 'Horas de inactividad para considerar un carrito como abandonado'),
        ('DURACION_RESERVA_MINUTOS', '15', 'Minutos que dura apartada la existencia al iniciar el checkout'),
        ('IVA_PORCENTAJE', '12', 'Porcentaje de IVA incluido en los precios')
    ) AS Source (Clave, Valor, Descripcion)
    ON Target.Clave = Source.Clave
    WHEN MATCHED THEN
        UPDATE SET Target.Valor = Source.Valor, Target.Descripcion = Source.Descripcion
    WHEN NOT MATCHED THEN
        INSERT (Clave, Valor, Descripcion) VALUES (Source.Clave, Source.Valor, Source.Descripcion);

    -- Departamentos y municipios
    IF NOT EXISTS (SELECT 1 FROM Departamentos WHERE Nombre = 'Guatemala')
        INSERT INTO Departamentos (Nombre) VALUES ('Guatemala');
    IF NOT EXISTS (SELECT 1 FROM Departamentos WHERE Nombre = 'Quetzaltenango')
        INSERT INTO Departamentos (Nombre) VALUES ('Quetzaltenango');
    IF NOT EXISTS (SELECT 1 FROM Departamentos WHERE Nombre = 'Totonicapán')
        INSERT INTO Departamentos (Nombre) VALUES ('Totonicapán');
    IF NOT EXISTS (SELECT 1 FROM Departamentos WHERE Nombre = 'San Marcos')
        INSERT INTO Departamentos (Nombre) VALUES ('San Marcos');
    IF NOT EXISTS (SELECT 1 FROM Departamentos WHERE Nombre = 'Huehuetenango')
        INSERT INTO Departamentos (Nombre) VALUES ('Huehuetenango');
    IF NOT EXISTS (SELECT 1 FROM Departamentos WHERE Nombre = 'Sacatepéquez')
        INSERT INTO Departamentos (Nombre) VALUES ('Sacatepéquez');

    DECLARE @IDDeptoGuate INT = (SELECT IDDepartamento FROM Departamentos WHERE Nombre = 'Guatemala');
    DECLARE @IDDeptoXela INT = (SELECT IDDepartamento FROM Departamentos WHERE Nombre = 'Quetzaltenango');
    DECLARE @IDDeptoToto INT = (SELECT IDDepartamento FROM Departamentos WHERE Nombre = 'Totonicapán');
    DECLARE @IDDeptoSanMarcos INT = (SELECT IDDepartamento FROM Departamentos WHERE Nombre = 'San Marcos');
    DECLARE @IDDeptoHuehue INT = (SELECT IDDepartamento FROM Departamentos WHERE Nombre = 'Huehuetenango');
    DECLARE @IDDeptoSacat INT = (SELECT IDDepartamento FROM Departamentos WHERE Nombre = 'Sacatepéquez');

    IF @IDDeptoGuate IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM Municipios WHERE IDDepartamento = @IDDeptoGuate AND Nombre = 'Guatemala')
            INSERT INTO Municipios (IDDepartamento, Nombre) VALUES (@IDDeptoGuate, 'Guatemala');
        IF NOT EXISTS (SELECT 1 FROM Municipios WHERE IDDepartamento = @IDDeptoGuate AND Nombre = 'Mixco')
            INSERT INTO Municipios (IDDepartamento, Nombre) VALUES (@IDDeptoGuate, 'Mixco');
        IF NOT EXISTS (SELECT 1 FROM Municipios WHERE IDDepartamento = @IDDeptoGuate AND Nombre = 'Villa Nueva')
            INSERT INTO Municipios (IDDepartamento, Nombre) VALUES (@IDDeptoGuate, 'Villa Nueva');
        IF NOT EXISTS (SELECT 1 FROM Municipios WHERE IDDepartamento = @IDDeptoGuate AND Nombre = 'Santa Catarina Pinula')
            INSERT INTO Municipios (IDDepartamento, Nombre) VALUES (@IDDeptoGuate, 'Santa Catarina Pinula');
    END

    IF @IDDeptoXela IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM Municipios WHERE IDDepartamento = @IDDeptoXela AND Nombre = 'Quetzaltenango')
            INSERT INTO Municipios (IDDepartamento, Nombre) VALUES (@IDDeptoXela, 'Quetzaltenango');
        IF NOT EXISTS (SELECT 1 FROM Municipios WHERE IDDepartamento = @IDDeptoXela AND Nombre = 'Salcajá')
            INSERT INTO Municipios (IDDepartamento, Nombre) VALUES (@IDDeptoXela, 'Salcajá');
        IF NOT EXISTS (SELECT 1 FROM Municipios WHERE IDDepartamento = @IDDeptoXela AND Nombre = 'Olintepeque')
            INSERT INTO Municipios (IDDepartamento, Nombre) VALUES (@IDDeptoXela, 'Olintepeque');
        IF NOT EXISTS (SELECT 1 FROM Municipios WHERE IDDepartamento = @IDDeptoXela AND Nombre = 'La Esperanza')
            INSERT INTO Municipios (IDDepartamento, Nombre) VALUES (@IDDeptoXela, 'La Esperanza');
    END

    IF @IDDeptoToto IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM Municipios WHERE IDDepartamento = @IDDeptoToto AND Nombre = 'Totonicapán')
            INSERT INTO Municipios (IDDepartamento, Nombre) VALUES (@IDDeptoToto, 'Totonicapán');
        IF NOT EXISTS (SELECT 1 FROM Municipios WHERE IDDepartamento = @IDDeptoToto AND Nombre = 'San Cristóbal Totonicapán')
            INSERT INTO Municipios (IDDepartamento, Nombre) VALUES (@IDDeptoToto, 'San Cristóbal Totonicapán');
        IF NOT EXISTS (SELECT 1 FROM Municipios WHERE IDDepartamento = @IDDeptoToto AND Nombre = 'San Francisco El Alto')
            INSERT INTO Municipios (IDDepartamento, Nombre) VALUES (@IDDeptoToto, 'San Francisco El Alto');
    END

    IF @IDDeptoSanMarcos IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM Municipios WHERE IDDepartamento = @IDDeptoSanMarcos AND Nombre = 'San Marcos')
            INSERT INTO Municipios (IDDepartamento, Nombre) VALUES (@IDDeptoSanMarcos, 'San Marcos');
        IF NOT EXISTS (SELECT 1 FROM Municipios WHERE IDDepartamento = @IDDeptoSanMarcos AND Nombre = 'San Pedro Sacatepéquez')
            INSERT INTO Municipios (IDDepartamento, Nombre) VALUES (@IDDeptoSanMarcos, 'San Pedro Sacatepéquez');
    END

    IF @IDDeptoHuehue IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM Municipios WHERE IDDepartamento = @IDDeptoHuehue AND Nombre = 'Huehuetenango')
            INSERT INTO Municipios (IDDepartamento, Nombre) VALUES (@IDDeptoHuehue, 'Huehuetenango');
        IF NOT EXISTS (SELECT 1 FROM Municipios WHERE IDDepartamento = @IDDeptoHuehue AND Nombre = 'Chiantla')
            INSERT INTO Municipios (IDDepartamento, Nombre) VALUES (@IDDeptoHuehue, 'Chiantla');
    END

    IF @IDDeptoSacat IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM Municipios WHERE IDDepartamento = @IDDeptoSacat AND Nombre = 'Antigua Guatemala')
            INSERT INTO Municipios (IDDepartamento, Nombre) VALUES (@IDDeptoSacat, 'Antigua Guatemala');
        IF NOT EXISTS (SELECT 1 FROM Municipios WHERE IDDepartamento = @IDDeptoSacat AND Nombre = 'Ciudad Vieja')
            INSERT INTO Municipios (IDDepartamento, Nombre) VALUES (@IDDeptoSacat, 'Ciudad Vieja');
    END

    -- Tarifas de envío
    MERGE INTO TarifasEnvio AS Target
    USING (
        SELECT d.IDDepartamento, v.CostoEnvio, v.MontoMinimoGratis
        FROM (VALUES 
            ('Guatemala', 25.00, 400.00),
            ('Quetzaltenango', 35.00, 500.00),
            ('Totonicapán', 35.00, 500.00),
            ('San Marcos', 30.00, 350.00),
            ('Huehuetenango', 35.00, 400.00),
            ('Sacatepéquez', 30.00, 450.00)
        ) AS v(NombreDepto, CostoEnvio, MontoMinimoGratis)
        INNER JOIN Departamentos d ON d.Nombre = v.NombreDepto
    ) AS Source
    ON Target.IDDepartamento = Source.IDDepartamento
    WHEN MATCHED THEN
        UPDATE SET Target.CostoEnvio = Source.CostoEnvio, Target.MontoMinimoGratis = Source.MontoMinimoGratis
    WHEN NOT MATCHED THEN
        INSERT (IDDepartamento, CostoEnvio, MontoMinimoGratis) 
        VALUES (Source.IDDepartamento, Source.CostoEnvio, Source.MontoMinimoGratis);

    -- Usuarios de ejemplo
    DECLARE @IDRolAdmin INT = (SELECT IDRol FROM Roles WHERE Codigo = 'ADMINISTRADOR');
    DECLARE @IDRolOperador INT = (SELECT IDRol FROM Roles WHERE Codigo = 'OPERADOR');
    DECLARE @IDRolCliente INT = (SELECT IDRol FROM Roles WHERE Codigo = 'CLIENTE');
    DECLARE @DefaultHash NVARCHAR(255) = '$2b$10$8J/txcqvfHYm/vSdWm4/Xuxaxtjlpdcifj518DFbwbo6Fv9qJMVpa';

    -- 3 cuentas base obligatorias
    IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE Correo = 'admin@shopcart.gt')
        INSERT INTO Usuarios (IDRol, Correo, Password, Nombre, Activo) 
        VALUES (@IDRolAdmin, 'admin@shopcart.gt', @DefaultHash, 'J. Estuardo Del Valle (Admin)', 1);
    ELSE
        UPDATE Usuarios SET IDRol = @IDRolAdmin, Password = @DefaultHash, Nombre = 'J. Estuardo Del Valle (Admin)', Activo = 1 WHERE Correo = 'admin@shopcart.gt';

    IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE Correo = 'operador@shopcart.gt')
        INSERT INTO Usuarios (IDRol, Correo, Password, Nombre, Activo) 
        VALUES (@IDRolOperador, 'operador@shopcart.gt', @DefaultHash, 'Fco. Javier "Pancho" Barrios', 1);
    ELSE
        UPDATE Usuarios SET IDRol = @IDRolOperador, Password = @DefaultHash, Nombre = 'Fco. Javier "Pancho" Barrios', Activo = 1 WHERE Correo = 'operador@shopcart.gt';

    IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE Correo = 'cliente@shopcart.gt')
        INSERT INTO Usuarios (IDRol, Correo, Password, Nombre, Activo) 
        VALUES (@IDRolCliente, 'cliente@shopcart.gt', @DefaultHash, 'Alejandro "Alex" De León', 1);
    ELSE
        UPDATE Usuarios SET IDRol = @IDRolCliente, Password = @DefaultHash, Nombre = 'Alejandro "Alex" De León', Activo = 1 WHERE Correo = 'cliente@shopcart.gt';

    -- Operadores adicionales de bodega
    IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE Correo = 'brayan.bodega@outlook.com')
        INSERT INTO Usuarios (IDRol, Correo, Password, Nombre, Activo)
        VALUES (@IDRolOperador, 'brayan.bodega@outlook.com', @DefaultHash, 'Brayan Oswaldo Chanchavac', 1);

    IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE Correo = 'miriam.zapeta@gmail.com')
        INSERT INTO Usuarios (IDRol, Correo, Password, Nombre, Activo)
        VALUES (@IDRolOperador, 'miriam.zapeta@gmail.com', @DefaultHash, 'Miriam Leticia Zapeta Chojolán', 1);

    -- Clientes de ejemplo
    IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE Correo = 'cmorales94@gmail.com')
        INSERT INTO Usuarios (IDRol, Correo, Password, Nombre, Activo)
        VALUES (@IDRolCliente, 'cmorales94@gmail.com', @DefaultHash, 'christian morales', 1);

    IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE Correo = 'mafer.arq@gmail.com')
        INSERT INTO Usuarios (IDRol, Correo, Password, Nombre, Activo)
        VALUES (@IDRolCliente, 'mafer.arq@gmail.com', @DefaultHash, 'Ma. Fernanda Marroquín de Paz', 1);

    IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE Correo = 'lic.mazariegos@yahoo.com')
        INSERT INTO Usuarios (IDRol, Correo, Password, Nombre, Activo)
        VALUES (@IDRolCliente, 'lic.mazariegos@yahoo.com', @DefaultHash, 'Lic. Héctor Mazariegos Alvarado', 1);

    IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE Correo = 'luisacastillo91@hotmail.com')
        INSERT INTO Usuarios (IDRol, Correo, Password, Nombre, Activo)
        VALUES (@IDRolCliente, 'luisacastillo91@hotmail.com', @DefaultHash, 'luisa f. castillo', 1);

    IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE Correo = 'ing_xicara@gmail.com')
        INSERT INTO Usuarios (IDRol, Correo, Password, Nombre, Activo)
        VALUES (@IDRolCliente, 'ing_xicara@gmail.com', @DefaultHash, 'Ing. Carlos Xicará Batz', 1);

    IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE Correo = 'sofia.arriola@outlook.com')
        INSERT INTO Usuarios (IDRol, Correo, Password, Nombre, Activo)
        VALUES (@IDRolCliente, 'sofia.arriola@outlook.com', @DefaultHash, 'Sofía del Carmen Arriola Reyes', 1);

    IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE Correo = 'mendoza92@gmail.com')
        INSERT INTO Usuarios (IDRol, Correo, Password, Nombre, Activo)
        VALUES (@IDRolCliente, 'mendoza92@gmail.com', @DefaultHash, 'roberto mendez', 1);

    IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE Correo = 'clau_quinonez@hotmail.com')
        INSERT INTO Usuarios (IDRol, Correo, Password, Nombre, Activo)
        VALUES (@IDRolCliente, 'clau_quinonez@hotmail.com', @DefaultHash, 'Claudia Marcela Quiñónez Gálvez', 1);

    IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE Correo = 'j_rodas@gmail.com')
        INSERT INTO Usuarios (IDRol, Correo, Password, Nombre, Activo)
        VALUES (@IDRolCliente, 'j_rodas@gmail.com', @DefaultHash, 'J. Fernando Rodas Cifuentes', 1);

    IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE Correo = 'byron.morales@yahoo.es')
        INSERT INTO Usuarios (IDRol, Correo, Password, Nombre, Activo)
        VALUES (@IDRolCliente, 'byron.morales@yahoo.es', @DefaultHash, 'Byron "El Colocho" Morales Samayoa', 1);

    IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE Correo = 'lucyfuentes89@gmail.com')
        INSERT INTO Usuarios (IDRol, Correo, Password, Nombre, Activo)
        VALUES (@IDRolCliente, 'lucyfuentes89@gmail.com', @DefaultHash, 'Ana Lucía "Lucy" Fuentes Solares', 1);

    IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE Correo = 'diego_ceballos@gmail.com')
        INSERT INTO Usuarios (IDRol, Correo, Password, Nombre, Activo)
        VALUES (@IDRolCliente, 'diego_ceballos@gmail.com', @DefaultHash, 'Diego Alejandro Ceballos Estrada', 1);

    IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE Correo = 'karin.deleon@outlook.com')
        INSERT INTO Usuarios (IDRol, Correo, Password, Nombre, Activo)
        VALUES (@IDRolCliente, 'karin.deleon@outlook.com', @DefaultHash, 'Karin Iveth De León de la Roca', 1);

    -- Direcciones
    DECLARE @IDUserAdmin INT = (SELECT IDUsuario FROM Usuarios WHERE Correo = 'admin@shopcart.gt');
    DECLARE @IDUserOperador INT = (SELECT IDUsuario FROM Usuarios WHERE Correo = 'operador@shopcart.gt');
    DECLARE @IDUserAlex INT = (SELECT IDUsuario FROM Usuarios WHERE Correo = 'cliente@shopcart.gt');
    DECLARE @IDUserChristian INT = (SELECT IDUsuario FROM Usuarios WHERE Correo = 'cmorales94@gmail.com');
    DECLARE @IDUserMafer INT = (SELECT IDUsuario FROM Usuarios WHERE Correo = 'mafer.arq@gmail.com');
    DECLARE @IDUserMazariegos INT = (SELECT IDUsuario FROM Usuarios WHERE Correo = 'lic.mazariegos@yahoo.com');
    DECLARE @IDUserLuisa INT = (SELECT IDUsuario FROM Usuarios WHERE Correo = 'luisacastillo91@hotmail.com');
    DECLARE @IDUserXicara INT = (SELECT IDUsuario FROM Usuarios WHERE Correo = 'ing_xicara@gmail.com');
    DECLARE @IDUserSofia INT = (SELECT IDUsuario FROM Usuarios WHERE Correo = 'sofia.arriola@outlook.com');
    DECLARE @IDUserRoberto INT = (SELECT IDUsuario FROM Usuarios WHERE Correo = 'mendoza92@gmail.com');
    DECLARE @IDUserClaudia INT = (SELECT IDUsuario FROM Usuarios WHERE Correo = 'clau_quinonez@hotmail.com');
    DECLARE @IDUserRodas INT = (SELECT IDUsuario FROM Usuarios WHERE Correo = 'j_rodas@gmail.com');
    DECLARE @IDUserByron INT = (SELECT IDUsuario FROM Usuarios WHERE Correo = 'byron.morales@yahoo.es');
    DECLARE @IDUserLucy INT = (SELECT IDUsuario FROM Usuarios WHERE Correo = 'lucyfuentes89@gmail.com');
    DECLARE @IDUserDiego INT = (SELECT IDUsuario FROM Usuarios WHERE Correo = 'diego_ceballos@gmail.com');
    DECLARE @IDUserKarin INT = (SELECT IDUsuario FROM Usuarios WHERE Correo = 'karin.deleon@outlook.com');

    -- IDs de municipios
    DECLARE @MuniGuate INT = (SELECT IDMunicipio FROM Municipios WHERE IDDepartamento = @IDDeptoGuate AND Nombre = 'Guatemala');
    DECLARE @MuniMixco INT = (SELECT IDMunicipio FROM Municipios WHERE IDDepartamento = @IDDeptoGuate AND Nombre = 'Mixco');
    DECLARE @MuniVillaNueva INT = (SELECT IDMunicipio FROM Municipios WHERE IDDepartamento = @IDDeptoGuate AND Nombre = 'Villa Nueva');
    DECLARE @MuniSantaCatarina INT = (SELECT IDMunicipio FROM Municipios WHERE IDDepartamento = @IDDeptoGuate AND Nombre = 'Santa Catarina Pinula');
    DECLARE @MuniXela INT = (SELECT IDMunicipio FROM Municipios WHERE IDDepartamento = @IDDeptoXela AND Nombre = 'Quetzaltenango');
    DECLARE @MuniSalcaja INT = (SELECT IDMunicipio FROM Municipios WHERE IDDepartamento = @IDDeptoXela AND Nombre = 'Salcajá');
    DECLARE @MuniSanFrancisco INT = (SELECT IDMunicipio FROM Municipios WHERE IDDepartamento = @IDDeptoToto AND Nombre = 'San Francisco El Alto');
    DECLARE @MuniSanPedroSM INT = (SELECT IDMunicipio FROM Municipios WHERE IDDepartamento = @IDDeptoSanMarcos AND Nombre = 'San Pedro Sacatepéquez');
    DECLARE @MuniHuehue INT = (SELECT IDMunicipio FROM Municipios WHERE IDDepartamento = @IDDeptoHuehue AND Nombre = 'Huehuetenango');
    DECLARE @MuniAntigua INT = (SELECT IDMunicipio FROM Municipios WHERE IDDepartamento = @IDDeptoSacat AND Nombre = 'Antigua Guatemala');
    DECLARE @MuniCiudadVieja INT = (SELECT IDMunicipio FROM Municipios WHERE IDDepartamento = @IDDeptoSacat AND Nombre = 'Ciudad Vieja');

    -- Insertar direcciones si no existen
    IF @IDUserAlex IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Direcciones WHERE IDUsuario = @IDUserAlex AND Etiqueta = 'Apartamento')
        INSERT INTO Direcciones (IDUsuario, IDMunicipio, Etiqueta, Direccion, Telefono, Activo)
        VALUES (@IDUserAlex, @MuniGuate, 'Apartamento', '12 Calle 4-55 Zona 10, Edificio Plaza 10, nivel 4 depto 402', '50255551234', 1);

    IF @IDUserChristian IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Direcciones WHERE IDUsuario = @IDUserChristian AND Etiqueta = 'Casa')
        INSERT INTO Direcciones (IDUsuario, IDMunicipio, Etiqueta, Direccion, Telefono, Activo)
        VALUES (@IDUserChristian, @MuniGuate, 'Casa', '4ta calle 8-12 zona 1, portón café a la par de la panadería, tocar fuerte el timbre porque a veces no suena', '+502 5512-3490', 1);

    IF @IDUserMafer IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Direcciones WHERE IDUsuario = @IDUserMafer AND Etiqueta = 'Oficina')
        INSERT INTO Direcciones (IDUsuario, IDMunicipio, Etiqueta, Direccion, Telefono, Activo)
        VALUES (@IDUserMafer, @MuniGuate, 'Oficina', '3a av 12-40 z. 10 edif torre azul of. 402 preguntar por mafer', '41208933', 1);

    IF @IDUserMazariegos IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Direcciones WHERE IDUsuario = @IDUserMazariegos AND Etiqueta = 'Bufete')
        INSERT INTO Direcciones (IDUsuario, IDMunicipio, Etiqueta, Direccion, Telefono, Activo)
        VALUES (@IDUserMazariegos, @MuniXela, 'Bufete', '12 avenida 5-30 zona 1, por el parque central frente a la despensa, llamar antes de llegar', '5890-4411', 1);

    IF @IDUserLuisa IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Direcciones WHERE IDUsuario = @IDUserLuisa AND Etiqueta = 'Casa')
        INSERT INTO Direcciones (IDUsuario, IDMunicipio, Etiqueta, Direccion, Telefono, Activo)
        VALUES (@IDUserLuisa, @MuniMixco, 'Casa', 'Condominio Las Luces casa 14, dejar con el guardia de la garita si no salgo', '3011 4421', 1);

    IF @IDUserXicara IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Direcciones WHERE IDUsuario = @IDUserXicara AND Etiqueta = 'Taller')
        INSERT INTO Direcciones (IDUsuario, IDMunicipio, Etiqueta, Direccion, Telefono, Activo)
        VALUES (@IDUserXicara, @MuniSanFrancisco, 'Taller', 'Barrio San Bartolo frente al salón municipal, preguntar por Don Pancho en la abarrotería', '5012-3344', 1);

    IF @IDUserSofia IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Direcciones WHERE IDUsuario = @IDUserSofia AND Etiqueta = 'Casa Colonial')
        INSERT INTO Direcciones (IDUsuario, IDMunicipio, Etiqueta, Direccion, Telefono, Activo)
        VALUES (@IDUserSofia, @MuniAntigua, 'Casa Colonial', '7ma calle poniente #18, entre calle de los pasos y alameda, timbre de bronce', '31245590', 1);

    IF @IDUserRoberto IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Direcciones WHERE IDUsuario = @IDUserRoberto AND Etiqueta = 'Local')
        INSERT INTO Direcciones (IDUsuario, IDMunicipio, Etiqueta, Direccion, Telefono, Activo)
        VALUES (@IDUserRoberto, @MuniSanPedroSM, 'Local', '5a calle 3-45 zona 1, media cuadra antes del mercado central, dejar en la recepción de la farmacia', '4491-0021', 1);

    IF @IDUserClaudia IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Direcciones WHERE IDUsuario = @IDUserClaudia AND Etiqueta = 'Casa')
        INSERT INTO Direcciones (IDUsuario, IDMunicipio, Etiqueta, Direccion, Telefono, Activo)
        VALUES (@IDUserClaudia, @MuniSantaCatarina, 'Casa', 'Carretera a El Salvador km 14.5, Residenciales Los Arcos casa 23B, tocar bocina al llegar', '+502 4789 1230', 1);

    IF @IDUserRodas IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Direcciones WHERE IDUsuario = @IDUserRodas AND Etiqueta = 'Casa Familiar')
        INSERT INTO Direcciones (IDUsuario, IDMunicipio, Etiqueta, Direccion, Telefono, Activo)
        VALUES (@IDUserRodas, @MuniHuehue, 'Casa Familiar', '6a avenida 4-22 zona 1, a la vuelta del parque de los niños, portón rojo con zaguán', '+502 5901-2244', 1);

    IF @IDUserLucy IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Direcciones WHERE IDUsuario = @IDUserLucy AND Etiqueta = 'Casa')
        INSERT INTO Direcciones (IDUsuario, IDMunicipio, Etiqueta, Direccion, Telefono, Activo)
        VALUES (@IDUserLucy, @MuniMixco, 'Casa', 'San Cristóbal sector B-1 lote 8, enfrente del parque infantil, portón blanco', '5201-9980', 1);

    IF @IDUserByron IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Direcciones WHERE IDUsuario = @IDUserByron AND Etiqueta = 'Casa')
        INSERT INTO Direcciones (IDUsuario, IDMunicipio, Etiqueta, Direccion, Telefono, Activo)
        VALUES (@IDUserByron, @MuniSalcaja, 'Casa', 'Barrio San Jacinto 2a calle 3-15, a media cuadra de la iglesia, casa de dos niveles color verde', '5501 8832', 1);

    IF @IDUserDiego IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Direcciones WHERE IDUsuario = @IDUserDiego AND Etiqueta = 'Casa')
        INSERT INTO Direcciones (IDUsuario, IDMunicipio, Etiqueta, Direccion, Telefono, Activo)
        VALUES (@IDUserDiego, @MuniVillaNueva, 'Casa', '3a calle 6-50 zona 1 Villa Nueva, portón gris corredizo', '4233-1189', 1);

    IF @IDUserKarin IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Direcciones WHERE IDUsuario = @IDUserKarin AND Etiqueta = 'Casa de Campo')
        INSERT INTO Direcciones (IDUsuario, IDMunicipio, Etiqueta, Direccion, Telefono, Activo)
        VALUES (@IDUserKarin, @MuniCiudadVieja, 'Casa de Campo', 'Calle Real a Ciudad Vieja lote 12, portón de madera rústica', '5788 9012', 1);

    -- Categorías
    IF NOT EXISTS (SELECT 1 FROM Categorias WHERE Nombre = 'Calzado')
        INSERT INTO Categorias (Nombre, Descripcion, Activo) VALUES ('Calzado', 'Zapatos formales, casuales y deportivos hechos para durar', 1);

    IF NOT EXISTS (SELECT 1 FROM Categorias WHERE Nombre = 'Camisas y Blusas')
        INSERT INTO Categorias (Nombre, Descripcion, Activo) VALUES ('Camisas y Blusas', 'Prendas superiores frescas de vestir y casuales para dama y caballero', 1);

    IF NOT EXISTS (SELECT 1 FROM Categorias WHERE Nombre = 'Accesorios')
        INSERT INTO Categorias (Nombre, Descripcion, Activo) VALUES ('Accesorios', 'Cinturones, billeteras de cuero y complementos de uso diario', 1);

    IF NOT EXISTS (SELECT 1 FROM Categorias WHERE Nombre = 'Tecnología y Audio')
        INSERT INTO Categorias (Nombre, Descripcion, Activo) VALUES ('Tecnología y Audio', 'Audífonos bluetooth, bocinas portátiles, cables y cargadores probados', 1);

    IF NOT EXISTS (SELECT 1 FROM Categorias WHERE Nombre = 'Hogar y Cafetería')
        INSERT INTO Categorias (Nombre, Descripcion, Activo) VALUES ('Hogar y Cafetería', 'Café especial de origen en grano y molido, cafeteras y prensas', 1);

    IF NOT EXISTS (SELECT 1 FROM Categorias WHERE Nombre = 'Mochilas y Viaje')
        INSERT INTO Categorias (Nombre, Descripcion, Activo) VALUES ('Mochilas y Viaje', 'Mochilas resistentes para laptop, morrales de lona encerada y maletines', 1);

    DECLARE @CatCalzado INT = (SELECT IDCategoria FROM Categorias WHERE Nombre = 'Calzado');
    DECLARE @CatCamisas INT = (SELECT IDCategoria FROM Categorias WHERE Nombre = 'Camisas y Blusas');
    DECLARE @CatAccesorios INT = (SELECT IDCategoria FROM Categorias WHERE Nombre = 'Accesorios');
    DECLARE @CatTecnologia INT = (SELECT IDCategoria FROM Categorias WHERE Nombre = 'Tecnología y Audio');
    DECLARE @CatHogar INT = (SELECT IDCategoria FROM Categorias WHERE Nombre = 'Hogar y Cafetería');
    DECLARE @CatMochilas INT = (SELECT IDCategoria FROM Categorias WHERE Nombre = 'Mochilas y Viaje');

    -- Productos
    IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = 'Botín de Cuero Artesanal')
        INSERT INTO Productos (IDCategoria, Nombre, Descripcion, ImagenUrl, Activo)
        VALUES (@CatCalzado, 'Botín de Cuero Artesanal', 'Botín 100% cuero vacuno curtido en Pastores, Sacatepéquez. Ojo: la horma viene un poco reducida, si tenés el pie ancho pedí media talla más. La suela es de hule cocida, aguanta buen trote en empedrado.', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', 1);
    ELSE
        UPDATE Productos SET Descripcion = 'Botín 100% cuero vacuno curtido en Pastores, Sacatepéquez. Ojo: la horma viene un poco reducida, si tenés el pie ancho pedí media talla más. La suela es de hule cocida, aguanta buen trote en empedrado.' WHERE Nombre = 'Botín de Cuero Artesanal';

    IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = 'Camisa Oxford Clásica')
        INSERT INTO Productos (IDCategoria, Nombre, Descripcion, ImagenUrl, Activo)
        VALUES (@CatCamisas, 'Camisa Oxford Clásica', 'Camisa de algodón con tramado oxford. Corte regular fit clásico. Lavar a mano con agua fría porque si la metés a secadora caliente encoge casi media talla. Viene con repuesto de dos botones en la etiqueta interior.', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800', 1);
    ELSE
        UPDATE Productos SET Descripcion = 'Camisa de algodón con tramado oxford. Corte regular fit clásico. Lavar a mano con agua fría porque si la metés a secadora caliente encoge casi media talla. Viene con repuesto de dos botones en la etiqueta interior.' WHERE Nombre = 'Camisa Oxford Clásica';

    IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = 'Tenis Urbanos de Lona y Cuero')
        INSERT INTO Productos (IDCategoria, Nombre, Descripcion, ImagenUrl, Activo)
        VALUES (@CatCalzado, 'Tenis Urbanos de Lona y Cuero', 'Tenis para el día a día con plantilla acolchada de espuma viscoelástica. La suela viene pegada y vulcanizada. Aviso: la lona no es impermeable, si llueve fuerte sí se pasa el agua.', 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800', 1);

    IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = 'Blusa Típica con Bordado de Cantel')
        INSERT INTO Productos (IDCategoria, Nombre, Descripcion, ImagenUrl, Activo)
        VALUES (@CatCamisas, 'Blusa Típica con Bordado de Cantel', 'Blusa de manta 100% algodón tejida en telar de pedal en Quetzaltenango con cuello bordado a mano. Cada pieza varía un poco en los tonos del hilo. No usar cloro jamás para no desteñir el bordado.', 'https://images.unsplash.com/photo-1564257631407-4deb129f044b?w=800', 1);

    IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = 'Cinturón Reversible de Cuero Genuino')
        INSERT INTO Productos (IDCategoria, Nombre, Descripcion, ImagenUrl, Activo)
        VALUES (@CatAccesorios, 'Cinturón Reversible de Cuero Genuino', 'Cinturón doble faz (café de un lado y negro del otro) con hebilla giratoria metálica. Cuero vacuno grueso de 3.5 cm de ancho. Si te queda muy largo, la hebilla se desatornilla fácil con un desarmador plano para cortarlo a tu medida.', 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800', 1);

    IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = 'Billetera Bifold con Bloqueo RFID')
        INSERT INTO Productos (IDCategoria, Nombre, Descripcion, ImagenUrl, Activo)
        VALUES (@CatAccesorios, 'Billetera Bifold con Bloqueo RFID', 'Billetera de cuero curtido al aceite, entra cabal el DPI, licencia y hasta 8 tarjetas sin abultar el pantalón. Tiene forro metálico antirrobo RFID. Al principio se siente un poco dura pero con dos semanas de uso afloja y se amolda.', 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800', 1);

    IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = 'Audífonos Inalámbricos True Wireless Sport')
        INSERT INTO Productos (IDCategoria, Nombre, Descripcion, ImagenUrl, Activo)
        VALUES (@CatTecnologia, 'Audífonos Inalámbricos True Wireless Sport', 'Audífonos bluetooth 5.3 con resistencia a sudor IPX5 y estuche de carga USB-C. La batería le dura unas 5 a 6 horas continuas si tenés el volumen alto (no las 10 que dice la caja). Trae 3 pares de gomitas de repuesto para ajustarse a tu oído.', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800', 1);

    IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = 'Bocina Portátil Resistente al Agua IPX6')
        INSERT INTO Productos (IDCategoria, Nombre, Descripcion, ImagenUrl, Activo)
        VALUES (@CatTecnologia, 'Bocina Portátil Resistente al Agua IPX6', 'Bocina compacta de 15W con sonido claro y buen bajo para su tamaño. Ojo: no incluye el cubo cargador de pared, solo viene el cable tipo C en la caja. Aguanta salpicaduras de lluvia o piscina, pero no es sumergible.', 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800', 1);

    IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = 'Café Especial de Origen Huehuetenango')
        INSERT INTO Productos (IDCategoria, Nombre, Descripcion, ImagenUrl, Activo)
        VALUES (@CatHogar, 'Café Especial de Origen Huehuetenango', 'Café de estricta altura (1,650 msnm) cosechado en la sierra de los Cuchumatanes. Tueste medio con notas achocolatadas y acidez cítrica brillante. Por defecto viene en grano entero para preservar el aroma; si lo querés molido ponelo en las notas aclarando para qué método.', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800', 1);

    IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = 'Prensa Francesa de Vidrio Borosilicato 800ml')
        INSERT INTO Productos (IDCategoria, Nombre, Descripcion, ImagenUrl, Activo)
        VALUES (@CatHogar, 'Prensa Francesa de Vidrio Borosilicato 800ml', 'Cafetera de émbolo de vidrio resistente al choque térmico con filtro de acero inoxidable 304. Rinde unas 3 tazas de café. Importante: lavar el émbolo con esponja suave para no doblar la orilla de la malla metálica.', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800', 1);

    IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = 'Mochila Ejecutiva Antirrobo para Laptop 15.6"')
        INSERT INTO Productos (IDCategoria, Nombre, Descripcion, ImagenUrl, Activo)
        VALUES (@CatMochilas, 'Mochila Ejecutiva Antirrobo para Laptop 15.6"', 'Mochila de tela impermeable con puerto de carga USB exterior (requiere powerbank adentro, no incluido). Cremalleras ocultas pegadas a la espalda para evitar aperturas en el Transmetro o en aglomeraciones.', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800', 1);

    IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = 'Morral Casual de Lona y Cuero Vintage')
        INSERT INTO Productos (IDCategoria, Nombre, Descripcion, ImagenUrl, Activo)
        VALUES (@CatMochilas, 'Morral Casual de Lona y Cuero Vintage', 'Morral confeccionado en lona encerada gruesa de 16oz y detalles en cuero vacuno con forro de tela a rayas. Aguanta cuadernos, tablet y termo de agua. Al inicio el encerado huele un poco fuerte a cera natural; se le quita ventilándolo dos días.', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800', 1);

    DECLARE @IDP_Botin INT = (SELECT IDProducto FROM Productos WHERE Nombre = 'Botín de Cuero Artesanal');
    DECLARE @IDP_Camisa INT = (SELECT IDProducto FROM Productos WHERE Nombre = 'Camisa Oxford Clásica');
    DECLARE @IDP_Tenis INT = (SELECT IDProducto FROM Productos WHERE Nombre = 'Tenis Urbanos de Lona y Cuero');
    DECLARE @IDP_Blusa INT = (SELECT IDProducto FROM Productos WHERE Nombre = 'Blusa Típica con Bordado de Cantel');
    DECLARE @IDP_Cinturon INT = (SELECT IDProducto FROM Productos WHERE Nombre = 'Cinturón Reversible de Cuero Genuino');
    DECLARE @IDP_Billetera INT = (SELECT IDProducto FROM Productos WHERE Nombre = 'Billetera Bifold con Bloqueo RFID');
    DECLARE @IDP_Audifonos INT = (SELECT IDProducto FROM Productos WHERE Nombre = 'Audífonos Inalámbricos True Wireless Sport');
    DECLARE @IDP_Bocina INT = (SELECT IDProducto FROM Productos WHERE Nombre = 'Bocina Portátil Resistente al Agua IPX6');
    DECLARE @IDP_Cafe INT = (SELECT IDProducto FROM Productos WHERE Nombre = 'Café Especial de Origen Huehuetenango');
    DECLARE @IDP_Prensa INT = (SELECT IDProducto FROM Productos WHERE Nombre = 'Prensa Francesa de Vidrio Borosilicato 800ml');
    DECLARE @IDP_Mochila INT = (SELECT IDProducto FROM Productos WHERE Nombre = 'Mochila Ejecutiva Antirrobo para Laptop 15.6"');
    DECLARE @IDP_Morral INT = (SELECT IDProducto FROM Productos WHERE Nombre = 'Morral Casual de Lona y Cuero Vintage');

    -- Variantes y existencias
    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'BOT-CUE-40-CAF')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Botin, 'BOT-CUE-40-CAF', '40', 'Café Caramelo', 'Par en Caja', 650.00, 10, 1);
    ELSE
        UPDATE Variantes SET Precio = 650.00, ExistenciaFisica = 10 WHERE SKU = 'BOT-CUE-40-CAF';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'BOT-CUE-42-NEG')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Botin, 'BOT-CUE-42-NEG', '42', 'Negro Mate', 'Par en Caja', 650.00, 4, 1);
    ELSE
        UPDATE Variantes SET Precio = 650.00, ExistenciaFisica = 4 WHERE SKU = 'BOT-CUE-42-NEG';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'BOT-CUE-41-CAF')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Botin, 'BOT-CUE-41-CAF', '41', 'Café Caramelo', 'Par en Caja', 650.00, 8, 1);
    ELSE
        UPDATE Variantes SET Precio = 650.00, ExistenciaFisica = 8 WHERE SKU = 'BOT-CUE-41-CAF';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'BOT-CUE-39-MIE')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Botin, 'BOT-CUE-39-MIE', '39', 'Miel Encerado', 'Par en Caja', 675.00, 6, 1);
    ELSE
        UPDATE Variantes SET Precio = 675.00, ExistenciaFisica = 6 WHERE SKU = 'BOT-CUE-39-MIE';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'CAM-OXF-M-AZU')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Camisa, 'CAM-OXF-M-AZU', 'M', 'Azul Celeste', 'Unidad', 280.00, 15, 1);
    ELSE
        UPDATE Variantes SET Precio = 280.00, ExistenciaFisica = 15 WHERE SKU = 'CAM-OXF-M-AZU';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'CAM-OXF-L-BLA')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Camisa, 'CAM-OXF-L-BLA', 'L', 'Blanco Hueso', 'Unidad', 280.00, 12, 1);
    ELSE
        UPDATE Variantes SET Precio = 280.00, ExistenciaFisica = 12 WHERE SKU = 'CAM-OXF-L-BLA';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'CAM-OXF-S-ROS')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Camisa, 'CAM-OXF-S-ROS', 'S', 'Rosa Pastel', 'Unidad', 280.00, 7, 1);
    ELSE
        UPDATE Variantes SET Precio = 280.00, ExistenciaFisica = 7 WHERE SKU = 'CAM-OXF-S-ROS';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'CAM-OXF-XL-AZU')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Camisa, 'CAM-OXF-XL-AZU', 'XL', 'Azul Celeste', 'Unidad', 295.00, 9, 1);
    ELSE
        UPDATE Variantes SET Precio = 295.00, ExistenciaFisica = 9 WHERE SKU = 'CAM-OXF-XL-AZU';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'TEN-URB-41-GRI')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Tenis, 'TEN-URB-41-GRI', '41', 'Gris Asfalto', 'Par en Caja', 420.00, 14, 1);
    ELSE
        UPDATE Variantes SET Precio = 420.00, ExistenciaFisica = 14 WHERE SKU = 'TEN-URB-41-GRI';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'TEN-URB-42-GRI')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Tenis, 'TEN-URB-42-GRI', '42', 'Gris Asfalto', 'Par en Caja', 420.00, 9, 1);
    ELSE
        UPDATE Variantes SET Precio = 420.00, ExistenciaFisica = 9 WHERE SKU = 'TEN-URB-42-GRI';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'TEN-URB-40-AZU')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Tenis, 'TEN-URB-40-AZU', '40', 'Azul Marino', 'Par en Caja', 420.00, 11, 1);
    ELSE
        UPDATE Variantes SET Precio = 420.00, ExistenciaFisica = 11 WHERE SKU = 'TEN-URB-40-AZU';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'TEN-URB-43-NEG')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Tenis, 'TEN-URB-43-NEG', '43', 'Negro Carbón', 'Par en Caja', 435.00, 5, 1);
    ELSE
        UPDATE Variantes SET Precio = 435.00, ExistenciaFisica = 5 WHERE SKU = 'TEN-URB-43-NEG';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'BLU-CAN-S-BLA')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Blusa, 'BLU-CAN-S-BLA', 'S', 'Blanco Bordado', 'Unidad', 320.00, 8, 1);
    ELSE
        UPDATE Variantes SET Precio = 320.00, ExistenciaFisica = 8 WHERE SKU = 'BLU-CAN-S-BLA';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'BLU-CAN-M-BLA')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Blusa, 'BLU-CAN-M-BLA', 'M', 'Blanco Bordado', 'Unidad', 320.00, 12, 1);
    ELSE
        UPDATE Variantes SET Precio = 320.00, ExistenciaFisica = 12 WHERE SKU = 'BLU-CAN-M-BLA';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'BLU-CAN-L-IND')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Blusa, 'BLU-CAN-L-IND', 'L', 'Azul Índigo Bordado', 'Unidad', 340.00, 6, 1);
    ELSE
        UPDATE Variantes SET Precio = 340.00, ExistenciaFisica = 6 WHERE SKU = 'BLU-CAN-L-IND';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'CIN-REV-34-BIC')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Cinturon, 'CIN-REV-34-BIC', '34', 'Negro/Café Reversible', 'Unidad', 195.00, 18, 1);
    ELSE
        UPDATE Variantes SET Precio = 195.00, ExistenciaFisica = 18 WHERE SKU = 'CIN-REV-34-BIC';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'CIN-REV-36-BIC')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Cinturon, 'CIN-REV-36-BIC', '36', 'Negro/Café Reversible', 'Unidad', 195.00, 15, 1);
    ELSE
        UPDATE Variantes SET Precio = 195.00, ExistenciaFisica = 15 WHERE SKU = 'CIN-REV-36-BIC';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'CIN-REV-38-BIC')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Cinturon, 'CIN-REV-38-BIC', '38', 'Negro/Café Reversible', 'Unidad', 195.00, 10, 1);
    ELSE
        UPDATE Variantes SET Precio = 195.00, ExistenciaFisica = 10 WHERE SKU = 'CIN-REV-38-BIC';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'BIL-RFID-CAF')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Billetera, 'BIL-RFID-CAF', 'Estándar', 'Café Tabaco', 'Caja Regalo', 175.00, 22, 1);
    ELSE
        UPDATE Variantes SET Precio = 175.00, ExistenciaFisica = 22 WHERE SKU = 'BIL-RFID-CAF';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'BIL-RFID-NEG')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Billetera, 'BIL-RFID-NEG', 'Estándar', 'Negro Mate', 'Caja Regalo', 175.00, 16, 1);
    ELSE
        UPDATE Variantes SET Precio = 175.00, ExistenciaFisica = 16 WHERE SKU = 'BIL-RFID-NEG';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'AUD-TWS-NEG')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Audifonos, 'AUD-TWS-NEG', 'Universal', 'Negro Mate', 'Caja Sellada', 345.00, 20, 1);
    ELSE
        UPDATE Variantes SET Precio = 345.00, ExistenciaFisica = 20 WHERE SKU = 'AUD-TWS-NEG';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'AUD-TWS-BLA')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Audifonos, 'AUD-TWS-BLA', 'Universal', 'Blanco Glaciar', 'Caja Sellada', 345.00, 14, 1);
    ELSE
        UPDATE Variantes SET Precio = 345.00, ExistenciaFisica = 14 WHERE SKU = 'AUD-TWS-BLA';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'BOC-WAT-AZU')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Bocina, 'BOC-WAT-AZU', 'Compacta', 'Azul Petróleo', 'Caja', 290.00, 12, 1);
    ELSE
        UPDATE Variantes SET Precio = 290.00, ExistenciaFisica = 12 WHERE SKU = 'BOC-WAT-AZU';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'BOC-WAT-NEG')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Bocina, 'BOC-WAT-NEG', 'Compacta', 'Negro Camuflaje', 'Caja', 290.00, 15, 1);
    ELSE
        UPDATE Variantes SET Precio = 290.00, ExistenciaFisica = 15 WHERE SKU = 'BOC-WAT-NEG';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'CAF-HUE-GRA-1LB')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Cafe, 'CAF-HUE-GRA-1LB', '1 Libra', 'Grano Entero', 'Bolsa con Válvula', 65.00, 35, 1);
    ELSE
        UPDATE Variantes SET Precio = 65.00, ExistenciaFisica = 35 WHERE SKU = 'CAF-HUE-GRA-1LB';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'CAF-HUE-GRA-2LB')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Cafe, 'CAF-HUE-GRA-2LB', '2 Libras', 'Grano Entero', 'Bolsa con Válvula', 120.00, 20, 1);
    ELSE
        UPDATE Variantes SET Precio = 120.00, ExistenciaFisica = 20 WHERE SKU = 'CAF-HUE-GRA-2LB';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'CAF-HUE-MOL-1LB')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Cafe, 'CAF-HUE-MOL-1LB', '1 Libra', 'Molido Medio', 'Bolsa con Válvula', 65.00, 25, 1);
    ELSE
        UPDATE Variantes SET Precio = 65.00, ExistenciaFisica = 25 WHERE SKU = 'CAF-HUE-MOL-1LB';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'PRE-FRA-800-INO')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Prensa, 'PRE-FRA-800-INO', '800 ml', 'Acero Inoxidable', 'Caja', 185.00, 18, 1);
    ELSE
        UPDATE Variantes SET Precio = 185.00, ExistenciaFisica = 18 WHERE SKU = 'PRE-FRA-800-INO';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'PRE-FRA-800-NEG')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Prensa, 'PRE-FRA-800-NEG', '800 ml', 'Negro Satinado', 'Caja', 195.00, 10, 1);
    ELSE
        UPDATE Variantes SET Precio = 195.00, ExistenciaFisica = 10 WHERE SKU = 'PRE-FRA-800-NEG';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'MOC-EJE-GRI')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Mochila, 'MOC-EJE-GRI', '15.6 Pulgadas', 'Gris Oxford', 'Unidad con Funda', 380.00, 16, 1);
    ELSE
        UPDATE Variantes SET Precio = 380.00, ExistenciaFisica = 16 WHERE SKU = 'MOC-EJE-GRI';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'MOC-EJE-NEG')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Mochila, 'MOC-EJE-NEG', '15.6 Pulgadas', 'Negro Azabache', 'Unidad con Funda', 380.00, 12, 1);
    ELSE
        UPDATE Variantes SET Precio = 380.00, ExistenciaFisica = 12 WHERE SKU = 'MOC-EJE-NEG';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'MOR-LON-VER')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Morral, 'MOR-LON-VER', 'Mediano (14L)', 'Verde Militar', 'Unidad', 310.00, 14, 1);
    ELSE
        UPDATE Variantes SET Precio = 310.00, ExistenciaFisica = 14 WHERE SKU = 'MOR-LON-VER';

    IF NOT EXISTS (SELECT 1 FROM Variantes WHERE SKU = 'MOR-LON-KHA')
        INSERT INTO Variantes (IDProducto, SKU, Talla, Color, Presentacion, Precio, ExistenciaFisica, Activo)
        VALUES (@IDP_Morral, 'MOR-LON-KHA', 'Mediano (14L)', 'Caqui Vintage', 'Unidad', 310.00, 11, 1);
    ELSE
        UPDATE Variantes SET Precio = 310.00, ExistenciaFisica = 11 WHERE SKU = 'MOR-LON-KHA';

    -- Cupones
    DECLARE @IDDescPorc INT = (SELECT IDTipoDescuento FROM TipoDescuento WHERE Codigo = 'PORCENTAJE');
    DECLARE @IDDescFijo INT = (SELECT IDTipoDescuento FROM TipoDescuento WHERE Codigo = 'MONTO_FIJO');

    IF NOT EXISTS (SELECT 1 FROM Cupones WHERE Codigo = 'BIENVENIDA15')
        INSERT INTO Cupones (Codigo, IDTipoDescuento, Valor, MontoMinimoCompra, LimiteTotalUsos, LimiteUsosPorCliente, UsosActuales, FechaInicio, FechaFin, Activo)
        VALUES ('BIENVENIDA15', @IDDescPorc, 15.00, 200.00, 100, 1, 2, DATEADD(DAY, -25, SYSDATETIME()), DATEADD(DAY, 45, SYSDATETIME()), 1);

    IF NOT EXISTS (SELECT 1 FROM Cupones WHERE Codigo = 'GUATE50')
        INSERT INTO Cupones (Codigo, IDTipoDescuento, Valor, MontoMinimoCompra, LimiteTotalUsos, LimiteUsosPorCliente, UsosActuales, FechaInicio, FechaFin, Activo)
        VALUES ('GUATE50', @IDDescFijo, 50.00, 350.00, 50, 1, 2, DATEADD(DAY, -25, SYSDATETIME()), DATEADD(DAY, 30, SYSDATETIME()), 1);

    IF NOT EXISTS (SELECT 1 FROM Cupones WHERE Codigo = 'HUEHUECAFE')
        INSERT INTO Cupones (Codigo, IDTipoDescuento, Valor, MontoMinimoCompra, LimiteTotalUsos, LimiteUsosPorCliente, UsosActuales, IDCategoriaAplica, FechaInicio, FechaFin, Activo)
        VALUES ('HUEHUECAFE', @IDDescPorc, 10.00, 100.00, 200, 2, 0, @CatHogar, DATEADD(DAY, -20, SYSDATETIME()), DATEADD(DAY, 60, SYSDATETIME()), 1);

    IF NOT EXISTS (SELECT 1 FROM Cupones WHERE Codigo = 'CLIENTEFRECUENTE')
        INSERT INTO Cupones (Codigo, IDTipoDescuento, Valor, MontoMinimoCompra, LimiteTotalUsos, LimiteUsosPorCliente, UsosActuales, FechaInicio, FechaFin, Activo)
        VALUES ('CLIENTEFRECUENTE', @IDDescPorc, 20.00, 400.00, 30, 1, 1, DATEADD(DAY, -15, SYSDATETIME()), DATEADD(DAY, 30, SYSDATETIME()), 1);

    DECLARE @IDCuponBienvenida INT = (SELECT IDCupon FROM Cupones WHERE Codigo = 'BIENVENIDA15');
    DECLARE @IDCuponGuate50 INT = (SELECT IDCupon FROM Cupones WHERE Codigo = 'GUATE50');
    DECLARE @IDCuponFrecuente INT = (SELECT IDCupon FROM Cupones WHERE Codigo = 'CLIENTEFRECUENTE');

    -- Usos registrados de cupones
    IF @IDCuponBienvenida IS NOT NULL AND @IDUserChristian IS NOT NULL AND NOT EXISTS (SELECT 1 FROM CuponesUsosPorCliente WHERE IDCupon = @IDCuponBienvenida AND IDUsuario = @IDUserChristian)
        INSERT INTO CuponesUsosPorCliente (IDCupon, IDUsuario, TotalUsos) VALUES (@IDCuponBienvenida, @IDUserChristian, 1);

    IF @IDCuponBienvenida IS NOT NULL AND @IDUserAlex IS NOT NULL AND NOT EXISTS (SELECT 1 FROM CuponesUsosPorCliente WHERE IDCupon = @IDCuponBienvenida AND IDUsuario = @IDUserAlex)
        INSERT INTO CuponesUsosPorCliente (IDCupon, IDUsuario, TotalUsos) VALUES (@IDCuponBienvenida, @IDUserAlex, 1);

    IF @IDCuponGuate50 IS NOT NULL AND @IDUserMafer IS NOT NULL AND NOT EXISTS (SELECT 1 FROM CuponesUsosPorCliente WHERE IDCupon = @IDCuponGuate50 AND IDUsuario = @IDUserMafer)
        INSERT INTO CuponesUsosPorCliente (IDCupon, IDUsuario, TotalUsos) VALUES (@IDCuponGuate50, @IDUserMafer, 1);

    IF @IDCuponGuate50 IS NOT NULL AND @IDUserRoberto IS NOT NULL AND NOT EXISTS (SELECT 1 FROM CuponesUsosPorCliente WHERE IDCupon = @IDCuponGuate50 AND IDUsuario = @IDUserRoberto)
        INSERT INTO CuponesUsosPorCliente (IDCupon, IDUsuario, TotalUsos) VALUES (@IDCuponGuate50, @IDUserRoberto, 1);

    IF @IDCuponFrecuente IS NOT NULL AND @IDUserLucy IS NOT NULL AND NOT EXISTS (SELECT 1 FROM CuponesUsosPorCliente WHERE IDCupon = @IDCuponFrecuente AND IDUsuario = @IDUserLucy)
        INSERT INTO CuponesUsosPorCliente (IDCupon, IDUsuario, TotalUsos) VALUES (@IDCuponFrecuente, @IDUserLucy, 1);

    -- Pedidos históricos, detalles e historial
    DECLARE @EstPagado INT = (SELECT IDEstadoPedido FROM EstadosPedido WHERE Codigo = 'PAGADO');
    DECLARE @EstPrep INT = (SELECT IDEstadoPedido FROM EstadosPedido WHERE Codigo = 'EN_PREPARACION');
    DECLARE @EstDesp INT = (SELECT IDEstadoPedido FROM EstadosPedido WHERE Codigo = 'DESPACHADO');
    DECLARE @EstEntregado INT = (SELECT IDEstadoPedido FROM EstadosPedido WHERE Codigo = 'ENTREGADO');
    DECLARE @EstCancelado INT = (SELECT IDEstadoPedido FROM EstadosPedido WHERE Codigo = 'CANCELADO');
    DECLARE @EstDevParcial INT = (SELECT IDEstadoPedido FROM EstadosPedido WHERE Codigo = 'DEVUELTO_PARCIAL');

    -- Direcciones de clientes
    DECLARE @DirChristian INT = (SELECT TOP 1 IDDireccion FROM Direcciones WHERE IDUsuario = @IDUserChristian);
    DECLARE @DirMafer INT = (SELECT TOP 1 IDDireccion FROM Direcciones WHERE IDUsuario = @IDUserMafer);
    DECLARE @DirMazariegos INT = (SELECT TOP 1 IDDireccion FROM Direcciones WHERE IDUsuario = @IDUserMazariegos);
    DECLARE @DirLuisa INT = (SELECT TOP 1 IDDireccion FROM Direcciones WHERE IDUsuario = @IDUserLuisa);
    DECLARE @DirXicara INT = (SELECT TOP 1 IDDireccion FROM Direcciones WHERE IDUsuario = @IDUserXicara);
    DECLARE @DirAlex INT = (SELECT TOP 1 IDDireccion FROM Direcciones WHERE IDUsuario = @IDUserAlex);
    DECLARE @DirSofia INT = (SELECT TOP 1 IDDireccion FROM Direcciones WHERE IDUsuario = @IDUserSofia);
    DECLARE @DirRoberto INT = (SELECT TOP 1 IDDireccion FROM Direcciones WHERE IDUsuario = @IDUserRoberto);
    DECLARE @DirClaudia INT = (SELECT TOP 1 IDDireccion FROM Direcciones WHERE IDUsuario = @IDUserClaudia);
    DECLARE @DirRodas INT = (SELECT TOP 1 IDDireccion FROM Direcciones WHERE IDUsuario = @IDUserRodas);
    DECLARE @DirLucy INT = (SELECT TOP 1 IDDireccion FROM Direcciones WHERE IDUsuario = @IDUserLucy);

    -- Todas las Variantes declaradas
    DECLARE @V_BOT40 INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'BOT-CUE-40-CAF');
    DECLARE @V_BOT41 INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'BOT-CUE-41-CAF');
    DECLARE @V_BOT42 INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'BOT-CUE-42-NEG');
    DECLARE @V_BOT39 INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'BOT-CUE-39-MIE');

    DECLARE @V_CAM_M INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'CAM-OXF-M-AZU');
    DECLARE @V_CAM_L INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'CAM-OXF-L-BLA');
    DECLARE @V_CAM_S INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'CAM-OXF-S-ROS');
    DECLARE @V_CAM_XL INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'CAM-OXF-XL-AZU');

    DECLARE @V_TEN40 INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'TEN-URB-40-AZU');
    DECLARE @V_TEN41 INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'TEN-URB-41-GRI');
    DECLARE @V_TEN42 INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'TEN-URB-42-GRI');
    DECLARE @V_TEN43 INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'TEN-URB-43-NEG');

    DECLARE @V_BLU_S INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'BLU-CAN-S-BLA');
    DECLARE @V_BLU_M INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'BLU-CAN-M-BLA');
    DECLARE @V_BLU_L INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'BLU-CAN-L-IND');

    DECLARE @V_CIN34 INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'CIN-REV-34-BIC');
    DECLARE @V_CIN36 INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'CIN-REV-36-BIC');
    DECLARE @V_CIN38 INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'CIN-REV-38-BIC');

    DECLARE @V_BIL_CAF INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'BIL-RFID-CAF');
    DECLARE @V_BIL_NEG INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'BIL-RFID-NEG');

    DECLARE @V_AUD_NEG INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'AUD-TWS-NEG');
    DECLARE @V_AUD_BLA INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'AUD-TWS-BLA');

    DECLARE @V_BOC_AZU INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'BOC-WAT-AZU');
    DECLARE @V_BOC_NEG INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'BOC-WAT-NEG');

    DECLARE @V_CAF_GRA1 INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'CAF-HUE-GRA-1LB');
    DECLARE @V_CAF_GRA2 INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'CAF-HUE-GRA-2LB');
    DECLARE @V_CAF_MOL1 INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'CAF-HUE-MOL-1LB');

    -- Corregir SKU para Prensa Borosilicato
    DECLARE @V_PRE_INO INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'PRE-FRA-800-INO');
    DECLARE @V_PRE_NEG INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'PRE-FRA-800-NEG');

    DECLARE @V_MOC_GRI INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'MOC-EJE-GRI');
    DECLARE @V_MOC_NEG INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'MOC-EJE-NEG');

    DECLARE @V_MOR_VER INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'MOR-LON-VER');
    DECLARE @V_MOR_KHA INT = (SELECT IDVariante FROM Variantes WHERE SKU = 'MOR-LON-KHA');

    IF NOT EXISTS (SELECT 1 FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-001')
    BEGIN
        INSERT INTO Pedidos (IDUsuario, IDDireccion, IDCupon, IDEstadoPedido, ClaveIdempotencia, Subtotal, Descuento, CostoEnvio, MontoReembolsado, Total, FechaCreacion)
        VALUES (@IDUserChristian, @DirChristian, @IDCuponBienvenida, @EstEntregado, 'ORDER-SEED-2026-001', 650.00, 97.50, 25.00, 0.00, 577.50, DATEADD(DAY, -24, SYSDATETIME()));

        DECLARE @IDP1 INT = SCOPE_IDENTITY();
        INSERT INTO PedidoDetalles (IDPedido, IDVariante, CantidadComprada, CantidadDevuelta, PrecioUnitarioCongelado, DescuentoUnitarioProrrateado, PrecioNetoUnitario, SubtotalLinea)
        VALUES (@IDP1, @V_BOT40, 1, 0, 650.00, 97.50, 552.50, 552.50);

        INSERT INTO PedidoHistorialEstados (IDPedido, IDUsuario, IDEstadoAnterior, IDEstadoNuevo, Comentario, FechaCambio) VALUES
        (@IDP1, @IDUserChristian, NULL, @EstPagado, 'Pago aprobado por pasarela con tarjeta Visa terminada en 4012', DATEADD(DAY, -24, SYSDATETIME())),
        (@IDP1, @IDUserOperador, @EstPagado, @EstPrep, 'Pedido empacado en caja con doble burbuja de protección por turno mañana', DATEADD(DAY, -23, SYSDATETIME())),
        (@IDP1, @IDUserOperador, @EstPrep, @EstDesp, 'se fue con el mensajero de la tarde, guía #44910', DATEADD(DAY, -23, SYSDATETIME())),
        (@IDP1, @IDUserOperador, @EstDesp, @EstEntregado, 'Entregado al cliente en portón café zona 1, firmó recibido conforme', DATEADD(DAY, -22, SYSDATETIME()));
    END

    IF NOT EXISTS (SELECT 1 FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-002')
    BEGIN
        INSERT INTO Pedidos (IDUsuario, IDDireccion, IDCupon, IDEstadoPedido, ClaveIdempotencia, Subtotal, Descuento, CostoEnvio, MontoReembolsado, Total, FechaCreacion)
        VALUES (@IDUserMafer, @DirMafer, @IDCuponGuate50, @EstEntregado, 'ORDER-SEED-2026-002', 510.00, 50.00, 0.00, 0.00, 460.00, DATEADD(DAY, -20, SYSDATETIME()));

        DECLARE @IDP2 INT = SCOPE_IDENTITY();
        INSERT INTO PedidoDetalles (IDPedido, IDVariante, CantidadComprada, CantidadDevuelta, PrecioUnitarioCongelado, DescuentoUnitarioProrrateado, PrecioNetoUnitario, SubtotalLinea) VALUES
        (@IDP2, @V_MOC_GRI, 1, 0, 380.00, 37.25, 342.75, 342.75),
        (@IDP2, @V_CAF_GRA1, 2, 0, 65.00, 6.38, 58.62, 117.25);

        INSERT INTO PedidoHistorialEstados (IDPedido, IDUsuario, IDEstadoAnterior, IDEstadoNuevo, Comentario, FechaCambio) VALUES
        (@IDP2, @IDUserMafer, NULL, @EstPagado, 'Cobro procesado con éxito', DATEADD(DAY, -20, SYSDATETIME())),
        (@IDP2, @IDUserOperador, @EstPagado, @EstPrep, 'Verificado stock en bodega, café recién tostado lote 104', DATEADD(DAY, -19, SYSDATETIME())),
        (@IDP2, @IDUserOperador, @EstPrep, @EstDesp, 'En ruta con mensajería express metropolitana', DATEADD(DAY, -19, SYSDATETIME())),
        (@IDP2, @IDUserOperador, @EstDesp, @EstEntregado, 'Dejado en recepción del edificio Torre Azul con recepcionista Claudia', DATEADD(DAY, -18, SYSDATETIME()));
    END

    IF NOT EXISTS (SELECT 1 FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-003')
    BEGIN
        INSERT INTO Pedidos (IDUsuario, IDDireccion, IDCupon, IDEstadoPedido, ClaveIdempotencia, Subtotal, Descuento, CostoEnvio, MontoReembolsado, Total, FechaCreacion)
        VALUES (@IDUserMazariegos, @DirMazariegos, NULL, @EstDevParcial, 'ORDER-SEED-2026-003', 845.00, 0.00, 0.00, 650.00, 845.00, DATEADD(DAY, -18, SYSDATETIME()));

        DECLARE @IDP3 INT = SCOPE_IDENTITY();
        INSERT INTO PedidoDetalles (IDPedido, IDVariante, CantidadComprada, CantidadDevuelta, PrecioUnitarioCongelado, DescuentoUnitarioProrrateado, PrecioNetoUnitario, SubtotalLinea) VALUES
        (@IDP3, @V_BOT42, 1, 1, 650.00, 0.00, 650.00, 650.00),
        (@IDP3, @V_CIN36, 1, 0, 195.00, 0.00, 195.00, 195.00);

        DECLARE @IDDetalleDev INT = (SELECT IDPedidoDetalle FROM PedidoDetalles WHERE IDPedido = @IDP3 AND IDVariante = @V_BOT42);

        INSERT INTO Devoluciones (IDPedido, IDPedidoDetalle, IDUsuarioOperador, CantidadDevuelta, MontoReembolsadoLinea, Motivo, FechaDevolucion)
        VALUES (@IDP3, @IDDetalleDev, @IDUserOperador, 1, 650.00, 'me quedó apretado del empeine, solicito cambio o devolución', DATEADD(DAY, -13, SYSDATETIME()));

        INSERT INTO PedidoHistorialEstados (IDPedido, IDUsuario, IDEstadoAnterior, IDEstadoNuevo, Comentario, FechaCambio) VALUES
        (@IDP3, @IDUserMazariegos, NULL, @EstPagado, 'Transacción bancaria autorizada #98124', DATEADD(DAY, -18, SYSDATETIME())),
        (@IDP3, @IDUserOperador, @EstPagado, @EstPrep, 'Alistando calzado y faja de cuero', DATEADD(DAY, -17, SYSDATETIME())),
        (@IDP3, @IDUserOperador, @EstPrep, @EstDesp, 'Guía Guatex #GTX-88219 enviada a Xela', DATEADD(DAY, -17, SYSDATETIME())),
        (@IDP3, @IDUserOperador, @EstDesp, @EstEntregado, 'Recibido por el cliente frente al parque central', DATEADD(DAY, -15, SYSDATETIME())),
        (@IDP3, @IDUserOperador, @EstEntregado, @EstDevParcial, 'Devolución procesada: me quedó apretado del empeine, solicito cambio o devolución', DATEADD(DAY, -13, SYSDATETIME()));
    END

    IF NOT EXISTS (SELECT 1 FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-004')
    BEGIN
        INSERT INTO Pedidos (IDUsuario, IDDireccion, IDCupon, IDEstadoPedido, ClaveIdempotencia, Subtotal, Descuento, CostoEnvio, MontoReembolsado, Total, FechaCreacion)
        VALUES (@IDUserLuisa, @DirLuisa, NULL, @EstCancelado, 'ORDER-SEED-2026-004', 280.00, 0.00, 25.00, 0.00, 305.00, DATEADD(DAY, -15, SYSDATETIME()));

        DECLARE @IDP4 INT = SCOPE_IDENTITY();
        INSERT INTO PedidoDetalles (IDPedido, IDVariante, CantidadComprada, CantidadDevuelta, PrecioUnitarioCongelado, DescuentoUnitarioProrrateado, PrecioNetoUnitario, SubtotalLinea)
        VALUES (@IDP4, @V_CAM_S, 1, 0, 280.00, 0.00, 280.00, 280.00);

        INSERT INTO PedidoHistorialEstados (IDPedido, IDUsuario, IDEstadoAnterior, IDEstadoNuevo, Comentario, FechaCambio) VALUES
        (@IDP4, @IDUserLuisa, NULL, @EstPagado, 'Pago en línea registrado', DATEADD(DAY, -15, SYSDATETIME())),
        (@IDP4, @IDUserOperador, @EstPagado, @EstCancelado, 'el cliente llamó para cancelar porque se equivocó de talla y prefiere pedir M', DATEADD(DAY, -15, SYSDATETIME()));
    END

    IF NOT EXISTS (SELECT 1 FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-005')
    BEGIN
        INSERT INTO Pedidos (IDUsuario, IDDireccion, IDCupon, IDEstadoPedido, ClaveIdempotencia, Subtotal, Descuento, CostoEnvio, MontoReembolsado, Total, FechaCreacion)
        VALUES (@IDUserXicara, @DirXicara, NULL, @EstEntregado, 'ORDER-SEED-2026-005', 480.00, 0.00, 35.00, 0.00, 515.00, DATEADD(DAY, -12, SYSDATETIME()));

        DECLARE @IDP5 INT = SCOPE_IDENTITY();
        INSERT INTO PedidoDetalles (IDPedido, IDVariante, CantidadComprada, CantidadDevuelta, PrecioUnitarioCongelado, DescuentoUnitarioProrrateado, PrecioNetoUnitario, SubtotalLinea) VALUES
        (@IDP5, @V_PRE_INO, 1, 0, 185.00, 0.00, 185.00, 185.00),
        (@IDP5, @V_CAF_GRA2, 1, 0, 120.00, 0.00, 120.00, 120.00),
        (@IDP5, @V_BIL_CAF, 1, 0, 175.00, 0.00, 175.00, 175.00);

        INSERT INTO PedidoHistorialEstados (IDPedido, IDUsuario, IDEstadoAnterior, IDEstadoNuevo, Comentario, FechaCambio) VALUES
        (@IDP5, @IDUserXicara, NULL, @EstPagado, 'Comprobante de transferencia verificado', DATEADD(DAY, -12, SYSDATETIME())),
        (@IDP5, @IDUserOperador, @EstPagado, @EstPrep, 'Empaque reforzado de prensa francesa con burbuja para viaje al altiplano', DATEADD(DAY, -11, SYSDATETIME())),
        (@IDP5, @IDUserOperador, @EstPrep, @EstDesp, 'Despachado en encomienda Transportes Marquensita paquete #712', DATEADD(DAY, -11, SYSDATETIME())),
        (@IDP5, @IDUserOperador, @EstDesp, @EstEntregado, 'Entregado en abarrotería frente al salón municipal', DATEADD(DAY, -9, SYSDATETIME()));
    END

    IF NOT EXISTS (SELECT 1 FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-006')
    BEGIN
        INSERT INTO Pedidos (IDUsuario, IDDireccion, IDCupon, IDEstadoPedido, ClaveIdempotencia, Subtotal, Descuento, CostoEnvio, MontoReembolsado, Total, FechaCreacion)
        VALUES (@IDUserAlex, @DirAlex, @IDCuponBienvenida, @EstEntregado, 'ORDER-SEED-2026-006', 540.00, 81.00, 0.00, 0.00, 459.00, DATEADD(DAY, -9, SYSDATETIME()));

        DECLARE @IDP6 INT = SCOPE_IDENTITY();
        INSERT INTO PedidoDetalles (IDPedido, IDVariante, CantidadComprada, CantidadDevuelta, PrecioUnitarioCongelado, DescuentoUnitarioProrrateado, PrecioNetoUnitario, SubtotalLinea) VALUES
        (@IDP6, @V_AUD_NEG, 1, 0, 345.00, 51.75, 293.25, 293.25),
        (@IDP6, @V_CIN34, 1, 0, 195.00, 29.25, 165.75, 165.75);

        INSERT INTO PedidoHistorialEstados (IDPedido, IDUsuario, IDEstadoAnterior, IDEstadoNuevo, Comentario, FechaCambio) VALUES
        (@IDP6, @IDUserAlex, NULL, @EstPagado, 'Pago con tarjeta debito Banrural', DATEADD(DAY, -9, SYSDATETIME())),
        (@IDP6, @IDUserOperador, @EstPagado, @EstPrep, 'Probada batería y sellos de garantía de audífonos', DATEADD(DAY, -8, SYSDATETIME())),
        (@IDP6, @IDUserOperador, @EstPrep, @EstDesp, 'Mensajero de planta ruta zona 9 y 10', DATEADD(DAY, -8, SYSDATETIME())),
        (@IDP6, @IDUserOperador, @EstDesp, @EstEntregado, 'Entregado en mano propia en garita de Plaza 10', DATEADD(DAY, -7, SYSDATETIME()));
    END

    IF NOT EXISTS (SELECT 1 FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-007')
    BEGIN
        INSERT INTO Pedidos (IDUsuario, IDDireccion, IDCupon, IDEstadoPedido, ClaveIdempotencia, Subtotal, Descuento, CostoEnvio, MontoReembolsado, Total, FechaCreacion)
        VALUES (@IDUserSofia, @DirSofia, NULL, @EstDesp, 'ORDER-SEED-2026-007', 630.00, 0.00, 0.00, 0.00, 630.00, DATEADD(DAY, -4, SYSDATETIME()));

        DECLARE @IDP7 INT = SCOPE_IDENTITY();
        INSERT INTO PedidoDetalles (IDPedido, IDVariante, CantidadComprada, CantidadDevuelta, PrecioUnitarioCongelado, DescuentoUnitarioProrrateado, PrecioNetoUnitario, SubtotalLinea) VALUES
        (@IDP7, @V_BLU_M, 1, 0, 320.00, 0.00, 320.00, 320.00),
        (@IDP7, @V_MOR_KHA, 1, 0, 310.00, 0.00, 310.00, 310.00);

        INSERT INTO PedidoHistorialEstados (IDPedido, IDUsuario, IDEstadoAnterior, IDEstadoNuevo, Comentario, FechaCambio) VALUES
        (@IDP7, @IDUserSofia, NULL, @EstPagado, 'Pago tarjeta de crédito Visa', DATEADD(DAY, -4, SYSDATETIME())),
        (@IDP7, @IDUserOperador, @EstPagado, @EstPrep, 'Doblado y empaque de blusa artesanal con papel de seda', DATEADD(DAY, -3, SYSDATETIME())),
        (@IDP7, @IDUserOperador, @EstPrep, @EstDesp, 'Guía Cargo Expreso #CAX-99418 ruta Sacatepéquez en tránsito', DATEADD(DAY, -2, SYSDATETIME()));
    END

    IF NOT EXISTS (SELECT 1 FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-008')
    BEGIN
        INSERT INTO Pedidos (IDUsuario, IDDireccion, IDCupon, IDEstadoPedido, ClaveIdempotencia, Subtotal, Descuento, CostoEnvio, MontoReembolsado, Total, FechaCreacion)
        VALUES (@IDUserRoberto, @DirRoberto, @IDCuponGuate50, @EstPrep, 'ORDER-SEED-2026-008', 710.00, 50.00, 0.00, 0.00, 660.00, DATEADD(DAY, -2, SYSDATETIME()));

        DECLARE @IDP8 INT = SCOPE_IDENTITY();
        INSERT INTO PedidoDetalles (IDPedido, IDVariante, CantidadComprada, CantidadDevuelta, PrecioUnitarioCongelado, DescuentoUnitarioProrrateado, PrecioNetoUnitario, SubtotalLinea) VALUES
        (@IDP8, @V_TEN42, 1, 0, 420.00, 29.58, 390.42, 390.42),
        (@IDP8, @V_BOC_AZU, 1, 0, 290.00, 20.42, 269.58, 269.58);

        INSERT INTO PedidoHistorialEstados (IDPedido, IDUsuario, IDEstadoAnterior, IDEstadoNuevo, Comentario, FechaCambio) VALUES
        (@IDP8, @IDUserRoberto, NULL, @EstPagado, 'Pago en línea completado', DATEADD(DAY, -2, SYSDATETIME())),
        (@IDP8, @IDUserOperador, @EstPagado, @EstPrep, 'El operador está alistando los productos y verificando cable de bocina', DATEADD(DAY, -1, SYSDATETIME()));
    END

    IF NOT EXISTS (SELECT 1 FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-009')
    BEGIN
        INSERT INTO Pedidos (IDUsuario, IDDireccion, IDCupon, IDEstadoPedido, ClaveIdempotencia, Subtotal, Descuento, CostoEnvio, MontoReembolsado, Total, FechaCreacion)
        VALUES (@IDUserClaudia, @DirClaudia, NULL, @EstPagado, 'ORDER-SEED-2026-009', 390.00, 0.00, 25.00, 0.00, 415.00, DATEADD(HOUR, -6, SYSDATETIME()));

        DECLARE @IDP9 INT = SCOPE_IDENTITY();
        INSERT INTO PedidoDetalles (IDPedido, IDVariante, CantidadComprada, CantidadDevuelta, PrecioUnitarioCongelado, DescuentoUnitarioProrrateado, PrecioNetoUnitario, SubtotalLinea) VALUES
        (@IDP9, @V_CAF_MOL1, 3, 0, 65.00, 0.00, 65.00, 195.00),
        (@IDP9, @V_PRE_NEG, 1, 0, 195.00, 0.00, 195.00, 195.00);

        INSERT INTO PedidoHistorialEstados (IDPedido, IDUsuario, IDEstadoAnterior, IDEstadoNuevo, Comentario, FechaCambio) VALUES
        (@IDP9, @IDUserClaudia, NULL, @EstPagado, 'Pedido pagado exitosamente tras checkout, listo para surtir en bodega', DATEADD(HOUR, -6, SYSDATETIME()));
    END

    IF NOT EXISTS (SELECT 1 FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-010')
    BEGIN
        INSERT INTO Pedidos (IDUsuario, IDDireccion, IDCupon, IDEstadoPedido, ClaveIdempotencia, Subtotal, Descuento, CostoEnvio, MontoReembolsado, Total, FechaCreacion)
        VALUES (@IDUserRodas, @DirRodas, NULL, @EstEntregado, 'ORDER-SEED-2026-010', 650.00, 0.00, 0.00, 0.00, 650.00, DATEADD(DAY, -14, SYSDATETIME()));

        DECLARE @IDP10 INT = SCOPE_IDENTITY();
        INSERT INTO PedidoDetalles (IDPedido, IDVariante, CantidadComprada, CantidadDevuelta, PrecioUnitarioCongelado, DescuentoUnitarioProrrateado, PrecioNetoUnitario, SubtotalLinea)
        VALUES (@IDP10, @V_BOT41, 1, 0, 650.00, 0.00, 650.00, 650.00);

        INSERT INTO PedidoHistorialEstados (IDPedido, IDUsuario, IDEstadoAnterior, IDEstadoNuevo, Comentario, FechaCambio) VALUES
        (@IDP10, @IDUserRodas, NULL, @EstPagado, 'Pago verificado', DATEADD(DAY, -14, SYSDATETIME())),
        (@IDP10, @IDUserOperador, @EstPagado, @EstPrep, 'Calzado inspeccionado sin raspones', DATEADD(DAY, -13, SYSDATETIME())),
        (@IDP10, @IDUserOperador, @EstPrep, @EstDesp, 'Despachado en Guatex guía #66201', DATEADD(DAY, -13, SYSDATETIME())),
        (@IDP10, @IDUserOperador, @EstDesp, @EstEntregado, 'Entregado en zaguán rojo zona 1', DATEADD(DAY, -11, SYSDATETIME()));
    END

    IF NOT EXISTS (SELECT 1 FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-011')
    BEGIN
        INSERT INTO Pedidos (IDUsuario, IDDireccion, IDCupon, IDEstadoPedido, ClaveIdempotencia, Subtotal, Descuento, CostoEnvio, MontoReembolsado, Total, FechaCreacion)
        VALUES (@IDUserLucy, @DirLucy, @IDCuponFrecuente, @EstEntregado, 'ORDER-SEED-2026-011', 700.00, 140.00, 0.00, 0.00, 560.00, DATEADD(DAY, -7, SYSDATETIME()));

        DECLARE @IDP11 INT = SCOPE_IDENTITY();
        INSERT INTO PedidoDetalles (IDPedido, IDVariante, CantidadComprada, CantidadDevuelta, PrecioUnitarioCongelado, DescuentoUnitarioProrrateado, PrecioNetoUnitario, SubtotalLinea) VALUES
        (@IDP11, @V_TEN40, 1, 0, 420.00, 84.00, 336.00, 336.00),
        (@IDP11, @V_CAM_M, 1, 0, 280.00, 56.00, 224.00, 224.00);

        INSERT INTO PedidoHistorialEstados (IDPedido, IDUsuario, IDEstadoAnterior, IDEstadoNuevo, Comentario, FechaCambio) VALUES
        (@IDP11, @IDUserLucy, NULL, @EstPagado, 'Pago aprobado con Mastercard', DATEADD(DAY, -7, SYSDATETIME())),
        (@IDP11, @IDUserOperador, @EstPagado, @EstPrep, 'Empacado completo para mensajería local', DATEADD(DAY, -6, SYSDATETIME())),
        (@IDP11, @IDUserOperador, @EstPrep, @EstDesp, 'En ruta hacia San Cristóbal con motorista de confianza', DATEADD(DAY, -6, SYSDATETIME())),
        (@IDP11, @IDUserOperador, @EstDesp, @EstEntregado, 'Recibido por la titular en portón blanco', DATEADD(DAY, -5, SYSDATETIME()));
    END

    -- Movimientos de inventario
    DECLARE @MovEntrada INT = (SELECT IDTipoMovimiento FROM TipoMovimiento WHERE Codigo = 'ENTRADA_COMPRA');
    DECLARE @MovSalida INT = (SELECT IDTipoMovimiento FROM TipoMovimiento WHERE Codigo = 'SALIDA_VENTA');
    DECLARE @MovAjustePos INT = (SELECT IDTipoMovimiento FROM TipoMovimiento WHERE Codigo = 'AJUSTE_POSITIVO');
    DECLARE @MovAjusteNeg INT = (SELECT IDTipoMovimiento FROM TipoMovimiento WHERE Codigo = 'AJUSTE_NEGATIVO');
    DECLARE @MovDevolucion INT = (SELECT IDTipoMovimiento FROM TipoMovimiento WHERE Codigo = 'DEVOLUCION_CLIENTE');

    -- Variables para IDs de pedidos creados
    DECLARE @IDPed1 INT = (SELECT IDPedido FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-001');
    DECLARE @IDPed2 INT = (SELECT IDPedido FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-002');
    DECLARE @IDPed3 INT = (SELECT IDPedido FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-003');
    DECLARE @IDPed4 INT = (SELECT IDPedido FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-004');
    DECLARE @IDPed5 INT = (SELECT IDPedido FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-005');
    DECLARE @IDPed6 INT = (SELECT IDPedido FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-006');
    DECLARE @IDPed7 INT = (SELECT IDPedido FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-007');
    DECLARE @IDPed8 INT = (SELECT IDPedido FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-008');
    DECLARE @IDPed9 INT = (SELECT IDPedido FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-009');
    DECLARE @IDPed10 INT = (SELECT IDPedido FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-010');
    DECLARE @IDPed11 INT = (SELECT IDPedido FROM Pedidos WHERE ClaveIdempotencia = 'ORDER-SEED-2026-011');

    -- Borrar filas de kardex viejas para que el saldo cuadre con la existencia
    DELETE FROM Kardex WHERE Motivo IN ('Inventario inicial semilla', 'Inventario inicial semilla (Última unidad)');

    IF @V_BOT40 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_BOT40 AND Motivo = 'Inventario inicial de apertura de tienda')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_BOT40, @IDUserAdmin, @MovEntrada, 11, 11, 'Inventario inicial de apertura de tienda', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_BOT40 IS NOT NULL AND @IDPed1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_BOT40 AND Motivo = 'Salida por venta en Pedido #1 (BOT-CUE-40-CAF)')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_BOT40, @IDUserOperador, @MovSalida, -1, 10, 'Salida por venta en Pedido #1 (BOT-CUE-40-CAF)', @IDPed1, DATEADD(DAY, -24, SYSDATETIME()));

    IF @V_BOT42 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_BOT42 AND Motivo = 'Inventario inicial de apertura de tienda')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_BOT42, @IDUserAdmin, @MovEntrada, 4, 4, 'Inventario inicial de apertura de tienda', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_BOT42 IS NOT NULL AND @IDPed3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_BOT42 AND Motivo = 'Salida por venta en Pedido #3 (BOT-CUE-42-NEG)')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_BOT42, @IDUserOperador, @MovSalida, -1, 3, 'Salida por venta en Pedido #3 (BOT-CUE-42-NEG)', @IDPed3, DATEADD(DAY, -18, SYSDATETIME()));

    IF @V_BOT42 IS NOT NULL AND @IDPed3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_BOT42 AND Motivo LIKE 'Devolución Pedido #3%')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_BOT42, @IDUserOperador, @MovDevolucion, 1, 4, 'Devolución Pedido #3: me quedó apretado del empeine, solicito cambio o devolución', @IDPed3, DATEADD(DAY, -13, SYSDATETIME()));

    IF @V_BOT41 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_BOT41 AND Motivo = 'Inventario inicial de apertura de tienda')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_BOT41, @IDUserAdmin, @MovEntrada, 9, 9, 'Inventario inicial de apertura de tienda', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_BOT41 IS NOT NULL AND @IDPed10 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_BOT41 AND Motivo = 'Salida por venta en Pedido #10 (BOT-CUE-41-CAF)')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_BOT41, @IDUserOperador, @MovSalida, -1, 8, 'Salida por venta en Pedido #10 (BOT-CUE-41-CAF)', @IDPed10, DATEADD(DAY, -14, SYSDATETIME()));

    IF @V_BOT39 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_BOT39 AND Motivo = 'Inventario inicial de apertura de tienda')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_BOT39, @IDUserAdmin, @MovEntrada, 6, 6, 'Inventario inicial de apertura de tienda', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_CAM_M IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_CAM_M AND Motivo = 'Inventario inicial lote textil importado')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_CAM_M, @IDUserAdmin, @MovEntrada, 16, 16, 'Inventario inicial lote textil importado', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_CAM_M IS NOT NULL AND @IDPed11 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_CAM_M AND Motivo = 'Salida por venta en Pedido #11 (CAM-OXF-M-AZU)')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_CAM_M, @IDUserOperador, @MovSalida, -1, 15, 'Salida por venta en Pedido #11 (CAM-OXF-M-AZU)', @IDPed11, DATEADD(DAY, -7, SYSDATETIME()));

    IF @V_CAM_L IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_CAM_L AND Motivo = 'Inventario inicial lote textil importado')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_CAM_L, @IDUserAdmin, @MovEntrada, 12, 12, 'Inventario inicial lote textil importado', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_CAM_S IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_CAM_S AND Motivo = 'Inventario inicial lote textil importado')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_CAM_S, @IDUserAdmin, @MovEntrada, 7, 7, 'Inventario inicial lote textil importado', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_CAM_S IS NOT NULL AND @IDPed4 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_CAM_S AND Motivo = 'Salida por venta en Pedido #4')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_CAM_S, @IDUserOperador, @MovSalida, -1, 6, 'Salida por venta en Pedido #4', @IDPed4, DATEADD(DAY, -15, SYSDATETIME()));

    IF @V_CAM_S IS NOT NULL AND @IDPed4 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_CAM_S AND Motivo LIKE 'Reintegro por cancelación Pedido #4%')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_CAM_S, @IDUserOperador, @MovAjustePos, 1, 7, 'Reintegro por cancelación Pedido #4: cliente equivocó de talla', @IDPed4, DATEADD(DAY, -15, SYSDATETIME()));

    IF @V_CAM_XL IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_CAM_XL AND Motivo = 'Inventario inicial lote textil importado')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_CAM_XL, @IDUserAdmin, @MovEntrada, 9, 9, 'Inventario inicial lote textil importado', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_TEN41 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_TEN41 AND Motivo = 'Recepción de proveedor de calzado')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_TEN41, @IDUserAdmin, @MovEntrada, 15, 15, 'Recepción de proveedor de calzado', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_TEN41 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_TEN41 AND Motivo LIKE 'caja llegó golpeada en ruta de guatex%')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_TEN41, @IDUserOperador, @MovAjusteNeg, -1, 14, 'caja llegó golpeada en ruta de guatex, se descuenta 1 unidad dañada', DATEADD(DAY, -10, SYSDATETIME()));

    IF @V_TEN42 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_TEN42 AND Motivo = 'Recepción de proveedor de calzado')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_TEN42, @IDUserAdmin, @MovEntrada, 10, 10, 'Recepción de proveedor de calzado', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_TEN42 IS NOT NULL AND @IDPed8 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_TEN42 AND Motivo = 'Salida por venta en Pedido #8 (TEN-URB-42-GRI)')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_TEN42, @IDUserOperador, @MovSalida, -1, 9, 'Salida por venta en Pedido #8 (TEN-URB-42-GRI)', @IDPed8, DATEADD(DAY, -2, SYSDATETIME()));

    IF @V_TEN40 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_TEN40 AND Motivo = 'Recepción de proveedor de calzado')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_TEN40, @IDUserAdmin, @MovEntrada, 12, 12, 'Recepción de proveedor de calzado', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_TEN40 IS NOT NULL AND @IDPed11 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_TEN40 AND Motivo = 'Salida por venta en Pedido #11 (TEN-URB-40-AZU)')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_TEN40, @IDUserOperador, @MovSalida, -1, 11, 'Salida por venta en Pedido #11 (TEN-URB-40-AZU)', @IDPed11, DATEADD(DAY, -7, SYSDATETIME()));

    IF @V_TEN43 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_TEN43 AND Motivo = 'Recepción de proveedor de calzado')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_TEN43, @IDUserAdmin, @MovEntrada, 3, 3, 'Recepción de proveedor de calzado', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_TEN43 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_TEN43 AND Motivo LIKE 'conteo físico de sábado por la mañana%')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_TEN43, @IDUserOperador, @MovAjustePos, 2, 5, 'conteo físico de sábado por la mañana, sobraban 2 en bodega', DATEADD(DAY, -5, SYSDATETIME()));

    IF @V_BLU_S IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_BLU_S AND Motivo = 'Recepción de taller artesanal Cantel')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_BLU_S, @IDUserAdmin, @MovEntrada, 8, 8, 'Recepción de taller artesanal Cantel', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_BLU_M IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_BLU_M AND Motivo = 'Recepción de taller artesanal Cantel')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_BLU_M, @IDUserAdmin, @MovEntrada, 13, 13, 'Recepción de taller artesanal Cantel', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_BLU_M IS NOT NULL AND @IDPed7 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_BLU_M AND Motivo = 'Salida por venta en Pedido #7 (BLU-CAN-M-BLA)')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_BLU_M, @IDUserOperador, @MovSalida, -1, 12, 'Salida por venta en Pedido #7 (BLU-CAN-M-BLA)', @IDPed7, DATEADD(DAY, -4, SYSDATETIME()));

    IF @V_BLU_L IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_BLU_L AND Motivo = 'Recepción de taller artesanal Cantel')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_BLU_L, @IDUserAdmin, @MovEntrada, 6, 6, 'Recepción de taller artesanal Cantel', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_CIN34 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_CIN34 AND Motivo = 'Recepción lote marroquinería')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_CIN34, @IDUserAdmin, @MovEntrada, 19, 19, 'Recepción lote marroquinería', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_CIN34 IS NOT NULL AND @IDPed6 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_CIN34 AND Motivo = 'Salida por venta en Pedido #6')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_CIN34, @IDUserOperador, @MovSalida, -1, 18, 'Salida por venta en Pedido #6', @IDPed6, DATEADD(DAY, -9, SYSDATETIME()));

    IF @V_CIN36 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_CIN36 AND Motivo = 'Recepción lote marroquinería')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_CIN36, @IDUserAdmin, @MovEntrada, 16, 16, 'Recepción lote marroquinería', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_CIN36 IS NOT NULL AND @IDPed3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_CIN36 AND Motivo = 'Salida por venta en Pedido #3')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_CIN36, @IDUserOperador, @MovSalida, -1, 15, 'Salida por venta en Pedido #3', @IDPed3, DATEADD(DAY, -18, SYSDATETIME()));

    IF @V_CIN38 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_CIN38 AND Motivo = 'Recepción lote marroquinería')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_CIN38, @IDUserAdmin, @MovEntrada, 10, 10, 'Recepción lote marroquinería', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_BIL_CAF IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_BIL_CAF AND Motivo = 'Lote billeteras con chip antirrobo')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_BIL_CAF, @IDUserAdmin, @MovEntrada, 23, 23, 'Lote billeteras con chip antirrobo', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_BIL_CAF IS NOT NULL AND @IDPed5 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_BIL_CAF AND Motivo = 'Salida por venta en Pedido #5')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_BIL_CAF, @IDUserOperador, @MovSalida, -1, 22, 'Salida por venta en Pedido #5', @IDPed5, DATEADD(DAY, -12, SYSDATETIME()));

    IF @V_BIL_NEG IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_BIL_NEG AND Motivo = 'Lote billeteras con chip antirrobo')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_BIL_NEG, @IDUserAdmin, @MovEntrada, 16, 16, 'Lote billeteras con chip antirrobo', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_AUD_NEG IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_AUD_NEG AND Motivo = 'Lote importación gadgets audio TWS')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_AUD_NEG, @IDUserAdmin, @MovEntrada, 21, 21, 'Lote importación gadgets audio TWS', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_AUD_NEG IS NOT NULL AND @IDPed6 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_AUD_NEG AND Motivo = 'Salida por venta en Pedido #6')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_AUD_NEG, @IDUserOperador, @MovSalida, -1, 20, 'Salida por venta en Pedido #6', @IDPed6, DATEADD(DAY, -9, SYSDATETIME()));

    IF @V_AUD_BLA IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_AUD_BLA AND Motivo = 'Lote importación gadgets audio TWS')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_AUD_BLA, @IDUserAdmin, @MovEntrada, 14, 14, 'Lote importación gadgets audio TWS', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_BOC_AZU IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_BOC_AZU AND Motivo = 'Recepción bocinas waterproof')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_BOC_AZU, @IDUserAdmin, @MovEntrada, 13, 13, 'Recepción bocinas waterproof', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_BOC_AZU IS NOT NULL AND @IDPed8 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_BOC_AZU AND Motivo = 'Salida por venta en Pedido #8')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_BOC_AZU, @IDUserOperador, @MovSalida, -1, 12, 'Salida por venta en Pedido #8', @IDPed8, DATEADD(DAY, -2, SYSDATETIME()));

    IF @V_BOC_NEG IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_BOC_NEG AND Motivo = 'Recepción bocinas waterproof')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_BOC_NEG, @IDUserAdmin, @MovEntrada, 15, 15, 'Recepción bocinas waterproof', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_CAF_GRA1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_CAF_GRA1 AND Motivo = 'Lote 104 café de altura finca Cuchumatanes')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_CAF_GRA1, @IDUserAdmin, @MovEntrada, 37, 37, 'Lote 104 café de altura finca Cuchumatanes', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_CAF_GRA1 IS NOT NULL AND @IDPed2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_CAF_GRA1 AND Motivo = 'Salida por venta en Pedido #2')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_CAF_GRA1, @IDUserOperador, @MovSalida, -2, 35, 'Salida por venta en Pedido #2', @IDPed2, DATEADD(DAY, -20, SYSDATETIME()));

    IF @V_CAF_GRA2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_CAF_GRA2 AND Motivo = 'Lote 104 café de altura finca Cuchumatanes')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_CAF_GRA2, @IDUserAdmin, @MovEntrada, 21, 21, 'Lote 104 café de altura finca Cuchumatanes', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_CAF_GRA2 IS NOT NULL AND @IDPed5 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_CAF_GRA2 AND Motivo = 'Salida por venta en Pedido #5')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_CAF_GRA2, @IDUserOperador, @MovSalida, -1, 20, 'Salida por venta en Pedido #5', @IDPed5, DATEADD(DAY, -12, SYSDATETIME()));

    IF @V_CAF_MOL1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_CAF_MOL1 AND Motivo = 'Molienda fresca lote semanal')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_CAF_MOL1, @IDUserAdmin, @MovEntrada, 28, 28, 'Molienda fresca lote semanal', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_CAF_MOL1 IS NOT NULL AND @IDPed9 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_CAF_MOL1 AND Motivo = 'Salida por venta en Pedido #9')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_CAF_MOL1, @IDUserOperador, @MovSalida, -3, 25, 'Salida por venta en Pedido #9', @IDPed9, DATEADD(HOUR, -6, SYSDATETIME()));

    IF @V_PRE_INO IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_PRE_INO AND Motivo = 'Recepción prensas borosilicato')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_PRE_INO, @IDUserAdmin, @MovEntrada, 19, 19, 'Recepción prensas borosilicato', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_PRE_INO IS NOT NULL AND @IDPed5 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_PRE_INO AND Motivo = 'Salida por venta en Pedido #5')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_PRE_INO, @IDUserOperador, @MovSalida, -1, 18, 'Salida por venta en Pedido #5', @IDPed5, DATEADD(DAY, -12, SYSDATETIME()));

    IF @V_PRE_NEG IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_PRE_NEG AND Motivo = 'Recepción prensas borosilicato')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_PRE_NEG, @IDUserAdmin, @MovEntrada, 11, 11, 'Recepción prensas borosilicato', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_PRE_NEG IS NOT NULL AND @IDPed9 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_PRE_NEG AND Motivo = 'Salida por venta en Pedido #9')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_PRE_NEG, @IDUserOperador, @MovSalida, -1, 10, 'Salida por venta en Pedido #9', @IDPed9, DATEADD(HOUR, -6, SYSDATETIME()));

    IF @V_MOC_GRI IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_MOC_GRI AND Motivo = 'Lote mochilas Oxford impermeables')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_MOC_GRI, @IDUserAdmin, @MovEntrada, 17, 17, 'Lote mochilas Oxford impermeables', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_MOC_GRI IS NOT NULL AND @IDPed2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_MOC_GRI AND Motivo = 'Salida por venta en Pedido #2')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_MOC_GRI, @IDUserOperador, @MovSalida, -1, 16, 'Salida por venta en Pedido #2', @IDPed2, DATEADD(DAY, -20, SYSDATETIME()));

    IF @V_MOC_NEG IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_MOC_NEG AND Motivo = 'Lote mochilas Oxford impermeables')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_MOC_NEG, @IDUserAdmin, @MovEntrada, 12, 12, 'Lote mochilas Oxford impermeables', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_MOR_VER IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_MOR_VER AND Motivo = 'Lote morrales lona encerada')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_MOR_VER, @IDUserAdmin, @MovEntrada, 14, 14, 'Lote morrales lona encerada', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_MOR_KHA IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_MOR_KHA AND Motivo = 'Lote morrales lona encerada')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, FechaMovimiento)
        VALUES (@V_MOR_KHA, @IDUserAdmin, @MovEntrada, 12, 12, 'Lote morrales lona encerada', DATEADD(DAY, -28, SYSDATETIME()));

    IF @V_MOR_KHA IS NOT NULL AND @IDPed7 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Kardex WHERE IDVariante = @V_MOR_KHA AND Motivo = 'Salida por venta en Pedido #7')
        INSERT INTO Kardex (IDVariante, IDUsuario, IDTipoMovimiento, Cantidad, SaldoPosterior, Motivo, IDPedidoReferencia, FechaMovimiento)
        VALUES (@V_MOR_KHA, @IDUserOperador, @MovSalida, -1, 11, 'Salida por venta en Pedido #7', @IDPed7, DATEADD(DAY, -4, SYSDATETIME()));

    IF @IDUserChristian IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Carritos WHERE IDUsuario = @IDUserChristian)
    BEGIN
        INSERT INTO Carritos (IDUsuario, TokenInvitado, IDCupon, UltimaActividad)
        VALUES (@IDUserChristian, NULL, NULL, DATEADD(HOUR, -36, SYSDATETIME()));

        DECLARE @IDCar1 INT = SCOPE_IDENTITY();
        INSERT INTO CarritoItems (IDCarrito, IDVariante, Cantidad) VALUES (@IDCar1, @V_MOR_VER, 1);
    END
    ELSE IF @IDUserChristian IS NOT NULL
    BEGIN
        UPDATE Carritos SET UltimaActividad = DATEADD(HOUR, -36, SYSDATETIME()) WHERE IDUsuario = @IDUserChristian;
    END

    IF @IDUserDiego IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Carritos WHERE IDUsuario = @IDUserDiego)
    BEGIN
        INSERT INTO Carritos (IDUsuario, TokenInvitado, IDCupon, UltimaActividad)
        VALUES (@IDUserDiego, NULL, NULL, DATEADD(HOUR, -48, SYSDATETIME()));

        DECLARE @IDCar2 INT = SCOPE_IDENTITY();
        INSERT INTO CarritoItems (IDCarrito, IDVariante, Cantidad) VALUES 
        (@IDCar2, @V_BOC_NEG, 1),
        (@IDCar2, @V_BIL_NEG, 1);
    END
    ELSE IF @IDUserDiego IS NOT NULL
    BEGIN
        UPDATE Carritos SET UltimaActividad = DATEADD(HOUR, -48, SYSDATETIME()) WHERE IDUsuario = @IDUserDiego;
    END

    IF NOT EXISTS (SELECT 1 FROM Carritos WHERE TokenInvitado = 'guest-abandoned-4491')
    BEGIN
        INSERT INTO Carritos (IDUsuario, TokenInvitado, IDCupon, UltimaActividad)
        VALUES (NULL, 'guest-abandoned-4491', NULL, DATEADD(HOUR, -32, SYSDATETIME()));

        DECLARE @IDCar3 INT = SCOPE_IDENTITY();
        INSERT INTO CarritoItems (IDCarrito, IDVariante, Cantidad) VALUES (@IDCar3, @V_PRE_INO, 1);
    END
    ELSE
    BEGIN
        UPDATE Carritos SET UltimaActividad = DATEADD(HOUR, -32, SYSDATETIME()) WHERE TokenInvitado = 'guest-abandoned-4491';
    END

    IF @IDUserByron IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Carritos WHERE IDUsuario = @IDUserByron)
    BEGIN
        INSERT INTO Carritos (IDUsuario, TokenInvitado, IDCupon, UltimaActividad)
        VALUES (@IDUserByron, NULL, NULL, DATEADD(MINUTE, -15, SYSDATETIME()));

        DECLARE @IDCar4 INT = SCOPE_IDENTITY();
        INSERT INTO CarritoItems (IDCarrito, IDVariante, Cantidad) VALUES (@IDCar4, @V_BOT41, 1);
    END
    ELSE IF @IDUserByron IS NOT NULL
    BEGIN
        UPDATE Carritos SET UltimaActividad = DATEADD(MINUTE, -15, SYSDATETIME()) WHERE IDUsuario = @IDUserByron;
    END

    -- Bitácora de eventos
    IF NOT EXISTS (SELECT 1 FROM Bitacora WHERE Modulo = 'PRODUCTOS' AND Accion = 'CREACION_CATALOGO')
    BEGIN
        INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo, FechaRegistro)
        VALUES (@IDUserAdmin, 'PRODUCTOS', 'Catalogo', 1, 'CREACION_CATALOGO', NULL, 'Carga inicial de 12 productos con 33 variantes', DATEADD(DAY, -28, SYSDATETIME()));
    END

    IF NOT EXISTS (SELECT 1 FROM Bitacora WHERE Modulo = 'INVENTARIO' AND Accion = 'AJUSTE_MERMA')
    BEGIN
        INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo, FechaRegistro)
        VALUES (@IDUserOperador, 'INVENTARIO', 'Variantes', @V_TEN41, 'AJUSTE_MERMA', '{"ExistenciaFisica":15}', '{"ExistenciaFisica":14,"Motivo":"caja llegó golpeada en ruta de guatex"}', DATEADD(DAY, -10, SYSDATETIME()));
    END

    IF NOT EXISTS (SELECT 1 FROM Bitacora WHERE Modulo = 'PEDIDOS' AND Accion = 'DEVOLUCION_APROBADA')
    BEGIN
        INSERT INTO Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo, FechaRegistro)
        VALUES (@IDUserOperador, 'PEDIDOS', 'Pedidos', @IDPed3, 'DEVOLUCION_APROBADA', '{"Estado":"ENTREGADO"}', '{"Estado":"DEVUELTO_PARCIAL","MontoReembolsado":650.00}', DATEADD(DAY, -13, SYSDATETIME()));
    END

        COMMIT TRANSACTION;

        SELECT 
            1 AS Aplicado,
            'Datos semilla aplicados exitosamente.' AS Mensaje,
            (SELECT COUNT(1) FROM Usuarios) AS TotalUsuarios,
            (SELECT COUNT(1) FROM Categorias) AS TotalCategorias,
            (SELECT COUNT(1) FROM Productos) AS TotalProductos,
            (SELECT COUNT(1) FROM Variantes) AS TotalVariantes,
            (SELECT COUNT(1) FROM Cupones) AS TotalCupones;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

EXEC SP_Sistema_AplicarSeed;
GO

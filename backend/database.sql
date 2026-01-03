-- Table: public.clientes

-- DROP TABLE IF EXISTS public.clientes;

CREATE TABLE IF NOT EXISTS public.clientes
(
    id integer NOT NULL DEFAULT nextval('clientes_id_seq'::regclass),
    placa character varying(10) COLLATE pg_catalog."default" NOT NULL,
    modelo character varying(50) COLLATE pg_catalog."default",
    nombre character varying(100) COLLATE pg_catalog."default",
    telefono character varying(20) COLLATE pg_catalog."default",
    marca character varying(50) COLLATE pg_catalog."default",
    "año" numeric,
    CONSTRAINT clientes_pkey PRIMARY KEY (id),
    CONSTRAINT clientes_placa_key UNIQUE (placa)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.clientes
    OWNER to postgres;

	-- Table: public.factura_detalle

-- DROP TABLE IF EXISTS public.factura_detalle;

CREATE TABLE IF NOT EXISTS public.factura_detalle
(
    id integer NOT NULL DEFAULT nextval('factura_detalle_id_seq'::regclass),
    factura_id integer NOT NULL,
    tipo character varying(20) COLLATE pg_catalog."default",
    descripcion text COLLATE pg_catalog."default",
    valor numeric,
    CONSTRAINT factura_detalle_pkey PRIMARY KEY (id),
    CONSTRAINT fk_factura FOREIGN KEY (factura_id)
        REFERENCES public.total_facturas (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.factura_detalle
    OWNER to postgres;


-- Table: public.total_facturas

-- DROP TABLE IF EXISTS public.total_facturas;

CREATE TABLE IF NOT EXISTS public.total_facturas
(
    id integer NOT NULL DEFAULT nextval('total_facturas_id_seq'::regclass),
    placa character varying(20) COLLATE pg_catalog."default" NOT NULL,
    fechaexp date NOT NULL,
    fechagarantia date,
    totalrepuestos numeric(12,2) NOT NULL DEFAULT 0,
    totalservicios numeric(12,2) NOT NULL DEFAULT 0,
    totalinsumos numeric(12,2) NOT NULL DEFAULT 0,
    totalomar numeric(12,2) NOT NULL DEFAULT 0,
    totalrogers numeric(12,2) NOT NULL DEFAULT 0,
    garantiacondicion boolean NOT NULL DEFAULT false,
    repuestoscondicion boolean NOT NULL DEFAULT false,
    numerofactura integer NOT NULL,
    CONSTRAINT total_facturas_pkey PRIMARY KEY (id),
    CONSTRAINT total_facturas_numerofactura_key UNIQUE (numerofactura)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.total_facturas
    OWNER to postgres;
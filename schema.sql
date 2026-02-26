


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";








ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."calculate_sales_metrics"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- 1. Cập nhật average_daily_sales dựa trên 30 ngày qua
  WITH sales_stats AS (
    SELECT
      oi.product_id,
      SUM(oi.quantity) / 30.0 as avg_sales
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE o.created_at >= (NOW() - INTERVAL '30 days')
      AND o.status = 'completed' -- Chỉ tính đơn hoàn thành
    GROUP BY oi.product_id
  ),
  inventory_stats AS (
    SELECT
        product_id,
        SUM(quantity) as total_stock
    FROM public.inventory
    GROUP BY product_id
  )

  UPDATE public.products p
  SET
    average_daily_sales = COALESCE(s.avg_sales, 0),
    estimated_stockout_days = CASE
        WHEN COALESCE(s.avg_sales, 0) > 0 THEN
             COALESCE(i.total_stock, 0) / s.avg_sales
        ELSE 9999 -- Nếu không bán được hoặc không có hàng thì set max
    END
  FROM sales_stats s
  LEFT JOIN inventory_stats i ON s.product_id = i.product_id
  WHERE p.id = s.product_id;

END;
$$;


ALTER FUNCTION "public"."calculate_sales_metrics"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    role, 
    phone_number, 
    avatar_url
  ) VALUES (
    new.id, 
    -- 1. Lấy tên (nếu không có thì đặt là User)
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'), 
    -- 2. QUAN TRỌNG: Lấy role từ metadata, nếu không có thì mặc định 'sale'
    COALESCE(new.raw_user_meta_data->>'role', 'sale'), 
    -- 3. Lấy số điện thoại
    new.raw_user_meta_data->>'phone_number',
    -- 4. Lấy avatar
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."handle_purchase_debt"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.status = 'completed' THEN
        UPDATE public.partners 
        SET current_debt = current_debt + (NEW.final_amount - NEW.paid_amount)
        WHERE id = NEW.supplier_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_purchase_debt"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."handle_purchase_inventory"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    p_warehouse_id BIGINT;
    p_code TEXT;
    p_status TEXT;
    current_stock INT;
BEGIN
    SELECT warehouse_id, code, status INTO p_warehouse_id, p_code, p_status
    FROM public.purchase_orders WHERE id = NEW.purchase_order_id;

    IF p_status = 'completed' THEN
        -- 1. Cộng tồn kho
        INSERT INTO public.inventory (product_id, warehouse_id, quantity)
        VALUES (NEW.product_id, p_warehouse_id, NEW.quantity)
        ON CONFLICT (product_id, warehouse_id) 
        DO UPDATE SET quantity = inventory.quantity + NEW.quantity
        RETURNING quantity INTO current_stock;

        -- 2. GHI LOG (MỚI)
        INSERT INTO public.inventory_logs (warehouse_id, product_id, change_amount, balance_after, type, reference_code)
        VALUES (p_warehouse_id, NEW.product_id, NEW.quantity, current_stock, 'purchase', p_code);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_purchase_inventory"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."handle_return_inventory"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    r_code TEXT;
    current_stock INT;
    -- Giả định trả về Kho Tổng (ID=1) hoặc cần logic lấy kho từ đơn gốc
    target_warehouse_id INT := 1; 
BEGIN
    SELECT code INTO r_code FROM public.returns WHERE id = NEW.return_id;

    -- 1. Cộng tồn kho
    UPDATE public.inventory 
    SET quantity = quantity + NEW.quantity
    WHERE product_id = NEW.product_id AND warehouse_id = target_warehouse_id
    RETURNING quantity INTO current_stock;
    
    -- 2. GHI LOG (MỚI) -> Loại là 'return'
    INSERT INTO public.inventory_logs (warehouse_id, product_id, change_amount, balance_after, type, reference_code)
    VALUES (target_warehouse_id, NEW.product_id, NEW.quantity, current_stock, 'return', r_code);

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_return_inventory"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."handle_transaction_debt"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- 1. Phiếu Thu (Receipt) -> Khách trả tiền -> Giảm nợ khách
    IF NEW.type = 'receipt' AND NEW.partner_id IS NOT NULL THEN
        UPDATE public.partners 
        SET current_debt = current_debt - NEW.amount 
        WHERE id = NEW.partner_id AND type = 'customer';
    END IF;

    -- 2. Phiếu Chi (Payment) -> Trả tiền NCC -> Giảm nợ NCC
    IF NEW.type = 'payment' AND NEW.partner_id IS NOT NULL THEN
        UPDATE public.partners 
        SET current_debt = current_debt - NEW.amount 
        WHERE id = NEW.partner_id AND type = 'supplier';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_transaction_debt"() OWNER TO "supabase_admin";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."_prisma_migrations" (
    "id" character varying(36) NOT NULL,
    "checksum" character varying(64) NOT NULL,
    "finished_at" timestamp with time zone,
    "migration_name" character varying(255) NOT NULL,
    "logs" "text",
    "rolled_back_at" timestamp with time zone,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "applied_steps_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."_prisma_migrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "user_name" "text",
    "action" "text" NOT NULL,
    "entity" "text",
    "entity_id" "text",
    "details" "jsonb",
    "ip_address" "text",
    "severity" "text" DEFAULT 'info'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."activity_logs" OWNER TO "supabase_admin";


ALTER TABLE "public"."activity_logs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."activity_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text",
    "parent_id" bigint,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "supabase_admin";


ALTER TABLE "public"."categories" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."categories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."daily_sales_reports" (
    "id" bigint NOT NULL,
    "report_date" "date" NOT NULL,
    "total_orders" integer,
    "total_revenue" numeric,
    "total_return_value" numeric,
    "net_revenue" numeric,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."daily_sales_reports" OWNER TO "supabase_admin";


ALTER TABLE "public"."daily_sales_reports" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."daily_sales_reports_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."inventory" (
    "id" bigint NOT NULL,
    "product_id" bigint,
    "warehouse_id" bigint,
    "quantity" integer DEFAULT 0,
    "location_code" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."inventory" OWNER TO "supabase_admin";


ALTER TABLE "public"."inventory" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."inventory_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."inventory_logs" (
    "id" bigint NOT NULL,
    "warehouse_id" bigint,
    "product_id" bigint,
    "change_amount" integer NOT NULL,
    "balance_after" integer NOT NULL,
    "type" "text",
    "reference_code" "text",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "inventory_logs_type_check" CHECK (("type" = ANY (ARRAY['purchase'::"text", 'sale'::"text", 'return'::"text", 'transfer_in'::"text", 'transfer_out'::"text", 'adjustment'::"text"])))
);


ALTER TABLE "public"."inventory_logs" OWNER TO "supabase_admin";


ALTER TABLE "public"."inventory_logs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."inventory_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" bigint NOT NULL,
    "order_id" bigint,
    "product_id" bigint,
    "product_sku" "text",
    "product_name" "text",
    "quantity" numeric DEFAULT 1,
    "price" numeric DEFAULT 0,
    "discount" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."order_items" OWNER TO "supabase_admin";


ALTER TABLE "public"."order_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."order_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" bigint NOT NULL,
    "code" "text" NOT NULL,
    "partner_id" bigint,
    "staff_id" "uuid",
    "staff_name_temp" "text",
    "warehouse_id" bigint,
    "total_amount" numeric DEFAULT 0,
    "discount" numeric DEFAULT 0,
    "final_amount" numeric DEFAULT 0,
    "paid_amount" numeric DEFAULT 0,
    "status" "text" DEFAULT 'completed'::"text",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "shipping_fee" numeric DEFAULT 0,
    "shipping_payer" "text" DEFAULT 'company'::"text",
    "has_vat" boolean DEFAULT false,
    "vat_rate" numeric DEFAULT 0,
    "vat_amount" numeric DEFAULT 0,
    CONSTRAINT "orders_shipping_payer_check" CHECK (("shipping_payer" = ANY (ARRAY['company'::"text", 'staff'::"text"]))),
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['completed'::"text", 'pending'::"text", 'cancelled'::"text", 'returned'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "supabase_admin";


ALTER TABLE "public"."orders" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."orders_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."partners" (
    "id" bigint NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "address" "text",
    "type" "text" DEFAULT 'customer'::"text",
    "group_name" "text",
    "assigned_staff_id" "uuid",
    "status" "text" DEFAULT 'active'::"text",
    "current_debt" numeric DEFAULT 0,
    "total_revenue" numeric DEFAULT 0,
    "debt_limit" numeric DEFAULT 10000000,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "partners_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'locked'::"text"]))),
    CONSTRAINT "partners_type_check" CHECK (("type" = ANY (ARRAY['customer'::"text", 'supplier'::"text"])))
);


ALTER TABLE "public"."partners" OWNER TO "supabase_admin";


ALTER TABLE "public"."partners" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."partners_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."product_compatibility" (
    "id" bigint NOT NULL,
    "product_id" bigint,
    "car_make" "text" NOT NULL,
    "car_model" "text" NOT NULL,
    "year_start" integer,
    "year_end" integer,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."product_compatibility" OWNER TO "supabase_admin";


ALTER TABLE "public"."product_compatibility" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."product_compatibility_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" bigint NOT NULL,
    "sku" "text" NOT NULL,
    "name" "text" NOT NULL,
    "oem_code" "text",
    "brand" "text",
    "unit" "text" DEFAULT 'Cái'::"text",
    "cost_price" numeric DEFAULT 0,
    "last_import_price" numeric DEFAULT 0,
    "retail_price" numeric DEFAULT 0,
    "min_stock_alert" integer DEFAULT 5,
    "image_url" "text",
    "category_id" bigint,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "supplier_id" bigint,
    "average_daily_sales" numeric DEFAULT 0,
    "estimated_stockout_days" numeric DEFAULT 9999
);


ALTER TABLE "public"."products" OWNER TO "supabase_admin";


ALTER TABLE "public"."products" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."products_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "role" "text" DEFAULT 'sale'::"text",
    "phone_number" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'sale'::"text", 'warehouse'::"text", 'accountant'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."purchase_order_items" (
    "id" bigint NOT NULL,
    "purchase_order_id" bigint,
    "product_id" bigint,
    "quantity" integer DEFAULT 1,
    "import_price" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."purchase_order_items" OWNER TO "supabase_admin";


ALTER TABLE "public"."purchase_order_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."purchase_order_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."purchase_orders" (
    "id" bigint NOT NULL,
    "code" "text" NOT NULL,
    "supplier_id" bigint,
    "warehouse_id" bigint,
    "staff_id" "uuid",
    "total_amount" numeric DEFAULT 0,
    "discount" numeric DEFAULT 0,
    "final_amount" numeric DEFAULT 0,
    "paid_amount" numeric DEFAULT 0,
    "status" "text" DEFAULT 'completed'::"text",
    "note" "text",
    "import_date" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "purchase_orders_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."purchase_orders" OWNER TO "supabase_admin";


ALTER TABLE "public"."purchase_orders" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."purchase_orders_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."return_items" (
    "id" bigint NOT NULL,
    "return_id" bigint,
    "product_id" bigint,
    "product_sku" "text",
    "product_name" "text",
    "quantity" numeric DEFAULT 1,
    "refund_price" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."return_items" OWNER TO "supabase_admin";


ALTER TABLE "public"."return_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."return_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."returns" (
    "id" bigint NOT NULL,
    "code" "text" NOT NULL,
    "order_id" bigint,
    "partner_id" bigint,
    "staff_name_temp" "text",
    "total_refund" numeric DEFAULT 0,
    "reason" "text",
    "status" "text" DEFAULT 'completed'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."returns" OWNER TO "supabase_admin";


ALTER TABLE "public"."returns" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."returns_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."sales_targets" (
    "id" bigint NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "month" integer NOT NULL,
    "year" integer NOT NULL,
    "target_revenue" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."sales_targets" OWNER TO "supabase_admin";


ALTER TABLE "public"."sales_targets" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."sales_targets_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."staff_sales_reports" (
    "id" bigint NOT NULL,
    "staff_name" "text" NOT NULL,
    "report_month" "text" NOT NULL,
    "total_orders" integer,
    "total_revenue" numeric,
    "return_value" numeric,
    "net_revenue" numeric,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."staff_sales_reports" OWNER TO "supabase_admin";


ALTER TABLE "public"."staff_sales_reports" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."staff_sales_reports_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."stock_transfer_items" (
    "id" bigint NOT NULL,
    "transfer_id" bigint,
    "product_id" bigint,
    "quantity" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."stock_transfer_items" OWNER TO "supabase_admin";


ALTER TABLE "public"."stock_transfer_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."stock_transfer_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."stock_transfers" (
    "id" bigint NOT NULL,
    "code" "text" NOT NULL,
    "from_warehouse_id" bigint,
    "to_warehouse_id" bigint,
    "staff_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "note" "text",
    "transfer_date" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "stock_transfers_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."stock_transfers" OWNER TO "supabase_admin";


ALTER TABLE "public"."stock_transfers" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."stock_transfers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."transaction_categories" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "type" "text",
    "is_system" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "transaction_categories_type_check" CHECK (("type" = ANY (ARRAY['income'::"text", 'expense'::"text"])))
);


ALTER TABLE "public"."transaction_categories" OWNER TO "supabase_admin";


ALTER TABLE "public"."transaction_categories" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."transaction_categories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" bigint NOT NULL,
    "code" "text" NOT NULL,
    "type" "text",
    "amount" numeric DEFAULT 0 NOT NULL,
    "payment_method" "text" DEFAULT 'cash'::"text",
    "category_id" bigint,
    "partner_id" bigint,
    "order_id" bigint,
    "return_id" bigint,
    "staff_id" "uuid",
    "note" "text",
    "transaction_date" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "transactions_type_check" CHECK (("type" = ANY (ARRAY['receipt'::"text", 'payment'::"text"])))
);


ALTER TABLE "public"."transactions" OWNER TO "supabase_admin";


ALTER TABLE "public"."transactions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."transactions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."warehouses" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "type" "text",
    "address" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "warehouses_type_check" CHECK (("type" = ANY (ARRAY['main'::"text", 'branch'::"text"])))
);


ALTER TABLE "public"."warehouses" OWNER TO "supabase_admin";


ALTER TABLE "public"."warehouses" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."warehouses_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."_prisma_migrations"
    ADD CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_sales_reports"
    ADD CONSTRAINT "daily_sales_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_sales_reports"
    ADD CONSTRAINT "daily_sales_reports_report_date_key" UNIQUE ("report_date");



ALTER TABLE ONLY "public"."inventory_logs"
    ADD CONSTRAINT "inventory_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_product_id_warehouse_id_key" UNIQUE ("product_id", "warehouse_id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_compatibility"
    ADD CONSTRAINT "product_compatibility_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_targets"
    ADD CONSTRAINT "sales_targets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_targets"
    ADD CONSTRAINT "sales_targets_staff_month_year_key" UNIQUE ("staff_id", "month", "year");



ALTER TABLE ONLY "public"."staff_sales_reports"
    ADD CONSTRAINT "staff_sales_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_sales_reports"
    ADD CONSTRAINT "staff_sales_reports_staff_name_report_month_key" UNIQUE ("staff_name", "report_month");



ALTER TABLE ONLY "public"."stock_transfer_items"
    ADD CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transaction_categories"
    ADD CONSTRAINT "transaction_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."warehouses"
    ADD CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_products_avg_sales" ON "public"."products" USING "btree" ("average_daily_sales");



CREATE INDEX "idx_products_stockout_days" ON "public"."products" USING "btree" ("estimated_stockout_days");



CREATE INDEX "idx_products_supplier_id" ON "public"."products" USING "btree" ("supplier_id");



CREATE OR REPLACE TRIGGER "on_purchase_completed" AFTER UPDATE OF "status" ON "public"."purchase_orders" FOR EACH ROW WHEN ((("old"."status" <> 'completed'::"text") AND ("new"."status" = 'completed'::"text"))) EXECUTE FUNCTION "public"."handle_purchase_debt"();



CREATE OR REPLACE TRIGGER "on_purchase_item_created" AFTER INSERT ON "public"."purchase_order_items" FOR EACH ROW EXECUTE FUNCTION "public"."handle_purchase_inventory"();



CREATE OR REPLACE TRIGGER "on_return_item_created" AFTER INSERT ON "public"."return_items" FOR EACH ROW EXECUTE FUNCTION "public"."handle_return_inventory"();



CREATE OR REPLACE TRIGGER "on_transaction_created" AFTER INSERT ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_transaction_debt"();



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."sales_targets"
    ADD CONSTRAINT "fk_sales_targets_staff" FOREIGN KEY ("staff_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_logs"
    ADD CONSTRAINT "inventory_logs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."inventory_logs"
    ADD CONSTRAINT "inventory_logs_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id");



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_assigned_staff_id_fkey" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."product_compatibility"
    ADD CONSTRAINT "product_compatibility_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."partners"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."partners"("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id");



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id");



ALTER TABLE ONLY "public"."stock_transfer_items"
    ADD CONSTRAINT "stock_transfer_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."stock_transfer_items"
    ADD CONSTRAINT "stock_transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "public"."warehouses"("id");



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "public"."warehouses"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."transaction_categories"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."profiles"("id");



CREATE POLICY "Admin View Logs" ON "public"."activity_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Inventory Staff Access" ON "public"."purchase_orders" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'warehouse'::"text"]))))));



CREATE POLICY "Inventory Staff Access Items" ON "public"."purchase_order_items" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'warehouse'::"text"]))))));



CREATE POLICY "Read Partners" ON "public"."partners" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'accountant'::"text"]))))) OR (("assigned_staff_id" = "auth"."uid"()) OR ("assigned_staff_id" IS NULL))));



CREATE POLICY "Read Products" ON "public"."products" FOR SELECT USING (true);



CREATE POLICY "System Write Logs" ON "public"."activity_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Transfer Access" ON "public"."stock_transfers" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'warehouse'::"text"]))))));



CREATE POLICY "Transfer Items Access" ON "public"."stock_transfer_items" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'warehouse'::"text"]))))));



CREATE POLICY "View Logs" ON "public"."inventory_logs" FOR SELECT USING (true);



CREATE POLICY "Write Products" ON "public"."products" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'warehouse'::"text"]))))));



ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."partners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_targets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_transfer_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_transfers" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


























































































































































































GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_prisma_migrations" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_prisma_migrations" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_prisma_migrations" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."activity_logs" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."activity_logs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."activity_logs" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."activity_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."activity_logs_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."activity_logs_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."activity_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."activity_logs_id_seq" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."categories" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."categories" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."categories" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."categories" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."daily_sales_reports" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."daily_sales_reports" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."daily_sales_reports" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."daily_sales_reports" TO "service_role";



GRANT ALL ON SEQUENCE "public"."daily_sales_reports_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."daily_sales_reports_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."daily_sales_reports_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."daily_sales_reports_id_seq" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."inventory_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."inventory_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_id_seq" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_logs" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_logs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_logs" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_logs_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."inventory_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_logs_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_items" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_items" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_items" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."orders" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."orders" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."orders" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."partners" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."partners" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."partners" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."partners" TO "service_role";



GRANT ALL ON SEQUENCE "public"."partners_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."partners_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."partners_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."partners_id_seq" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_compatibility" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_compatibility" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_compatibility" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_compatibility" TO "service_role";



GRANT ALL ON SEQUENCE "public"."product_compatibility_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."product_compatibility_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."product_compatibility_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."product_compatibility_id_seq" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."products" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."products" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."products" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."products" TO "service_role";



GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."purchase_order_items" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."purchase_order_items" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."purchase_order_items" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."purchase_order_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."purchase_order_items_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."purchase_order_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."purchase_order_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."purchase_order_items_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."purchase_orders" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."purchase_orders" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."purchase_orders" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."purchase_orders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."purchase_orders_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."purchase_orders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."purchase_orders_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."purchase_orders_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."return_items" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."return_items" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."return_items" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."return_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."return_items_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."return_items_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."return_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."return_items_id_seq" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."returns" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."returns" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."returns" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."returns" TO "service_role";



GRANT ALL ON SEQUENCE "public"."returns_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."returns_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."returns_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."returns_id_seq" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."sales_targets" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."sales_targets" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."sales_targets" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."sales_targets" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sales_targets_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."sales_targets_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sales_targets_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sales_targets_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."staff_sales_reports" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."staff_sales_reports" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."staff_sales_reports" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."staff_sales_reports" TO "service_role";



GRANT ALL ON SEQUENCE "public"."staff_sales_reports_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."staff_sales_reports_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."staff_sales_reports_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."staff_sales_reports_id_seq" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_transfer_items" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_transfer_items" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_transfer_items" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_transfer_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."stock_transfer_items_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."stock_transfer_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."stock_transfer_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."stock_transfer_items_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_transfers" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_transfers" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_transfers" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_transfers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."stock_transfers_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."stock_transfers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."stock_transfers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."stock_transfers_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."transaction_categories" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."transaction_categories" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."transaction_categories" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."transaction_categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."transaction_categories_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."transaction_categories_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."transaction_categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."transaction_categories_id_seq" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."transactions" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."transactions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."transactions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."transactions_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."transactions_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."transactions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."transactions_id_seq" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."warehouses" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."warehouses" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."warehouses" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."warehouses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."warehouses_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."warehouses_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."warehouses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."warehouses_id_seq" TO "authenticated";









































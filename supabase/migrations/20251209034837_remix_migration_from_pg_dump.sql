CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



SET default_table_access_method = heap;

--
-- Name: document_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    user_id uuid,
    session_token uuid DEFAULT gen_random_uuid() NOT NULL,
    remaining_prints integer DEFAULT 5 NOT NULL,
    max_prints integer DEFAULT 5 NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL,
    watermark_text text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    storage_path text NOT NULL,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: print_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.print_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    user_id uuid,
    session_token uuid NOT NULL,
    printed_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text
);


--
-- Name: document_access document_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_access
    ADD CONSTRAINT document_access_pkey PRIMARY KEY (id);


--
-- Name: document_access document_access_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_access
    ADD CONSTRAINT document_access_session_token_key UNIQUE (session_token);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: print_logs print_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.print_logs
    ADD CONSTRAINT print_logs_pkey PRIMARY KEY (id);


--
-- Name: document_access document_access_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_access
    ADD CONSTRAINT document_access_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: document_access document_access_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_access
    ADD CONSTRAINT document_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: print_logs print_logs_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.print_logs
    ADD CONSTRAINT print_logs_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: print_logs print_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.print_logs
    ADD CONSTRAINT print_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: document_access Users can create access for their documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create access for their documents" ON public.document_access FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.documents
  WHERE ((documents.id = document_access.document_id) AND (documents.uploaded_by = auth.uid())))));


--
-- Name: documents Users can delete their own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own documents" ON public.documents FOR DELETE USING ((uploaded_by = auth.uid()));


--
-- Name: documents Users can insert their own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own documents" ON public.documents FOR INSERT WITH CHECK ((uploaded_by = auth.uid()));


--
-- Name: print_logs Users can insert their own print logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own print logs" ON public.print_logs FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: document_access Users can update their own access records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own access records" ON public.document_access FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: document_access Users can view their own access records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own access records" ON public.document_access FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: documents Users can view their own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own documents" ON public.documents FOR SELECT USING ((uploaded_by = auth.uid()));


--
-- Name: print_logs Users can view their own print logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own print logs" ON public.print_logs FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: document_access; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.document_access ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: print_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.print_logs ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--



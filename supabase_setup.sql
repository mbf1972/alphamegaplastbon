-- ===============================================================
-- 1. CRÉATION DE LA TABLE 'documents'
-- ===============================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  categorie TEXT,              -- Nom du sous-dossier (ou NULL pour le dossier racine)
  titre TEXT NOT NULL,         -- Titre du document (nom du fichier sans .pdf)
  pdf TEXT NOT NULL,           -- URL publique directe vers le PDF
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour accélérer les recherches et filtres par catégorie
CREATE INDEX IF NOT EXISTS idx_documents_categorie ON public.documents(categorie);

-- Activer RLS et autoriser la lecture et l'insertion
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique documents" ON public.documents;
CREATE POLICY "Lecture publique documents" 
ON public.documents FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Insertion publique documents" ON public.documents;
CREATE POLICY "Insertion publique documents" 
ON public.documents FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Modification publique documents" ON public.documents;
CREATE POLICY "Modification publique documents" 
ON public.documents FOR UPDATE 
TO anon, authenticated 
USING (true);

-- ===============================================================
-- 2. CRÉATION DU BUCKET STORAGE 'documents-officiels' (PUBLIC)
-- ===============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents-officiels', 'documents-officiels', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Politiques d'accès pour le bucket (lecture et upload)
DROP POLICY IF EXISTS "Lecture publique des fichiers" ON storage.objects;
CREATE POLICY "Lecture publique des fichiers"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'documents-officiels');

DROP POLICY IF EXISTS "Upload public des fichiers" ON storage.objects;
CREATE POLICY "Upload public des fichiers"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'documents-officiels');

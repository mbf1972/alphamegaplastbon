import sys
import io
import os
import mimetypes
from pathlib import Path
from supabase import create_client

# UTF-8 encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

SUPABASE_URL = "https://jhzfnatsshpohnoswxcd.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoemZuYXRzc2hwb2hub3N3eGNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MTIzNTIsImV4cCI6MjA5NDI4ODM1Mn0.PMGnUk1Lh7-oFdxZ4sA-g6_3YsTgHhPk-KyFYxSlWlI"
BUCKET_NAME = "documents-officiels"

def main():
    root = Path('.')
    pdf_files = sorted([p for p in root.rglob('*.pdf') if p.is_file()])
    total = len(pdf_files)
    print(f"Total fichiers PDF à traiter : {total}")

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Réinitialisation de la table pour repartir sur une base propre
    try:
        print("Nettoyage des anciens enregistrements...")
        sb.table('documents').delete().neq('id', 0).execute()
        print("Table 'documents' prête.")
    except Exception as e:
        print("Note nettoyage :", e)

    success = 0
    errors = 0

    for idx, pdf_path in enumerate(pdf_files, 1):
        try:
            parent_dir = pdf_path.parent
            categorie = parent_dir.name if str(parent_dir) != '.' else None
            titre = pdf_path.stem

            # Nom de fichier sûr en ASCII pour Supabase Storage (ex: doc_001.pdf)
            storage_path = f"doc_{idx:03d}.pdf"

            with open(pdf_path, 'rb') as f:
                file_bytes = f.read()

            # Upload vers Supabase Storage
            sb.storage.from_(BUCKET_NAME).upload(
                path=storage_path,
                file=file_bytes,
                file_options={"content-type": "application/pdf", "upsert": "true"}
            )

            # Récupérer l'URL publique directe
            public_url = sb.storage.from_(BUCKET_NAME).get_public_url(storage_path)

            # Insertion dans la table
            row = {
                "categorie": categorie,
                "titre": titre,
                "pdf": public_url
            }
            sb.table('documents').insert(row).execute()
            print(f"[{idx}/{total}] OK : {titre} -> {storage_path}")
            success += 1

        except Exception as e:
            print(f"[{idx}/{total}] ERREUR sur {pdf_path.name} : {e}")
            errors += 1

    print("\n--- Bilan de l'importation ---")
    print(f"Succès : {success} / {total}")
    print(f"Erreurs : {errors}")

if __name__ == '__main__':
    main()

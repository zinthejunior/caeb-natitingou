import os
import sys
import django
import requests
import urllib.parse
from PIL import Image
from io import BytesIO
import time

sys.path.append(r"c:\wamp64\www\Projet Bibliothèque\app1 - Copie\backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from api.models import Book
from django.conf import settings

COVER_DIR = os.path.join(settings.MEDIA_ROOT, 'covers')
os.makedirs(COVER_DIR, exist_ok=True)

def search_google_books(title, author):
    query = f'intitle:"{title}"'
    if author and author.strip() != " ":
        query += f' inauthor:"{author}"'
    url = f"https://www.googleapis.com/books/v1/volumes?q={urllib.parse.quote(query)}&maxResults=3"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            items = data.get('items', [])
            for item in items:
                image_links = item.get('volumeInfo', {}).get('imageLinks', {})
                if 'thumbnail' in image_links:
                    return image_links['thumbnail'].replace('http:', 'https:')
    except Exception as e:
        print(f"Error Google Books: {e}")
    return None

def search_openlibrary_by_title(title, author):
    query = f'title="{title}"'
    if author and author.strip() != " ":
        query += f' AND author="{author}"'
    url = f"https://openlibrary.org/search.json?q={urllib.parse.quote(query)}&limit=3"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            for doc in data.get('docs', []):
                if 'cover_i' in doc:
                    return f"https://covers.openlibrary.org/b/id/{doc['cover_i']}-L.jpg"
    except Exception as e:
        print(f"Error OpenLibrary: {e}")
    return None

def download_and_save_cover(url, book_id):
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code == 200:
            img = Image.open(BytesIO(res.content))
            # Verify if it's not a 1x1 pixel image
            if img.size[0] > 10 and img.size[1] > 10:
                img_path = os.path.join(COVER_DIR, f"{book_id}.jpg")
                img.convert('RGB').save(img_path, 'JPEG')
                return f"covers/{book_id}.jpg"
    except Exception as e:
        print(f"Download failed: {e}")
    return None

def update_missing_covers():
    books = Book.objects.filter(couverture_url=" ") | Book.objects.filter(couverture_url__isnull=True)
    books = books[:100]  # Process by batches to avoid taking too long in testing
    print(f"Found {books.count()} books without covers to process.")
    
    for book in books:
        print(f"Processing: {book.titre} - {book.auteur}")
        cover_url = search_google_books(book.titre, book.auteur)
        if not cover_url:
            cover_url = search_openlibrary_by_title(book.titre, book.auteur)
            
        if cover_url:
            print(f"Found cover URL: {cover_url}")
            local_path = download_and_save_cover(cover_url, book.id)
            if local_path:
                book.couverture_url = local_path
                book.save()
                print(f"Successfully saved cover for {book.titre}")
            else:
                print("Failed to download image.")
        else:
            print("No cover found.")
        time.sleep(1) # Be nice to APIs

if __name__ == "__main__":
    update_missing_covers()

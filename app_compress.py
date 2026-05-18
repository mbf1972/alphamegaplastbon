import os
import sys
import io
import base64

# Automatically install required dependencies if missing
try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    from PIL import Image
except ImportError:
    print("Dépendances manquantes. Installation automatique de flask, flask-cors et pillow...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "flask", "flask-cors", "pillow"])
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    from PIL import Image

app = Flask(__name__)
CORS(app)  # Allow CORS requests from the local web application files

@app.route('/compress', methods=['POST'])
def compress_image():
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'status': 'Error', 'message': 'Aucune image reçue dans la requête.'}), 400
        
        # Extract base64 image data
        image_data_str = data['image']
        if ',' in image_data_str:
            image_data_str = image_data_str.split(',')[1]
            
        image_bytes = base64.b64decode(image_data_str)
        
        # Open image using Pillow
        img = Image.open(io.BytesIO(image_bytes))
        
        # Convert RGBA to RGB to avoid issues when converting to WebP
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
            
        # Proportional resize: limit max dimension to 800px
        max_size = 800
        img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
        # Compress to WebP in memory
        output_buffer = io.BytesIO()
        img.save(output_buffer, format='WEBP', quality=75, method=4)
        
        # Encode back to base64
        compressed_bytes = output_buffer.getvalue()
        webp_base64 = base64.b64encode(compressed_bytes).decode('utf-8')
        
        return jsonify({
            'status': 'Success',
            'webp_base64': f'data:image/webp;base64,{webp_base64}'
        })
        
    except Exception as e:
        print(f"Erreur lors de la compression : {e}")
        return jsonify({'status': 'Error', 'message': str(e)}), 500

if __name__ == '__main__':
    print("====================================================")
    print("   AMplast - Microservice Python de Compression WebP")
    print("   Adresse locale : http://127.0.0.1:5001")
    print("====================================================")
    # Run server on port 5001
    app.run(host='127.0.0.1', port=5001, debug=True)

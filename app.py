from flask import Flask, request, jsonify, Response, render_template
import yt_dlp
import requests

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/fetch_video_info', methods=['POST'])
def fetch_video_info():
    data = request.get_json()
    video_url = data.get('url')
    if not video_url:
        return jsonify({'success': False, 'error': 'No URL provided'}), 400

    ydl_opts = {
        'format': 'best',
        'noplaylist': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(video_url, download=False)
            formats = [
                {
                    'format_id': f['format_id'],
                    'resolution': f.get('resolution', 'unknown'),
                    'ext': f.get('ext', 'mp4'),
                    'filesize': f.get('filesize', 'unknown')
                }
                for f in info_dict.get('formats', [])
                if f.get('vcodec') != 'none'  # Exclude audio-only formats
            ]
            thumbnail_url = info_dict.get('thumbnail', '')
            title = info_dict.get('title', 'video')

        return jsonify({
            'success': True,
            'formats': formats,
            'thumbnail_url': thumbnail_url,
            'title': title
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/download_video')
def download_video():
    format_id = request.args.get('format_id')
    video_url = request.args.get('video_url')
    title = request.args.get('title', 'video')
    ext = request.args.get('ext', 'mp4')

    if not video_url or not format_id:
        return jsonify({'success': False, 'error': 'Missing parameters'}), 400

    ydl_opts = {
        'format': format_id,
        'noplaylist': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(video_url, download=False)
            # video_stream_url = info_dict['url']
            video_stream_url = info_dict.get('requested_formats', [info_dict])[0]['url']

        response = requests.get(video_stream_url, stream=True)
        if response.status_code != 200:
            return jsonify({'success': False, 'error': 'Failed to retrieve video content'}), 500

        def generate():
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    yield chunk

        headers = {
            'Content-Disposition': f'attachment; filename="{title}.{ext}"',
            'Content-Type': f'video/{ext}'
        }

        return Response(generate(), headers=headers)

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)

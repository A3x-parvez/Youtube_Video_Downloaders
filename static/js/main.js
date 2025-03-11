document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('urlInput');
    const fetchFormatsBtn = document.getElementById('fetchFormatsBtn');
    const cancelFetchBtn = document.getElementById('cancelFetchBtn');
    const loading = document.getElementById('loading');
    const message = document.getElementById('message');
    const videoPreview = document.getElementById('videoPreview');
    const thumbnail = document.getElementById('thumbnail');
    const formatSelect = document.getElementById('formatSelect');
    const downloadBtn = document.getElementById('downloadBtn');
    const downloadLoading = document.getElementById('downloadLoading');
    const mainCancelBtn = document.getElementById('mainCancelBtn');

    let controller = null;

    fetchFormatsBtn.addEventListener('click', async () => {
        const videoUrl = urlInput.value.trim();
        if (!videoUrl) {
            message.textContent = 'Please enter a YouTube video URL.';
            return;
        }

        if (controller) {
            controller.abort();
        }

        controller = new AbortController();
        const signal = controller.signal;

        loading.classList.remove('hidden');
        message.textContent = '';
        videoPreview.classList.add('hidden');
        formatSelect.innerHTML = '';
        cancelFetchBtn.classList.remove('hidden');

        try {
            const response = await fetch('/fetch_video_info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: videoUrl }),
                signal: signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                data.formats.forEach(format => {
                    const option = document.createElement('option');
                    const fileSizeMB = format.filesize ? (format.filesize / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown size';
                    option.value = format.format_id;
                    option.textContent = `${format.resolution} (${format.ext.toUpperCase()}) - ${fileSizeMB}`;
                    formatSelect.appendChild(option);
                });

                thumbnail.src = data.thumbnail_url;
                downloadBtn.dataset.videoUrl = videoUrl;
                downloadBtn.dataset.title = data.title;
                videoPreview.classList.remove('hidden');
            } else {
                message.textContent = `Error: ${data.error}`;
            }
        } catch (error) {
            message.textContent = error.name === 'AbortError' ? 'Fetch request canceled.' : `Error: ${error.message}`;
        } finally {
            loading.classList.add('hidden');
            cancelFetchBtn.classList.add('hidden');
            controller = null;
        }
    });

    cancelFetchBtn.addEventListener('click', () => {
        if (controller) {
            controller.abort();
            controller = null;
        }
    });

    downloadBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const selectedFormatId = formatSelect.value;
        const videoUrl = downloadBtn.dataset.videoUrl;
        const title = downloadBtn.dataset.title;

        if (!selectedFormatId || !videoUrl || !title) {
            message.textContent = 'Missing information to initiate download.';
            return;
        }

        const downloadUrl = `/download_video?video_url=${encodeURIComponent(videoUrl)}&format_id=${encodeURIComponent(selectedFormatId)}&title=${encodeURIComponent(title)}`;

        // Show loading animation
        downloadLoading.classList.remove('hidden');
        message.textContent = 'Download started...';

        // Create an anchor tag and trigger the download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', `${title}.mp4`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Hide loading animation after a delay
        setTimeout(() => {
            downloadLoading.classList.add('hidden');
        }, 3000);
    });

    // Refresh the page when "Cancel & Refresh" button is clicked
    mainCancelBtn.addEventListener('click', () => {
        location.reload();
    });
});

document.querySelectorAll('[data-video-id]').forEach((button) => {
  button.addEventListener('click', () => {
    const id = button.dataset.videoId;
    if (!id) return;
    const frame = button.closest('.video-frame');
    if (!frame) return;
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1`;
    iframe.title = button.getAttribute('aria-label')?.replace('Load ', '').replace(' from YouTube', '') ?? 'HardMagic video';
    iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    frame.replaceChildren(iframe);
  }, { once: true });
});

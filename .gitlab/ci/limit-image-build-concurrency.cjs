const os = require('node:os');

const configured = Number.parseInt(process.env.HARDMAGIC_IMAGE_BUILD_CONCURRENCY ?? '1', 10);
const concurrency = Number.isInteger(configured) && configured > 0 ? configured : 1;

// Astro 7.2.1 uses os.availableParallelism() for its static image queue.
// Keep the release build bounded on runners with large source images.
os.availableParallelism = () => concurrency;

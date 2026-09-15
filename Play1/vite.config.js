// vite.config.js
import { defineConfig } from 'vite';
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
    plugins: [
        viteSingleFile(),
        // Plugin tùy chỉnh: xóa type="module" và crossorigin khỏi HTML output khi build
        {
            name: 'remove-module-attrs',
            apply: 'build',
            transformIndexHtml(html) {
                return html
                    .replace(/ type="module"/g, '')
                    .replace(/ crossorigin/g, '');
            }
        }
    ],
    build: {
        assetsInlineLimit: 100000000, // Nhúng toàn bộ file dưới 100MB vào HTML
        sourcemap: false,             // Chặn source map làm tăng dung lượng
        minify: 'terser',             // Terser nén sâu hơn mặc định của Vite
        rollupOptions: {
            output: {
                format: 'iife',       // Đóng gói thành hàm tự gọi, không dùng ESM
                inlineDynamicImports: true, // Bắt buộc khi dùng IIFE với code splitting
            }
        }
    },
    assetsInclude: ['**/*.atlas.txt', '**/*.ttf'],
});
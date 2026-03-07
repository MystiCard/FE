/**
 * Đọc set.json và tạo file Excel (.xlsx) để import vào Admin Categories.
 * Backend chỉ chấp nhận .xlsx, chỉ đọc cột đầu tiên (categoryName).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const setPath = path.join(__dirname, '..', 'set.json');
const outPath = path.join(__dirname, '..', 'categories_import_from_set.xlsx');

const raw = fs.readFileSync(setPath, 'utf8');
const sets = JSON.parse(raw);

// Backend đọc cột A (index 0) = categoryName. Không thêm header để tránh tạo category tên "categoryName"
const data = sets.map((s) => [s.name || s.id || '']);

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(data);
XLSX.utils.book_append_sheet(wb, ws, 'Categories');
XLSX.writeFile(wb, outPath);

console.log('Created:', outPath);
console.log('Total categories:', data.length);
console.log('→ Upload file này trong Admin → Categories → Import (chỉ nhận .xlsx)');

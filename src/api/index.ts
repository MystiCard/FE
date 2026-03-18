/**
 * Admin API – tách theo domain, chỉ re-export các API mà admin sử dụng.
 * Các trang/component admin import từ @/api.
 * Phần còn lại của app vẫn dùng @/utils/api.
 */
export * from './types';
export * from './users';
export * from './cards';
export * from './categories';
export * from './orders';
export * from './transactions';
export * from './payments';
export * from './blindbox';
export * from './rateconfig';
export * from './roles';
export * from './permissions';

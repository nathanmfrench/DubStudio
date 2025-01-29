// API Configuration
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-api-gateway-url.amazonaws.com/prod';

// Video Upload Configuration
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
export const MAX_VIDEO_SIZE_MB = 100; // Maximum video size in MB

// Status Polling Configuration
export const STATUS_POLLING_INTERVAL = 5000; // 5 seconds
export const MAX_POLLING_ATTEMPTS = 60; // 5 minutes maximum polling time 
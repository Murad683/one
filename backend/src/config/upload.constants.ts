/**
 * Direct Upload konfiqurasiya sabitləri.
 */

/** 50 MB — bu həddən böyük video fayllar Direct Upload ilə göndərilir */
export const DIRECT_UPLOAD_THRESHOLD_BYTES = 50 * 1024 * 1024;

/** SAS URL-in keçərlilik müddəti (saniyə). 2 saat — 5GB fayllar üçün belə kifayətdir */
export const SAS_UPLOAD_EXPIRY_SECONDS = 7200;

/** Fayl ölçüsü uyğunsuzluğu üçün tolerans faizi (%) */
export const FILE_SIZE_TOLERANCE_PERCENT = 5;

/** Maksimum fayl ölçüsü (10 GB) — bundan böyük fayllar rədd edilir */
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024 * 1024;

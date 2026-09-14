import { defineRouting } from 'next-intl/routing';

export const locales = ['zh', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'zh';

export const routing = defineRouting({
    // 支持的所有语言
    locales,

    // 默认语言
    defaultLocale,

    // URL 路径策略: 始终显示语言前缀
    localePrefix: 'always',

    // 关闭自动语言检测，避免无前缀跳转触发语言漂移
    localeDetection: false,
});

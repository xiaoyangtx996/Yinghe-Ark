import type { Metadata } from "next";
import Script from "next/script";
import { Newsreader, Source_Sans_3 } from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import "../globals.css";
import { Providers } from "./providers";

import { locales } from '@/i18n/routing';

const sourceSans = Source_Sans_3({
    subsets: ['latin'],
    variable: '--font-source-sans',
    display: 'swap',
    weight: ['400', '500', '600', '700'],
});

const newsreader = Newsreader({
    subsets: ['latin'],
    variable: '--font-newsreader',
    display: 'swap',
    weight: ['500', '600'],
});



type SupportedLocale = (typeof locales)[number]

// 动态元数据生成
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'layout' })

    return {
        title: t('title'),
        description: t('description'),
        icons: {
            icon: '/logo.ico?v=2',
            shortcut: '/logo.ico?v=2',
            apple: '/logo.png?v=2',
        },
    };
}

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    // 验证 locale 是否有效
    if (!locales.includes(locale as SupportedLocale)) {
        notFound();
    }

    // 获取翻译消息
    const messages = await getMessages();

    return (
        <html lang={locale} suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `(function(){try{var k='waoowaoo-theme';var t=localStorage.getItem(k);if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var r=document.documentElement;if(t==='dark')r.classList.add('dark');else r.classList.remove('dark');r.dataset.theme=t;}catch(e){}})();`,
                    }}
                />
                {process.env.NODE_ENV === "development" && (
                    <Script
                        src="//unpkg.com/react-grab/dist/index.global.js"
                        crossOrigin="anonymous"
                        strategy="beforeInteractive"
                    />
                )}
            </head>
            <body
                className={`${sourceSans.variable} ${newsreader.variable} ${GeistMono.variable} antialiased`}
            >
                <NextIntlClientProvider messages={messages}>
                    <Providers>
                        {children}
                    </Providers>
                </NextIntlClientProvider>

            </body>
        </html>
    );
}

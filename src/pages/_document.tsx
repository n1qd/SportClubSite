import { Head, Html, Main, NextScript } from "next/document";

const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('hsc_theme');
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) {}
})();
`;

export default function Document() {
  return (
    <Html lang="ru">
      <Head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

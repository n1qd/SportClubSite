import type { NextPageContext } from "next";
import { SiteErrorPage } from "@/components/pages/SiteErrorPage";

type Props = { statusCode?: number };

function ErrorPage({ statusCode }: Props) {
  if (statusCode === 404) {
    return (
      <SiteErrorPage
        statusCode={404}
        title="Страница не найдена"
        description="Такой страницы нет или ссылка устарела."
      />
    );
  }

  return (
    <SiteErrorPage
      statusCode={statusCode}
      title="Что-то пошло не так"
      description="На сервере произошла ошибка или соединение прервалось. Попробуйте обновить страницу чуть позже."
    />
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext): Props => {
  const statusCode = res ? res.statusCode : err && "statusCode" in err ? (err.statusCode as number) : 500;
  return { statusCode: statusCode ?? 500 };
};

export default ErrorPage;

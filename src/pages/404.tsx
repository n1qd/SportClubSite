import { SiteErrorPage } from "@/components/pages/SiteErrorPage";

export default function NotFoundPage() {
  return (
    <SiteErrorPage
      statusCode={404}
      title="Страница не найдена"
      description="Такой страницы нет или ссылка устарела. Проверьте адрес или вернитесь на главную."
    />
  );
}

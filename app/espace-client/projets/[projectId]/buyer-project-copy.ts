import type { AppLocale } from "@/lib/i18n/config";

export type BuyerProjectCopy = {
  back: string;
  buyer: string;
  client: string;
  status: string;
  createdAt: string;
  linkedSearch: string;
  preparing: string;
  searchArea: string;
  searchAreaFallback: string;
  budget: string;
  budgetFallback: string;
  searchStatus: string;
  searchStatusFallback: string;
  financing: string;
  financingFallback: string;
  searchedTypes: string;
  typesFallback: string;
  multiProject: string;
};

export const buyerProjectCopy: Record<AppLocale, BuyerProjectCopy> = {
  fr: {
    back: "Retour à mes projets",
    buyer: "Projet acquéreur",
    client: "Projet client",
    status: "Statut projet",
    createdAt: "Création",
    linkedSearch: "Recherche rattachée",
    preparing: "Projet en préparation",
    searchArea: "Zone de recherche",
    searchAreaFallback: "Zone en cours de qualification",
    budget: "Budget",
    budgetFallback: "Budget à préciser",
    searchStatus: "Statut recherche",
    searchStatusFallback: "Recherche en cours de qualification",
    financing: "Financement",
    financingFallback: "Situation non renseignée",
    searchedTypes: "Types recherchés",
    typesFallback: "Types de biens à préciser",
    multiProject:
      "Votre compte peut déjà accueillir plusieurs projets. Le détail de ce parcours continuera à s'enrichir sans changer votre mode de connexion.",
  },
  en: {
    back: "Back to my projects",
    buyer: "Buyer project",
    client: "Client project",
    status: "Project status",
    createdAt: "Created on",
    linkedSearch: "Linked search",
    preparing: "Project being prepared",
    searchArea: "Search area",
    searchAreaFallback: "Area being qualified",
    budget: "Budget",
    budgetFallback: "Budget to be clarified",
    searchStatus: "Search status",
    searchStatusFallback: "Search being qualified",
    financing: "Financing",
    financingFallback: "Situation not provided",
    searchedTypes: "Requested property types",
    typesFallback: "Property types to be defined",
    multiProject:
      "Your account can already host several projects. The detail of this journey will continue to grow without changing your login mode.",
  },
  es: {
    back: "Volver a mis proyectos",
    buyer: "Proyecto comprador",
    client: "Proyecto cliente",
    status: "Estado del proyecto",
    createdAt: "Creación",
    linkedSearch: "Búsqueda vinculada",
    preparing: "Proyecto en preparación",
    searchArea: "Zona de búsqueda",
    searchAreaFallback: "Zona en fase de cualificación",
    budget: "Presupuesto",
    budgetFallback: "Presupuesto por precisar",
    searchStatus: "Estado de la búsqueda",
    searchStatusFallback: "Búsqueda en fase de cualificación",
    financing: "Financiación",
    financingFallback: "Situación no indicada",
    searchedTypes: "Tipos buscados",
    typesFallback: "Tipos de inmueble por precisar",
    multiProject:
      "Su cuenta ya puede acoger varios proyectos. El detalle de este recorrido seguirá enriqueciéndose sin cambiar su modo de conexión.",
  },
  ru: {
    back: "Назад к моим проектам",
    buyer: "Проект покупателя",
    client: "Клиентский проект",
    status: "Статус проекта",
    createdAt: "Создан",
    linkedSearch: "Привязанный поиск",
    preparing: "Проект в подготовке",
    searchArea: "Зона поиска",
    searchAreaFallback: "Зона уточняется",
    budget: "Бюджет",
    budgetFallback: "Бюджет уточняется",
    searchStatus: "Статус поиска",
    searchStatusFallback: "Поиск в процессе квалификации",
    financing: "Финансирование",
    financingFallback: "Информация не указана",
    searchedTypes: "Искомые типы объектов",
    typesFallback: "Типы объектов уточняются",
    multiProject:
      "Ваша учетная запись уже может объединять несколько проектов. Детализация этого сценария будет расширяться без изменения способа входа.",
  },
};

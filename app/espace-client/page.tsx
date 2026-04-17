import Link from "next/link";
import { getRequestLocale } from "@/lib/i18n/request";
import { formatCurrency, formatDate } from "@/lib/i18n/format";
import { localizePath } from "@/lib/i18n/routing";
import { requireClientSpacePageContext } from "@/lib/client-space/auth";
import {
  getClientPortalMandateLabel,
  groupClientPortalProjects,
  listClientPortalProjects,
} from "@/services/clients/client-portal.service";

export default async function SellerPortalHomePage() {
  const locale = await getRequestLocale();
  const context = await requireClientSpacePageContext();
  const projects = await listClientPortalProjects(context.clientProfile.id);
  const groups = groupClientPortalProjects(projects);
  const sellerProjects = projects.filter((project) => project.projectType === "seller");
  const copy = {
    fr: {
      greeting: "Bonjour",
      intro: "Retrouvez ici tous vos projets rattachés à Sillage Immo, leurs prochaines étapes et vos points de contact.",
      projects: "Projets rattachés",
      lastLogin: "Dernière connexion",
      firstLogin: "Première connexion",
      nextStep: "Prochaine étape",
      book: "Un rendez-vous peut être réservé en ligne.",
      consult: "Consultez vos projets pour voir la prochaine action recommandée.",
      ready: "Votre espace client est prêt à accueillir vos prochains projets.",
      yourProjects: "Vos projets",
      none: "Aucun projet n'est encore rattaché à votre compte.",
      valuationMissing: "Aucune estimation détaillée",
      mandate: "Mandat",
      updated: "Mise à jour le",
      projectInQualification: "Projet en cours de qualification",
      sellerProject: "Projet vendeur",
      clientProject: "Projet client",
    },
    en: {
      greeting: "Hello",
      intro: "Here you can find all your projects linked to Sillage Immo, their next steps and your points of contact.",
      projects: "Linked projects",
      lastLogin: "Last login",
      firstLogin: "First login",
      nextStep: "Next step",
      book: "An appointment can be booked online.",
      consult: "Open your projects to see the next recommended action.",
      ready: "Your client portal is ready to host your upcoming projects.",
      yourProjects: "Your projects",
      none: "No project is currently linked to your account.",
      valuationMissing: "No detailed valuation yet",
      mandate: "Mandate",
      updated: "Updated on",
      projectInQualification: "Project being qualified",
      sellerProject: "Seller project",
      clientProject: "Client project",
    },
    es: {
      greeting: "Hola",
      intro: "Aquí encontrará todos sus proyectos vinculados a Sillage Immo, sus próximas etapas y sus puntos de contacto.",
      projects: "Proyectos vinculados",
      lastLogin: "Última conexión",
      firstLogin: "Primera conexión",
      nextStep: "Próxima etapa",
      book: "Se puede reservar una cita en línea.",
      consult: "Consulte sus proyectos para ver la próxima acción recomendada.",
      ready: "Su espacio cliente está listo para acoger sus próximos proyectos.",
      yourProjects: "Sus proyectos",
      none: "Aún no hay ningún proyecto vinculado a su cuenta.",
      valuationMissing: "Aún no hay valoración detallada",
      mandate: "Mandato",
      updated: "Actualizado el",
      projectInQualification: "Proyecto en fase de cualificación",
      sellerProject: "Proyecto vendedor",
      clientProject: "Proyecto cliente",
    },
    ru: {
      greeting: "Здравствуйте",
      intro: "Здесь вы найдете все проекты, связанные с Sillage Immo, их следующие этапы и ваши контактные точки.",
      projects: "Связанные проекты",
      lastLogin: "Последний вход",
      firstLogin: "Первый вход",
      nextStep: "Следующий этап",
      book: "Встречу можно забронировать онлайн.",
      consult: "Откройте проекты, чтобы увидеть рекомендуемое следующее действие.",
      ready: "Ваше клиентское пространство готово принять ваши будущие проекты.",
      yourProjects: "Ваши проекты",
      none: "К вашей учетной записи пока не привязан ни один проект.",
      valuationMissing: "Подробная оценка пока недоступна",
      mandate: "Мандат",
      updated: "Обновлено",
      projectInQualification: "Проект в процессе квалификации",
      sellerProject: "Проект продавца",
      clientProject: "Клиентский проект",
    },
  }[locale];
  const formatPortalDate = (value: string) => formatDate(value, locale);
  const formatPrice = (value: number | null) =>
    typeof value === "number" ? formatCurrency(value, locale, "EUR") : copy.valuationMissing;

  return (
    <section className="space-y-6">
      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
        <h2 className="text-2xl font-semibold text-[#141446]">
          {copy.greeting} {context.clientProfile.firstName ?? context.clientProfile.fullName ?? "!"}
        </h2>
        <p className="mt-2 text-sm text-[#141446]/75">{copy.intro}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-[#141446]/60">{copy.projects}</p>
            <p className="mt-2 text-2xl font-semibold text-[#141446]">{projects.length}</p>
          </div>
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-[#141446]/60">{copy.lastLogin}</p>
            <p className="mt-2 text-sm text-[#141446]">
              {context.clientProfile.lastLoginAt
                ? formatPortalDate(context.clientProfile.lastLoginAt)
                : copy.firstLogin}
            </p>
          </div>
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-[#141446]/60">{copy.nextStep}</p>
            <p className="mt-2 text-sm text-[#141446]">
              {sellerProjects.some((project) => project.seller?.hasAppointmentLink)
                ? copy.book
                : projects.length > 0
                  ? copy.consult
                  : copy.ready}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
        <h2 className="text-xl font-semibold text-[#141446]">{copy.yourProjects}</h2>
        {projects.length === 0 ? (
          <p className="mt-4 text-sm text-[#141446]/75">{copy.none}</p>
        ) : (
          <div className="mt-4 space-y-6">
            {groups.map((group) => (
              <section key={group.projectType} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#141446]/70">
                    {group.projectTypeLabel}
                  </h3>
                  <span className="text-xs text-[#141446]/55">
                    {group.projects.length} projet{group.projects.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {group.projects.map((project) => (
                    <Link
                      key={project.id}
                      href={localizePath(project.href, locale)}
                      className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-5 transition hover:border-[rgba(20,20,70,0.28)]"
                    >
                      <p className="text-xs uppercase tracking-[0.16em] text-[#141446]/55">
                        {project.projectTypeLabel}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#141446]">
                        {project.title ??
                          (project.projectType === "seller" ? copy.sellerProject : copy.clientProject)}
                      </p>
                      <p className="mt-1 text-sm text-[#141446]/70">
                        {project.primaryDescriptor ?? copy.projectInQualification}
                      </p>
                      <p className="mt-2 text-sm text-[#141446]/75">{project.statusLabel}</p>
                      {project.seller ? (
                        <>
                          <p className="mt-1 text-sm text-[#141446]/70">
                            {copy.mandate} : {getClientPortalMandateLabel(project.seller.mandateStatus, locale)}
                          </p>
                          <p className="mt-3 text-sm text-[#141446]/80">
                            Estimation : <strong>{formatPrice(project.seller.latestValuationPrice)}</strong>
                          </p>
                        </>
                      ) : null}
                      {project.secondaryDescriptor ? (
                        <p className="mt-1 text-sm text-[#141446]/70">{project.secondaryDescriptor}</p>
                      ) : null}
                      {project.nextAction ? (
                        <p className="mt-1 text-sm text-[#141446]/70">{project.nextAction}</p>
                      ) : null}
                      {project.seller?.latestValuationSyncedAt ? (
                        <p className="mt-1 text-xs text-[#141446]/60">
                          {copy.updated} {formatPortalDate(project.seller.latestValuationSyncedAt)}
                        </p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

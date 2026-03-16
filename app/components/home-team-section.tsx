import { listPublicTeamMembers } from "@/services/home/team.service";

export async function HomeTeamSection() {
  const members = await listPublicTeamMembers();

  if (members.length === 0) {
    return null;
  }

  return (
    <section className="sillage-section-light">
      <div className="w-full px-6 py-10 md:px-10 md:py-14 xl:px-14 2xl:px-20 space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.16em] opacity-70">Notre equipe</p>
          <h2 className="sillage-section-title">Des conseillers identifies et joignables</h2>
          <p className="max-w-3xl text-sm opacity-75 md:text-base">
            Une equipe locale, visible et accessible, avec un interlocuteur clair pour chaque projet.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <article key={member.id} className="overflow-hidden rounded-[28px] bg-white/80 shadow-sm">
              <div className="aspect-[3/4] bg-[#f4ece4]">
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt={member.fullName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#141446]/55">
                    Portrait a venir
                  </div>
                )}
              </div>
              <div className="space-y-3 p-6 text-[#141446]">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[#141446]/55">{member.roleLabel}</p>
                  <h3 className="mt-2 text-xl font-semibold">{member.fullName}</h3>
                  {member.title ? <p className="mt-1 text-sm text-[#141446]/70">{member.title}</p> : null}
                </div>
                <div className="space-y-1 text-sm">
                  {member.phone ? (
                    <a href={`tel:${member.phone.replace(/\s+/g, "")}`} className="block hover:underline">
                      {member.phone}
                    </a>
                  ) : null}
                  <a href={`mailto:${member.email}`} className="block hover:underline">
                    {member.email}
                  </a>
                </div>
                {member.bio ? <p className="text-sm leading-6 text-[#141446]/80">{member.bio}</p> : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

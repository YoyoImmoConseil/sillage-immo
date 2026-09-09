import type { AppLocale } from "@/lib/i18n/config";

/** Textes de la page Gestion locative, par langue. */
export type GestionPageCopy = {
  seo: { title: string; description: string };
  hero: { eyebrow: string; title: string; subtitle: string; imageAlt: string };
  ctaCall: string;
  ctaEmail: string;
  manifesto: { title: string; paragraphs: string[] };
  services: {
    eyebrow: string;
    title: string;
    blocks: { title: string; body: string; items: string[] }[];
  };
  pricing: {
    eyebrow: string;
    title: string;
    lines: { label: string; value: string; note: string }[];
    included: { title: string; intro: string; items: string[] };
    twoMissions: { title: string; body: string };
    footnote: string;
  };
  steps: { eyebrow: string; title: string; items: { title: string; body: string }[] };
  faq: { eyebrow: string; title: string; items: { question: string; answer: string }[] };
  contact: { eyebrow: string; title: string; body: string; phoneLabel: string; emailLabel: string; hint: string };
};

const fr: GestionPageCopy = {
  seo: {
    title: "Gestion locative à Nice — Loyers sécurisés, gestion complète | Sillage Immo",
    description:
      "Confiez la gestion de votre appartement à Nice à Sillage Immo : mise en location, encaissement des loyers, compte rendu mensuel, garantie loyers impayés, suivi des travaux. Honoraires publics.",
  },
  hero: {
    eyebrow: "Gestion locative",
    title: "Votre bien loué, géré, sécurisé. Vous, tranquille.",
    subtitle:
      "De la recherche du locataire au reversement du loyer, une gestion complète, un interlocuteur, un compte rendu chaque mois, et des honoraires connus d'avance.",
    imageAlt: "La place Masséna à Nice et son miroir d'eau au petit matin",
  },
  ctaCall: "Parler de mon bien",
  ctaEmail: "Écrire à la gestion",
  manifesto: {
    title: "Ce que gérer veut dire",
    paragraphs: [
      "Louer un appartement, ce n'est pas encaisser un virement chaque mois. C'est choisir un locataire sur un dossier solide, rédiger un bail qui tient, faire un état des lieux qui protège, appeler le loyer, régulariser les charges, réviser au bon indice, répondre au dégât des eaux un dimanche, et savoir quoi faire, juridiquement, le jour où le loyer ne vient pas.",
      "Chez Sillage, la gestion est tenue par une équipe qui fait cela tous les jours, avec un logiciel de gestion professionnel, une garantie financière et une assurance responsabilité civile comme la loi l'exige, et la compétence d'un juriste sur chaque bail et chaque contentieux. Vous recevez votre loyer, votre compte rendu, et vous n'avez pas à y penser.",
    ],
  },
  services: {
    eyebrow: "Nos services",
    title: "Tout ce que nous prenons en charge",
    blocks: [
      {
        title: "Mise en location",
        body: "Trouver le bon locataire vite, sans brader le loyer ni prendre de risque sur le dossier.",
        items: [
          "Estimation du loyer sur le marché réel et l'encadrement en vigueur",
          "Photos, annonce et diffusion sur sillage-immo.com et les portails",
          "Visites, sélection des dossiers, vérification des garanties",
          "Bail, annexes et diagnostics conformes, état des lieux d'entrée détaillé",
        ],
      },
      {
        title: "Gestion courante",
        body: "Le quotidien du bailleur, sans que vous ayez à le vivre.",
        items: [
          "Appel et encaissement des loyers, reversement les 10, 20 et 30 : jamais plus de dix jours entre le paiement du locataire et votre virement",
          "Compte rendu de gestion chaque mois, relevé annuel pour vos revenus fonciers",
          "Régularisation des charges, révision annuelle du loyer",
          "Relation avec le locataire, le syndic et les artisans ; devis et suivi des travaux",
        ],
      },
      {
        title: "Sécurité",
        body: "Ce qui vous protège quand quelque chose ne se passe pas comme prévu.",
        items: [
          "Garantie loyers impayés en option, avec protection juridique",
          "Relances et procédure de recouvrement menées par nos soins",
          "Gestion des sinistres et des déclarations d'assurance",
          "Garantie financière et assurance responsabilité civile professionnelle",
        ],
      },
    ],
  },
  pricing: {
    eyebrow: "Honoraires",
    title: "Un seul tarif, qui couvre tout",
    lines: [
      { label: "Gestion locative", value: "7,5 % HT", note: "du loyer encaissé, charges comprises. Tout compris, sans ligne supplémentaire. Rien n'est facturé quand le bien est vacant." },
      { label: "Garantie loyers impayés", value: "2,8 %", note: "du loyer, en option. Couvre les impayés, les dégradations et les frais de procédure." },
      { label: "Mise en location", value: "Mission distincte", note: "Facturée une fois, à la signature du bail, dans la limite du plafond légal. Ce n'est pas de la gestion." },
    ],
    included: {
      title: "Inclus dans les 7,5 %, sans supplément",
      intro: "Un taux plus bas ailleurs cache souvent une grille de frais à l'acte. Chez nous, ces prestations font partie de la mission :",
      items: [
        "Représentation à l'assemblée générale de copropriété",
        "Déplacements sur place : suivi de travaux, sinistre, visite annuelle",
        "Relances, mise en demeure et suivi de la procédure en cas d'impayé",
        "Régularisation des charges et révision annuelle du loyer",
        "Déclaration et suivi des sinistres auprès des assureurs",
        "Relevé annuel pour vos revenus fonciers, attestations et courriers",
        "État des lieux de sortie et restitution du dépôt de garantie",
      ],
    },
    twoMissions: {
      title: "Deux missions, pas une",
      body:
        "Mettre en location et gérer sont deux métiers, facturés séparément et à des moments différents. La mise en location est ponctuelle : trouver, sélectionner, contractualiser ; ses honoraires sont plafonnés par la loi et payés une fois. La gestion est continue : encaisser, suivre, protéger, chaque mois, pour 7,5 % HT et rien d'autre. Un devis qui mélange les deux n'est pas comparable à un autre.",
    },
    footnote:
      "Honoraires de gestion déductibles de vos revenus fonciers au régime réel. Aucun frais d'entrée, aucun frais de sortie.",
  },
  steps: {
    eyebrow: "Comment ça commence",
    title: "Quatre étapes pour nous confier votre bien",
    items: [
      { title: "Un échange", body: "Vous nous décrivez le bien, sa situation (vide, occupé, en travaux) et ce que vous attendez de la gestion." },
      { title: "Une visite et un loyer", body: "Nous visitons, vérifions les diagnostics et fixons ensemble le loyer et le calendrier." },
      { title: "Le mandat de gestion", body: "Un mandat clair, signé électroniquement, qui liste ce que nous faisons et ce que nous vous devons." },
      { title: "La prise en charge", body: "Reprise du bail en cours ou mise en location, ouverture de votre dossier, premier compte rendu le mois suivant." },
    ],
  },
  faq: {
    eyebrow: "Questions fréquentes",
    title: "Ce que les propriétaires nous demandent",
    items: [
      {
        question: "Que se passe-t-il si le locataire ne paie pas ?",
        answer:
          "Nous relançons dès le premier retard, mettons en demeure et engageons la procédure si nécessaire. Avec la garantie loyers impayés, vous continuez à percevoir votre loyer pendant la procédure.",
      },
      {
        question: "Qui décide des travaux ?",
        answer:
          "Vous. Nous obtenons les devis, vous les validons, et nous suivons l'intervention. Seules les urgences (fuite, panne de chauffage) sont traitées sans attendre, dans la limite convenue au mandat.",
      },
      {
        question: "Mon bien est déjà loué, pouvez-vous reprendre la gestion ?",
        answer: "Oui. Nous reprenons le bail en cours, informons le locataire du changement d'interlocuteur et vérifions que le dossier est complet.",
      },
      {
        question: "Puis-je arrêter la gestion ?",
        answer: "Le mandat est résiliable avec un préavis, sans frais de sortie. Vous récupérez votre dossier complet et le dépôt de garantie est transféré selon la loi.",
      },
    ],
  },
  contact: {
    eyebrow: "Nous joindre",
    title: "Parlons de votre bien",
    body: "Un appel de quinze minutes suffit pour savoir si nous pouvons vous aider et à quelles conditions.",
    phoneLabel: "Ligne gestion locative",
    emailLabel: "Email",
    hint: "Le plus rapide pour nous joindre reste l'email : nous répondons sous un jour ouvré.",
  },
};

const en: GestionPageCopy = {
  seo: {
    title: "Property management in Nice — Secured rent, full-service management | Sillage Immo",
    description:
      "Entrust the management of your Nice apartment to Sillage Immo: letting, rent collection, monthly statement, rent guarantee insurance, maintenance follow-up. Public fees.",
  },
  hero: {
    eyebrow: "Property management",
    title: "Your property let, managed, secured. You, at ease.",
    subtitle:
      "From finding the tenant to paying out the rent: full-service management, one point of contact, a statement every month, and fees known in advance.",
    imageAlt: "Place Masséna in Nice and its reflecting pool in the early morning",
  },
  ctaCall: "Talk about my property",
  ctaEmail: "Write to the management team",
  manifesto: {
    title: "What managing really means",
    paragraphs: [
      "Letting an apartment is not cashing a transfer every month. It is choosing a tenant on a solid file, drafting a lease that holds, doing an inventory that protects, calling the rent, adjusting charges, revising on the right index, answering a water leak on a Sunday, and knowing what to do, legally, the day the rent does not come.",
      "At Sillage, management is run by a team that does this every day, with professional management software, the financial guarantee and liability insurance the law requires, and a lawyer's competence on every lease and every dispute. You receive your rent and your statement, and you do not have to think about it.",
    ],
  },
  services: {
    eyebrow: "Our services",
    title: "Everything we take care of",
    blocks: [
      { title: "Letting", body: "Find the right tenant quickly, without underpricing the rent or taking risks on the file.", items: ["Rent set on the real market and current regulations", "Photos, listing and marketing on sillage-immo.com and the portals", "Viewings, file selection, guarantee checks", "Compliant lease, annexes and diagnostics, detailed check-in inventory"] },
      { title: "Day-to-day management", body: "The landlord's routine, without you having to live it.", items: ["Rent calls and collection, payout on the 10th, 20th and 30th: never more than ten days between the tenant's payment and your transfer", "Management statement every month, annual summary for your tax return", "Service charge adjustments, annual rent revision", "Relations with tenant, building manager and contractors; quotes and works follow-up"] },
      { title: "Security", body: "What protects you when something does not go as planned.", items: ["Optional rent guarantee insurance with legal protection", "Reminders and recovery procedure handled by us", "Claims and insurance declarations", "Financial guarantee and professional liability insurance"] },
    ],
  },
  pricing: {
    eyebrow: "Fees",
    title: "One rate that covers everything",
    lines: [
      { label: "Property management", value: "7.5% excl. VAT", note: "of rent collected, charges included. All-inclusive, no extra lines. Nothing is billed while the property is vacant." },
      { label: "Rent guarantee insurance", value: "2.8%", note: "of the rent, optional. Covers unpaid rent, damage and legal costs." },
      { label: "Letting", value: "Separate service", note: "Billed once, at lease signing, within the legal cap. It is not management." },
    ],
    included: {
      title: "Included in the 7.5%, no surcharge",
      intro: "A lower rate elsewhere often hides a menu of per-task fees. With us, these tasks are part of the job:",
      items: [
        "Representation at the co-ownership general meeting",
        "On-site visits: works follow-up, claims, annual inspection",
        "Reminders, formal notice and procedure follow-up in case of arrears",
        "Service charge adjustments and annual rent revision",
        "Claims declaration and follow-up with insurers",
        "Annual statement for your tax return, certificates and letters",
        "Check-out inventory and deposit refund",
      ],
    },
    twoMissions: {
      title: "Two services, not one",
      body:
        "Letting and managing are two trades, billed separately and at different times. Letting is one-off: find, select, contract; its fees are capped by law and paid once. Management is continuous: collect, follow, protect, every month, for 7.5% excl. VAT and nothing else. A quote that blends the two cannot be compared with another.",
    },
    footnote: "Management fees are deductible from rental income under the actual-expenses regime. No entry fee, no exit fee.",
  },
  steps: {
    eyebrow: "How it starts",
    title: "Four steps to entrust us with your property",
    items: [
      { title: "A conversation", body: "You describe the property, its situation (vacant, occupied, under works) and what you expect from management." },
      { title: "A visit and a rent", body: "We visit, check the diagnostics and set the rent and the calendar together." },
      { title: "The management mandate", body: "A clear mandate, signed electronically, listing what we do and what we owe you." },
      { title: "Handover", body: "Takeover of the current lease or letting, opening of your file, first statement the following month." },
    ],
  },
  faq: {
    eyebrow: "Frequently asked",
    title: "What owners ask us",
    items: [
      { question: "What happens if the tenant does not pay?", answer: "We chase from the first delay, serve formal notice and start proceedings if needed. With rent guarantee insurance, you keep receiving your rent during the procedure." },
      { question: "Who decides on works?", answer: "You do. We obtain quotes, you approve them, we follow the job. Only emergencies (leak, heating failure) are handled without delay, within the limit agreed in the mandate." },
      { question: "My property is already let — can you take over?", answer: "Yes. We take over the current lease, inform the tenant of the new contact and check that the file is complete." },
      { question: "Can I stop the management?", answer: "The mandate can be terminated with notice, with no exit fee. You get your complete file back and the deposit is transferred as the law provides." },
    ],
  },
  contact: {
    eyebrow: "Contact",
    title: "Let's talk about your property",
    body: "A fifteen-minute call is enough to know whether we can help and on what terms.",
    phoneLabel: "Property management line",
    emailLabel: "Email",
    hint: "Email remains the fastest way to reach us: we reply within one working day.",
  },
};

const es: GestionPageCopy = {
  seo: {
    title: "Gestión de alquileres en Niza — Rentas aseguradas, gestión completa | Sillage Immo",
    description:
      "Confíe la gestión de su piso en Niza a Sillage Immo: alquiler, cobro de rentas, informe mensual, seguro de impago, seguimiento de obras. Honorarios públicos.",
  },
  hero: {
    eyebrow: "Gestión de alquileres",
    title: "Su vivienda alquilada, gestionada, asegurada. Usted, tranquilo.",
    subtitle:
      "De la búsqueda del inquilino al abono de la renta: una gestión completa, un interlocutor, un informe cada mes y honorarios conocidos de antemano.",
    imageAlt: "La plaza Masséna de Niza y su espejo de agua al amanecer",
  },
  ctaCall: "Hablar de mi vivienda",
  ctaEmail: "Escribir a gestión",
  manifesto: {
    title: "Lo que significa gestionar",
    paragraphs: [
      "Alquilar un piso no es cobrar una transferencia cada mes. Es elegir un inquilino con un expediente sólido, redactar un contrato que se sostenga, hacer un inventario que proteja, reclamar la renta, regularizar los gastos, revisar con el índice correcto, responder a una fuga de agua un domingo y saber qué hacer, jurídicamente, el día en que la renta no llega.",
      "En Sillage, la gestión la lleva un equipo que hace esto cada día, con un software de gestión profesional, la garantía financiera y el seguro de responsabilidad civil que exige la ley, y la competencia de un jurista en cada contrato y cada litigio. Usted recibe su renta y su informe, y no tiene que pensar en ello.",
    ],
  },
  services: {
    eyebrow: "Nuestros servicios",
    title: "Todo lo que asumimos",
    blocks: [
      { title: "Puesta en alquiler", body: "Encontrar al inquilino adecuado rápido, sin malvender la renta ni arriesgar con el expediente.", items: ["Renta fijada según el mercado real y la normativa vigente", "Fotos, anuncio y difusión en sillage-immo.com y los portales", "Visitas, selección de expedientes, verificación de garantías", "Contrato, anexos y certificados conformes, inventario de entrada detallado"] },
      { title: "Gestión corriente", body: "El día a día del propietario, sin que tenga que vivirlo.", items: ["Reclamación y cobro de rentas, abono los días 10, 20 y 30: nunca más de diez días entre el pago del inquilino y su transferencia", "Informe de gestión cada mes, resumen anual para su declaración", "Regularización de gastos, revisión anual de la renta", "Relación con el inquilino, la comunidad y los profesionales; presupuestos y seguimiento de obras"] },
      { title: "Seguridad", body: "Lo que le protege cuando algo no sale como estaba previsto.", items: ["Seguro de impago opcional con protección jurídica", "Recordatorios y procedimiento de recobro a nuestro cargo", "Gestión de siniestros y declaraciones al seguro", "Garantía financiera y seguro de responsabilidad civil profesional"] },
    ],
  },
  pricing: {
    eyebrow: "Honorarios",
    title: "Una sola tarifa que lo cubre todo",
    lines: [
      { label: "Gestión de alquileres", value: "7,5 % sin IVA", note: "de la renta cobrada, gastos incluidos. Todo incluido, sin líneas adicionales. No se factura nada mientras la vivienda está vacía." },
      { label: "Seguro de impago", value: "2,8 %", note: "de la renta, opcional. Cubre impagos, daños y gastos de procedimiento." },
      { label: "Puesta en alquiler", value: "Misión aparte", note: "Facturada una vez, a la firma del contrato, dentro del límite legal. No es gestión." },
    ],
    included: {
      title: "Incluido en el 7,5 %, sin suplemento",
      intro: "Una tarifa más baja en otro sitio suele esconder una lista de cargos por acto. Con nosotros, estas prestaciones forman parte de la misión:",
      items: [
        "Representación en la junta de propietarios",
        "Desplazamientos: seguimiento de obras, siniestro, visita anual",
        "Recordatorios, requerimiento y seguimiento del procedimiento en caso de impago",
        "Regularización de gastos y revisión anual de la renta",
        "Declaración y seguimiento de siniestros ante las aseguradoras",
        "Resumen anual para su declaración, certificados y cartas",
        "Inventario de salida y devolución de la fianza",
      ],
    },
    twoMissions: {
      title: "Dos misiones, no una",
      body:
        "Alquilar y gestionar son dos oficios, facturados por separado y en momentos distintos. La puesta en alquiler es puntual: encontrar, seleccionar, contratar; sus honorarios están limitados por ley y se pagan una vez. La gestión es continua: cobrar, seguir, proteger, cada mes, por un 7,5 % sin IVA y nada más. Un presupuesto que mezcla ambas no es comparable con otro.",
    },
    footnote: "Honorarios de gestión deducibles de sus ingresos por alquiler en el régimen real. Sin gastos de entrada ni de salida.",
  },
  steps: {
    eyebrow: "Cómo empieza",
    title: "Cuatro etapas para confiarnos su vivienda",
    items: [
      { title: "Una conversación", body: "Nos describe la vivienda, su situación (vacía, ocupada, en obras) y lo que espera de la gestión." },
      { title: "Una visita y una renta", body: "Visitamos, comprobamos los certificados y fijamos juntos la renta y el calendario." },
      { title: "El mandato de gestión", body: "Un mandato claro, firmado electrónicamente, que enumera lo que hacemos y lo que le debemos." },
      { title: "La toma a cargo", body: "Continuación del contrato en curso o puesta en alquiler, apertura de su expediente, primer informe al mes siguiente." },
    ],
  },
  faq: {
    eyebrow: "Preguntas frecuentes",
    title: "Lo que nos preguntan los propietarios",
    items: [
      { question: "¿Qué pasa si el inquilino no paga?", answer: "Reclamamos desde el primer retraso, enviamos requerimiento e iniciamos el procedimiento si hace falta. Con el seguro de impago, sigue cobrando su renta durante el procedimiento." },
      { question: "¿Quién decide las obras?", answer: "Usted. Obtenemos los presupuestos, usted los valida y nosotros seguimos la intervención. Solo las urgencias (fuga, avería de calefacción) se tratan sin esperar, dentro del límite acordado en el mandato." },
      { question: "Mi vivienda ya está alquilada, ¿pueden asumir la gestión?", answer: "Sí. Continuamos el contrato en curso, informamos al inquilino del cambio de interlocutor y comprobamos que el expediente esté completo." },
      { question: "¿Puedo dejar la gestión?", answer: "El mandato se puede rescindir con preaviso, sin gastos de salida. Recupera su expediente completo y la fianza se transfiere según la ley." },
    ],
  },
  contact: {
    eyebrow: "Contacto",
    title: "Hablemos de su vivienda",
    body: "Una llamada de quince minutos basta para saber si podemos ayudarle y en qué condiciones.",
    phoneLabel: "Línea de gestión",
    emailLabel: "Email",
    hint: "El email sigue siendo lo más rápido: respondemos en un día laborable.",
  },
};

const ru: GestionPageCopy = {
  seo: {
    title: "Управление арендой в Ницце — гарантированные платежи, полное управление | Sillage Immo",
    description:
      "Доверьте управление вашей квартирой в Ницце Sillage Immo: сдача, сбор арендной платы, ежемесячный отчёт, страховка от неплатежей, контроль ремонта. Публичные тарифы.",
  },
  hero: {
    eyebrow: "Управление арендой",
    title: "Ваш объект сдан, управляется, защищён. Вы спокойны.",
    subtitle:
      "От поиска арендатора до перечисления платы: полное управление, один контакт, отчёт каждый месяц и заранее известные тарифы.",
    imageAlt: "Площадь Массена в Ницце и её водное зеркало ранним утром",
  },
  ctaCall: "Обсудить мой объект",
  ctaEmail: "Написать в отдел управления",
  manifesto: {
    title: "Что значит управлять",
    paragraphs: [
      "Сдавать квартиру — это не получать перевод раз в месяц. Это выбрать арендатора по надёжному досье, составить договор, который выдержит проверку, сделать опись, которая защищает, выставить счёт, пересчитать расходы, проиндексировать по правильному индексу, отреагировать на протечку в воскресенье и знать, что делать юридически в тот день, когда плата не приходит.",
      "В Sillage управлением занимается команда, которая делает это ежедневно, с профессиональной программой, финансовой гарантией и страховкой ответственности, как требует закон, и с компетенцией юриста по каждому договору и спору. Вы получаете плату и отчёт — и не думаете об этом.",
    ],
  },
  services: {
    eyebrow: "Наши услуги",
    title: "Всё, что мы берём на себя",
    blocks: [
      { title: "Сдача в аренду", body: "Быстро найти правильного арендатора, не занижая плату и не рискуя с досье.", items: ["Плата по реальному рынку и действующим правилам", "Фото, объявление и продвижение на sillage-immo.com и порталах", "Показы, отбор досье, проверка гарантий", "Договор, приложения и диагностики по закону, подробная опись при въезде"] },
      { title: "Текущее управление", body: "Будни собственника — без вашего участия.", items: ["Выставление и сбор платы, перечисление 10-го, 20-го и 30-го: не более десяти дней между оплатой арендатора и вашим переводом", "Отчёт об управлении каждый месяц, годовая сводка для декларации", "Перерасчёт расходов, ежегодная индексация", "Связь с арендатором, управляющим домом и подрядчиками; сметы и контроль работ"] },
      { title: "Защита", body: "То, что защищает вас, когда что-то идёт не по плану.", items: ["Страховка от неплатежей по желанию, с юридической защитой", "Напоминания и процедура взыскания силами агентства", "Страховые случаи и заявления", "Финансовая гарантия и страхование профессиональной ответственности"] },
    ],
  },
  pricing: {
    eyebrow: "Тарифы",
    title: "Один тариф, который покрывает всё",
    lines: [
      { label: "Управление арендой", value: "7,5 % без НДС", note: "от полученной платы, включая расходы. Всё включено, без дополнительных строк. Пока объект пустует, ничего не начисляется." },
      { label: "Страховка от неплатежей", value: "2,8 %", note: "от платы, по желанию. Покрывает неплатежи, ущерб и судебные расходы." },
      { label: "Сдача в аренду", value: "Отдельная услуга", note: "Оплачивается один раз при подписании договора, в пределах законного максимума. Это не управление." },
    ],
    included: {
      title: "Входит в 7,5 %, без доплат",
      intro: "Более низкая ставка в другом месте часто скрывает прейскурант за каждое действие. У нас эти услуги — часть работы:",
      items: [
        "Представительство на общем собрании собственников",
        "Выезды на объект: контроль работ, страховой случай, ежегодный осмотр",
        "Напоминания, требование и сопровождение процедуры при неплатеже",
        "Перерасчёт расходов и ежегодная индексация платы",
        "Заявление и сопровождение страховых случаев",
        "Годовая сводка для декларации, справки и письма",
        "Опись при выезде и возврат залога",
      ],
    },
    twoMissions: {
      title: "Две услуги, а не одна",
      body:
        "Сдать и управлять — два разных ремесла, которые оплачиваются отдельно и в разное время. Сдача — разовая: найти, отобрать, оформить; её стоимость ограничена законом и платится один раз. Управление — непрерывное: получать, контролировать, защищать, каждый месяц, за 7,5 % без НДС и ничего больше. Смета, в которой смешаны обе, несопоставима с другой.",
    },
    footnote: "Расходы на управление вычитаются из дохода от аренды при реальном режиме. Без платы за вход и выход.",
  },
  steps: {
    eyebrow: "С чего начать",
    title: "Четыре шага, чтобы доверить нам объект",
    items: [
      { title: "Разговор", body: "Вы описываете объект, его состояние (пустой, занят, в ремонте) и чего ждёте от управления." },
      { title: "Осмотр и плата", body: "Мы осматриваем, проверяем диагностики и вместе назначаем плату и календарь." },
      { title: "Договор управления", body: "Понятный договор с электронной подписью: что мы делаем и что вам должны." },
      { title: "Передача", body: "Продолжение текущего договора аренды или сдача, открытие вашего дела, первый отчёт в следующем месяце." },
    ],
  },
  faq: {
    eyebrow: "Частые вопросы",
    title: "О чём спрашивают собственники",
    items: [
      { question: "Что, если арендатор не платит?", answer: "Мы напоминаем с первой задержки, направляем требование и при необходимости начинаем процедуру. Со страховкой от неплатежей вы продолжаете получать плату во время процедуры." },
      { question: "Кто решает по ремонту?", answer: "Вы. Мы получаем сметы, вы их утверждаете, мы контролируем работы. Без ожидания решаются только аварии (протечка, отказ отопления) в пределах, согласованных в договоре." },
      { question: "Объект уже сдан — вы возьмёте управление?", answer: "Да. Мы продолжаем текущий договор, уведомляем арендатора о смене контакта и проверяем полноту досье." },
      { question: "Могу ли я прекратить управление?", answer: "Договор расторгается с уведомлением, без платы за выход. Вы получаете полное досье, залог передаётся по закону." },
    ],
  },
  contact: {
    eyebrow: "Связаться",
    title: "Поговорим о вашем объекте",
    body: "Пятнадцатиминутного звонка достаточно, чтобы понять, можем ли мы помочь и на каких условиях.",
    phoneLabel: "Линия управления арендой",
    emailLabel: "Email",
    hint: "Быстрее всего — по email: отвечаем в течение рабочего дня.",
  },
};

export const GESTION_COPY: Record<AppLocale, GestionPageCopy> = { fr, en, es, ru };

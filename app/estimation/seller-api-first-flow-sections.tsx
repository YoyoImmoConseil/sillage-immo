"use client";

import { useRouter } from "next/navigation";
import type { AppLocale } from "@/lib/i18n/config";
import { formatCurrency } from "@/lib/i18n/format";
import { localizePath } from "@/lib/i18n/routing";
import { AddressAutocompleteInput } from "./address-autocomplete-input";
import { SellerResultChat } from "./seller-result-chat";
import {
  toOptionalInteger,
  type FlowForm,
  type UpdateFlowForm,
  type ValuationResult,
} from "./seller-api-first-flow.shared";

type SellerProjectFormSectionProps = {
  locale?: AppLocale;
  form: FlowForm;
  loading: boolean;
  onUpdate: UpdateFlowForm;
  onSendOtp: () => void;
};

export function SellerProjectFormSection({
  locale = "fr",
  form,
  loading,
  onUpdate,
  onSendOtp,
}: SellerProjectFormSectionProps) {
  const copy = {
    fr: {
      title: "Étape 1 - Votre projet et votre bien",
      intro:
        "Quelques informations simples pour cadrer votre estimation et vous proposer un accompagnement vraiment adapté à votre situation.",
      contactDetails: "Vos coordonnées",
      firstName: "Prénom *",
      lastName: "Nom *",
      email: "Email *",
      phone: "Téléphone",
      firstNamePlaceholder: "Ex: Marie",
      lastNamePlaceholder: "Ex: Dupont",
      emailPlaceholder: "Ex: marie.dupont@email.com",
      phonePlaceholder: "Ex: 06 12 34 56 78",
      project: "Votre projet",
      projectTimeline: "Où en est votre projet de vente ?",
      timelineAlreadyListed: "J'ai déjà mis en vente",
      timelineListNow: "Je veux mettre en vente maintenant",
      timelineListWithin6Months: "Je veux mettre en vente dans les 6 mois",
      timelineSelfSellFirst: "Je veux commencer à vendre par moi-même sans agence",
      timelineEarlyReflection: "Je commence juste à réfléchir au projet",
      timelinePersonalInfoOnly: "J'ai juste besoin de l'information pour des raisons personnelles",
      addressAndType: "Adresse et type de bien",
      propertyType: "Type de bien",
      propertyTypeApartment: "Appartement",
      propertyTypeHouse: "Maison",
      propertyTypeVilla: "Villa",
      propertyTypeOther: "Autre",
      city: "Ville *",
      postalCode: "Code postal *",
      cityPlaceholder: "Ex: Nice",
      postalCodePlaceholder: "Ex: 06000",
      characteristics: "Caractéristiques du bien",
      surface: "Surface (m²)",
      rooms: "Pièces",
      floor: "Étage",
      buildingTotalFloors: "Nombre d'étages dans l'immeuble",
      surfacePlaceholder: "Ex: 78",
      roomsPlaceholder: "Ex: 3",
      floorPlaceholder: "Ex: 4",
      buildingTotalFloorsPlaceholder: "Ex: 6",
      terrace: "Terrasse *",
      terraceArea: "Taille de la terrasse (m²)",
      terraceAreaPlaceholder: "Ex: 12",
      balcony: "Balcon *",
      balconyArea: "Taille du balcon (m²)",
      balconyAreaPlaceholder: "Ex: 6",
      select: "Sélectionner",
      yes: "Oui",
      no: "Non",
      exposure: "Exposition du séjour",
      exposureNorth: "Nord",
      exposureNorthEast: "Nord Est",
      exposureEast: "Est",
      exposureSouthEast: "Sud Est",
      exposureSouth: "Sud",
      exposureSouthWest: "Sud Ouest",
      exposureWest: "Ouest",
      exposureNorthWest: "Nord Ouest",
      elevator: "Ascenseur *",
      apartmentCondition: "État de l'appartement *",
      apartmentConditionToRenovate: "À rénover",
      apartmentConditionRenovated20: "Rénové il y a 20 ans",
      apartmentConditionRenovated10: "Rénové il y a 10 ans",
      apartmentConditionRenovated5: "Rénové il y a moins de 5 ans",
      apartmentConditionNew: "Neuf",
      buildingAge: "Âge de l'immeuble (optionnel)",
      notSpecified: "Non renseigné",
      buildingAgeOld: "Ancien (jusqu'à 1950)",
      buildingAgeRecent: "Récent (1950-1970)",
      buildingAgeModern: "Moderne (1980 - Aujourd'hui)",
      seaView: "Vue mer",
      seaViewPanoramic: "Vue mer panoramique",
      seaViewClassic: "Vue mer classique",
      seaViewLateral: "Vue mer latérale",
      topFloor: "Dernier étage",
      usefulInfo: "Informations utiles (optionnel)",
      usefulInfoPlaceholder: "Ex : travaux récents, contraintes de calendrier, contexte particulier...",
      send: "Étape 2 - Sécuriser mon email",
      sending: "Envoi...",
    },
    en: {
      title: "Step 1 - Your project and property",
      intro:
        "A few simple details to frame your valuation and offer guidance that truly fits your situation.",
      contactDetails: "Your contact details",
      firstName: "First name *",
      lastName: "Last name *",
      email: "Email *",
      phone: "Phone",
      firstNamePlaceholder: "Ex: Marie",
      lastNamePlaceholder: "Ex: Dupont",
      emailPlaceholder: "Ex: marie.dupont@email.com",
      phonePlaceholder: "Ex: +33 6 12 34 56 78",
      project: "Your project",
      projectTimeline: "Where are you in your selling project?",
      timelineAlreadyListed: "I have already listed the property",
      timelineListNow: "I want to sell now",
      timelineListWithin6Months: "I want to sell within 6 months",
      timelineSelfSellFirst: "I want to start by selling on my own without an agency",
      timelineEarlyReflection: "I am just starting to think about the project",
      timelinePersonalInfoOnly: "I only need information for personal reasons",
      addressAndType: "Address and property type",
      propertyType: "Property type",
      propertyTypeApartment: "Apartment",
      propertyTypeHouse: "House",
      propertyTypeVilla: "Villa",
      propertyTypeOther: "Other",
      city: "City *",
      postalCode: "Postal code *",
      cityPlaceholder: "Ex: Nice",
      postalCodePlaceholder: "Ex: 06000",
      characteristics: "Property features",
      surface: "Surface area (sqm)",
      rooms: "Rooms",
      floor: "Floor",
      buildingTotalFloors: "Number of floors in the building",
      surfacePlaceholder: "Ex: 78",
      roomsPlaceholder: "Ex: 3",
      floorPlaceholder: "Ex: 4",
      buildingTotalFloorsPlaceholder: "Ex: 6",
      terrace: "Terrace *",
      terraceArea: "Terrace size (sqm)",
      terraceAreaPlaceholder: "Ex: 12",
      balcony: "Balcony *",
      balconyArea: "Balcony size (sqm)",
      balconyAreaPlaceholder: "Ex: 6",
      select: "Select",
      yes: "Yes",
      no: "No",
      exposure: "Living room exposure",
      exposureNorth: "North",
      exposureNorthEast: "North-East",
      exposureEast: "East",
      exposureSouthEast: "South-East",
      exposureSouth: "South",
      exposureSouthWest: "South-West",
      exposureWest: "West",
      exposureNorthWest: "North-West",
      elevator: "Elevator *",
      apartmentCondition: "Apartment condition *",
      apartmentConditionToRenovate: "To renovate",
      apartmentConditionRenovated20: "Renovated 20 years ago",
      apartmentConditionRenovated10: "Renovated 10 years ago",
      apartmentConditionRenovated5: "Renovated less than 5 years ago",
      apartmentConditionNew: "New",
      buildingAge: "Building age (optional)",
      notSpecified: "Not provided",
      buildingAgeOld: "Historic (up to 1950)",
      buildingAgeRecent: "Recent (1950-1970)",
      buildingAgeModern: "Modern (1980 - today)",
      seaView: "Sea view",
      seaViewPanoramic: "Panoramic sea view",
      seaViewClassic: "Sea view",
      seaViewLateral: "Partial sea view",
      topFloor: "Top floor",
      usefulInfo: "Useful details (optional)",
      usefulInfoPlaceholder: "Ex: recent works, timing constraints, special context...",
      send: "Step 2 - Secure my email",
      sending: "Sending...",
    },
    es: {
      title: "Paso 1 - Su proyecto y su inmueble",
      intro:
        "Algunos datos sencillos para enmarcar su valoración y proponerle un acompañamiento realmente adaptado a su situación.",
      contactDetails: "Sus datos de contacto",
      firstName: "Nombre *",
      lastName: "Apellidos *",
      email: "Email *",
      phone: "Teléfono",
      firstNamePlaceholder: "Ej: María",
      lastNamePlaceholder: "Ej: Dupont",
      emailPlaceholder: "Ej: maria.dupont@email.com",
      phonePlaceholder: "Ej: +33 6 12 34 56 78",
      project: "Su proyecto",
      projectTimeline: "¿En qué punto se encuentra su proyecto de venta?",
      timelineAlreadyListed: "Ya he puesto el inmueble en venta",
      timelineListNow: "Quiero ponerlo en venta ahora",
      timelineListWithin6Months: "Quiero ponerlo en venta en los próximos 6 meses",
      timelineSelfSellFirst: "Quiero empezar a vender por mi cuenta sin agencia",
      timelineEarlyReflection: "Apenas estoy empezando a pensar en el proyecto",
      timelinePersonalInfoOnly: "Solo necesito la información por motivos personales",
      addressAndType: "Dirección y tipo de inmueble",
      propertyType: "Tipo de inmueble",
      propertyTypeApartment: "Apartamento",
      propertyTypeHouse: "Casa",
      propertyTypeVilla: "Villa",
      propertyTypeOther: "Otro",
      city: "Ciudad *",
      postalCode: "Código postal *",
      cityPlaceholder: "Ej: Niza",
      postalCodePlaceholder: "Ej: 06000",
      characteristics: "Características del inmueble",
      surface: "Superficie (m²)",
      rooms: "Habitaciones",
      floor: "Planta",
      buildingTotalFloors: "Número de plantas del edificio",
      surfacePlaceholder: "Ej: 78",
      roomsPlaceholder: "Ej: 3",
      floorPlaceholder: "Ej: 4",
      buildingTotalFloorsPlaceholder: "Ej: 6",
      terrace: "Terraza *",
      terraceArea: "Tamaño de la terraza (m²)",
      terraceAreaPlaceholder: "Ej: 12",
      balcony: "Balcón *",
      balconyArea: "Tamaño del balcón (m²)",
      balconyAreaPlaceholder: "Ej: 6",
      select: "Seleccionar",
      yes: "Sí",
      no: "No",
      exposure: "Orientación del salón",
      exposureNorth: "Norte",
      exposureNorthEast: "Noreste",
      exposureEast: "Este",
      exposureSouthEast: "Sureste",
      exposureSouth: "Sur",
      exposureSouthWest: "Suroeste",
      exposureWest: "Oeste",
      exposureNorthWest: "Noroeste",
      elevator: "Ascensor *",
      apartmentCondition: "Estado del apartamento *",
      apartmentConditionToRenovate: "Para reformar",
      apartmentConditionRenovated20: "Reformado hace 20 años",
      apartmentConditionRenovated10: "Reformado hace 10 años",
      apartmentConditionRenovated5: "Reformado hace menos de 5 años",
      apartmentConditionNew: "Nuevo",
      buildingAge: "Antigüedad del edificio (opcional)",
      notSpecified: "No indicado",
      buildingAgeOld: "Antiguo (hasta 1950)",
      buildingAgeRecent: "Reciente (1950-1970)",
      buildingAgeModern: "Moderno (1980 - hoy)",
      seaView: "Vista al mar",
      seaViewPanoramic: "Vista panorámica al mar",
      seaViewClassic: "Vista al mar",
      seaViewLateral: "Vista lateral al mar",
      topFloor: "Última planta",
      usefulInfo: "Información útil (opcional)",
      usefulInfoPlaceholder: "Ej: obras recientes, restricciones de calendario, contexto particular...",
      send: "Paso 2 - Asegurar mi email",
      sending: "Envío...",
    },
    ru: {
      title: "Шаг 1 - Ваш проект и ваш объект",
      intro:
        "Несколько простых данных, чтобы подготовить оценку и предложить сопровождение, действительно подходящее вашей ситуации.",
      contactDetails: "Ваши контактные данные",
      firstName: "Имя *",
      lastName: "Фамилия *",
      email: "Email *",
      phone: "Телефон",
      firstNamePlaceholder: "Например: Мария",
      lastNamePlaceholder: "Например: Иванова",
      emailPlaceholder: "Например: maria.dupont@email.com",
      phonePlaceholder: "Например: +33 6 12 34 56 78",
      project: "Ваш проект",
      projectTimeline: "На каком этапе находится ваш проект продажи?",
      timelineAlreadyListed: "Я уже выставил объект на продажу",
      timelineListNow: "Я хочу выставить объект на продажу сейчас",
      timelineListWithin6Months: "Я хочу выставить объект на продажу в течение 6 месяцев",
      timelineSelfSellFirst: "Я хочу сначала попробовать продавать самостоятельно без агентства",
      timelineEarlyReflection: "Я только начинаю задумываться о проекте",
      timelinePersonalInfoOnly: "Мне нужна только информация по личным причинам",
      addressAndType: "Адрес и тип объекта",
      propertyType: "Тип объекта",
      propertyTypeApartment: "Квартира",
      propertyTypeHouse: "Дом",
      propertyTypeVilla: "Вилла",
      propertyTypeOther: "Другое",
      city: "Город *",
      postalCode: "Почтовый индекс *",
      cityPlaceholder: "Например: Ницца",
      postalCodePlaceholder: "Например: 06000",
      characteristics: "Характеристики объекта",
      surface: "Площадь (м²)",
      rooms: "Комнаты",
      floor: "Этаж",
      buildingTotalFloors: "Количество этажей в здании",
      surfacePlaceholder: "Например: 78",
      roomsPlaceholder: "Например: 3",
      floorPlaceholder: "Например: 4",
      buildingTotalFloorsPlaceholder: "Например: 6",
      terrace: "Терраса *",
      terraceArea: "Площадь террасы (м²)",
      terraceAreaPlaceholder: "Например: 12",
      balcony: "Балкон *",
      balconyArea: "Площадь балкона (м²)",
      balconyAreaPlaceholder: "Например: 6",
      select: "Выбрать",
      yes: "Да",
      no: "Нет",
      exposure: "Ориентация гостиной",
      exposureNorth: "Север",
      exposureNorthEast: "Северо-восток",
      exposureEast: "Восток",
      exposureSouthEast: "Юго-восток",
      exposureSouth: "Юг",
      exposureSouthWest: "Юго-запад",
      exposureWest: "Запад",
      exposureNorthWest: "Северо-запад",
      elevator: "Лифт *",
      apartmentCondition: "Состояние квартиры *",
      apartmentConditionToRenovate: "Требует ремонта",
      apartmentConditionRenovated20: "Отремонтировано 20 лет назад",
      apartmentConditionRenovated10: "Отремонтировано 10 лет назад",
      apartmentConditionRenovated5: "Отремонтировано менее 5 лет назад",
      apartmentConditionNew: "Новое",
      buildingAge: "Возраст здания (необязательно)",
      notSpecified: "Не указано",
      buildingAgeOld: "Старое здание (до 1950 года)",
      buildingAgeRecent: "Недавнее (1950-1970)",
      buildingAgeModern: "Современное (1980 - сегодня)",
      seaView: "Вид на море",
      seaViewPanoramic: "Панорамный вид на море",
      seaViewClassic: "Вид на море",
      seaViewLateral: "Боковой вид на море",
      topFloor: "Последний этаж",
      usefulInfo: "Полезная информация (необязательно)",
      usefulInfoPlaceholder: "Например: недавние работы, ограничения по срокам, особый контекст...",
      send: "Шаг 2 - Подтвердить мой email",
      sending: "Отправка...",
    },
  }[locale];
  const topFloorKnown =
    toOptionalInteger(form.floor) !== undefined &&
    toOptionalInteger(form.buildingTotalFloors) !== undefined;

  return (
    <section className="rounded-2xl border border-[rgba(20,20,70,0.2)] bg-[#f4ece4] p-6 space-y-4">
      <h2 className="sillage-section-title">{copy.title}</h2>
      <p className="text-sm opacity-75">{copy.intro}</p>
      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <p className="sm:col-span-2 text-xs uppercase tracking-wide opacity-70">
          {copy.contactDetails}
        </p>
        <label>
          {copy.firstName}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.firstName}
            onChange={(event) => onUpdate("firstName", event.target.value)}
            placeholder={copy.firstNamePlaceholder}
          />
        </label>
        <label>
          {copy.lastName}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.lastName}
            onChange={(event) => onUpdate("lastName", event.target.value)}
            placeholder={copy.lastNamePlaceholder}
          />
        </label>
        <label>
          {copy.email}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type="email"
            value={form.email}
            onChange={(event) => onUpdate("email", event.target.value)}
            placeholder={copy.emailPlaceholder}
          />
        </label>
        <label>
          {copy.phone}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.phone}
            onChange={(event) => onUpdate("phone", event.target.value)}
            placeholder={copy.phonePlaceholder}
          />
        </label>

        <p className="sm:col-span-2 text-xs uppercase tracking-wide opacity-70">{copy.project}</p>
        <label className="sm:col-span-2">
          {copy.projectTimeline}
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.timeline}
            onChange={(event) => onUpdate("timeline", event.target.value as FlowForm["timeline"])}
          >
            <option value="already_listed">{copy.timelineAlreadyListed}</option>
            <option value="list_now">{copy.timelineListNow}</option>
            <option value="list_within_6_months">{copy.timelineListWithin6Months}</option>
            <option value="self_sell_first">
              {copy.timelineSelfSellFirst}
            </option>
            <option value="early_reflection">{copy.timelineEarlyReflection}</option>
            <option value="personal_information_only">
              {copy.timelinePersonalInfoOnly}
            </option>
          </select>
        </label>

        <p className="sm:col-span-2 text-xs uppercase tracking-wide opacity-70">
          {copy.addressAndType}
        </p>
        <label>
          {copy.propertyType}
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.propertyType}
            onChange={(event) => onUpdate("propertyType", event.target.value as FlowForm["propertyType"])}
          >
            <option value="appartement">{copy.propertyTypeApartment}</option>
            <option value="maison">{copy.propertyTypeHouse}</option>
            <option value="villa">{copy.propertyTypeVilla}</option>
            <option value="autre">{copy.propertyTypeOther}</option>
          </select>
        </label>
        <AddressAutocompleteInput
          locale={locale}
          value={form.propertyAddress}
          cityValue={form.city}
          postalCodeValue={form.postalCode}
          onAddressChange={(value) => onUpdate("propertyAddress", value)}
          onAddressSelected={(data) => {
            onUpdate("propertyAddress", data.address);
            if (data.city) onUpdate("city", data.city);
            if (data.postalCode) onUpdate("postalCode", data.postalCode);
          }}
          disabled={loading}
        />
        <label>
          {copy.city}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.city}
            onChange={(event) => onUpdate("city", event.target.value)}
            placeholder={copy.cityPlaceholder}
          />
        </label>
        <label>
          {copy.postalCode}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.postalCode}
            onChange={(event) => onUpdate("postalCode", event.target.value)}
            placeholder={copy.postalCodePlaceholder}
          />
        </label>

        <p className="sm:col-span-2 text-xs uppercase tracking-wide opacity-70">
          {copy.characteristics}
        </p>
        <label>
          {copy.surface}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.livingArea}
            onChange={(event) => onUpdate("livingArea", event.target.value)}
            placeholder={copy.surfacePlaceholder}
          />
        </label>
        <label>
          {copy.rooms}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.rooms}
            onChange={(event) => onUpdate("rooms", event.target.value)}
            placeholder={copy.roomsPlaceholder}
          />
        </label>
        <label>
          {copy.floor}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.floor}
            onChange={(event) => onUpdate("floor", event.target.value)}
            placeholder={copy.floorPlaceholder}
          />
        </label>
        <label>
          {copy.buildingTotalFloors}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.buildingTotalFloors}
            onChange={(event) => onUpdate("buildingTotalFloors", event.target.value)}
            placeholder={copy.buildingTotalFloorsPlaceholder}
          />
        </label>
        <label>
          {copy.terrace}
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.terrace}
            onChange={(event) => onUpdate("terrace", event.target.value as FlowForm["terrace"])}
          >
            <option value="">{copy.select}</option>
            <option value="yes">{copy.yes}</option>
            <option value="no">{copy.no}</option>
          </select>
        </label>
        {form.terrace === "yes" ? (
          <label>
            {copy.terraceArea}
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.terraceArea}
              onChange={(event) => onUpdate("terraceArea", event.target.value)}
              placeholder={copy.terraceAreaPlaceholder}
            />
          </label>
        ) : null}
        <label>
          {copy.balcony}
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.balcony}
            onChange={(event) => onUpdate("balcony", event.target.value as FlowForm["balcony"])}
          >
            <option value="">{copy.select}</option>
            <option value="yes">{copy.yes}</option>
            <option value="no">{copy.no}</option>
          </select>
        </label>
        {form.balcony === "yes" ? (
          <label>
            {copy.balconyArea}
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.balconyArea}
              onChange={(event) => onUpdate("balconyArea", event.target.value)}
              placeholder={copy.balconyAreaPlaceholder}
            />
          </label>
        ) : null}
        <label>
          {copy.exposure}
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.livingExposure}
            onChange={(event) =>
              onUpdate("livingExposure", event.target.value as FlowForm["livingExposure"])
            }
          >
            <option value="">{copy.select}</option>
            <option value="north">{copy.exposureNorth}</option>
            <option value="north_east">{copy.exposureNorthEast}</option>
            <option value="east">{copy.exposureEast}</option>
            <option value="south_east">{copy.exposureSouthEast}</option>
            <option value="south">{copy.exposureSouth}</option>
            <option value="south_west">{copy.exposureSouthWest}</option>
            <option value="west">{copy.exposureWest}</option>
            <option value="north_west">{copy.exposureNorthWest}</option>
          </select>
        </label>
        <label>
          {copy.elevator}
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.elevator}
            onChange={(event) => onUpdate("elevator", event.target.value as FlowForm["elevator"])}
          >
            <option value="">{copy.select}</option>
            <option value="yes">{copy.yes}</option>
            <option value="no">{copy.no}</option>
          </select>
        </label>
        <label>
          {copy.apartmentCondition}
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.apartmentCondition}
            onChange={(event) =>
              onUpdate("apartmentCondition", event.target.value as FlowForm["apartmentCondition"])
            }
          >
            <option value="">{copy.select}</option>
            <option value="a_renover">{copy.apartmentConditionToRenovate}</option>
            <option value="renove_20_ans">{copy.apartmentConditionRenovated20}</option>
            <option value="renove_10_ans">{copy.apartmentConditionRenovated10}</option>
            <option value="renove_moins_5_ans">{copy.apartmentConditionRenovated5}</option>
            <option value="neuf">{copy.apartmentConditionNew}</option>
          </select>
        </label>
        <label>
          {copy.buildingAge}
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.buildingAge}
            onChange={(event) => onUpdate("buildingAge", event.target.value as FlowForm["buildingAge"])}
          >
            <option value="">{copy.notSpecified}</option>
            <option value="ancien_1950">{copy.buildingAgeOld}</option>
            <option value="recent_1950_1970">{copy.buildingAgeRecent}</option>
            <option value="moderne_1980_today">{copy.buildingAgeModern}</option>
          </select>
        </label>
        <label>
          {copy.seaView}
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.seaView}
            onChange={(event) => onUpdate("seaView", event.target.value as FlowForm["seaView"])}
          >
            <option value="">{copy.notSpecified}</option>
            <option value="none">{copy.no}</option>
            <option value="panoramic">{copy.seaViewPanoramic}</option>
            <option value="classic">{copy.seaViewClassic}</option>
            <option value="lateral">{copy.seaViewLateral}</option>
          </select>
        </label>
        {topFloorKnown ? (
          <p className="sm:col-span-2 text-xs opacity-70">
            {copy.topFloor} :{" "}
            <strong>
              {toOptionalInteger(form.floor) === toOptionalInteger(form.buildingTotalFloors)
                ? copy.yes
                : copy.no}
            </strong>
          </p>
        ) : null}
        <label className="sm:col-span-2">
          {copy.usefulInfo}
          <textarea
            className="mt-1 w-full rounded border px-3 py-2"
            rows={3}
            value={form.message}
            onChange={(event) => onUpdate("message", event.target.value)}
            placeholder={copy.usefulInfoPlaceholder}
          />
        </label>
      </div>

      <button
        className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60"
        type="button"
        disabled={
          loading ||
          !form.email ||
          !form.firstName ||
          !form.lastName ||
          !form.propertyAddress ||
          !form.terrace ||
          !form.balcony ||
          !form.elevator ||
          !form.apartmentCondition
        }
        onClick={onSendOtp}
      >
        {loading ? copy.sending : copy.send}
      </button>
    </section>
  );
}

type SellerEmailVerificationSectionProps = {
  locale?: AppLocale;
  otp: string;
  loading: boolean;
  previewCode: string | null;
  verificationToken: string | null;
  isEstimating: boolean;
  estimateProgress: number;
  onOtpChange: (value: string) => void;
  onVerifyOtp: () => void;
  onEstimateAndCreate: () => void;
};

export function SellerEmailVerificationSection({
  locale = "fr",
  otp,
  loading,
  previewCode,
  verificationToken,
  isEstimating,
  estimateProgress,
  onOtpChange,
  onVerifyOtp,
  onEstimateAndCreate,
}: SellerEmailVerificationSectionProps) {
  const copy = {
    fr: {
      title: "Étape 2 - Vérification de votre email",
      intro: "Entrez le code reçu par email pour finaliser la sécurisation de votre demande.",
      code: "Code email",
      verify: "Valider le code",
      verifying: "Vérification...",
      dev: "Mode dev : code OTP =",
      estimate: "Étape 3 - Obtenir mon estimation précise",
      estimating: "Calcul en cours...",
      progress: "Analyse en cours...",
    },
    en: {
      title: "Step 2 - Verify your email",
      intro: "Enter the code received by email to finalize and secure your request.",
      code: "Email code",
      verify: "Validate code",
      verifying: "Verifying...",
      dev: "Dev mode: OTP code =",
      estimate: "Step 3 - Get my detailed valuation",
      estimating: "Calculating...",
      progress: "Analysis in progress...",
    },
    es: {
      title: "Paso 2 - Verificación de su email",
      intro: "Introduzca el código recibido por email para finalizar y asegurar su solicitud.",
      code: "Código por email",
      verify: "Validar código",
      verifying: "Verificando...",
      dev: "Modo dev: código OTP =",
      estimate: "Paso 3 - Obtener mi valoración detallada",
      estimating: "Calculando...",
      progress: "Análisis en curso...",
    },
    ru: {
      title: "Шаг 2 - Подтверждение email",
      intro: "Введите код, полученный по email, чтобы завершить и защитить вашу заявку.",
      code: "Код из email",
      verify: "Подтвердить код",
      verifying: "Проверка...",
      dev: "Режим dev: OTP-код =",
      estimate: "Шаг 3 - Получить точную оценку",
      estimating: "Расчет...",
      progress: "Идет анализ...",
    },
  }[locale];
  return (
    <section className="rounded-2xl bg-[#141446] p-6 text-[#f4ece4] space-y-4">
      <h2 className="sillage-section-title">{copy.title}</h2>
      <p className="text-sm text-[#f4ece4]/80">{copy.intro}</p>
      <div className="flex gap-3 items-end flex-wrap">
        <label className="text-sm">
          {copy.code}
          <input
            className="mt-1 rounded border px-3 py-2"
            value={otp}
            onChange={(event) => onOtpChange(event.target.value)}
          />
        </label>
        <button
          className="rounded bg-[#f4ece4] px-4 py-2 text-sm text-[#141446] disabled:opacity-60"
          type="button"
          disabled={loading || otp.trim().length < 4}
          onClick={onVerifyOtp}
        >
          {loading ? copy.verifying : copy.verify}
        </button>
      </div>
      {previewCode ? (
        <p className="text-xs text-amber-700">
          {copy.dev} <code>{previewCode}</code>
        </p>
      ) : null}
      {verificationToken ? (
        <div className="space-y-3">
          <button
            className="rounded bg-[#f4ece4] px-4 py-2 text-sm text-[#141446] disabled:opacity-60"
            type="button"
            disabled={loading}
            onClick={onEstimateAndCreate}
          >
            {loading ? copy.estimating : copy.estimate}
          </button>
          {isEstimating ? (
            <div className="space-y-1">
              <div className="h-2 w-full overflow-hidden rounded bg-[rgba(244,236,228,0.4)]">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${estimateProgress}%`,
                    backgroundColor: "var(--sillage-blue)",
                  }}
                />
              </div>
              <p className="text-xs opacity-70">{copy.progress} {estimateProgress}%</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

type SellerEstimationResultSectionProps = {
  locale?: AppLocale;
  valuation: ValuationResult;
  form: FlowForm;
  thankYouAccessToken: string;
  portalAccessEmail: string | null;
  portalAccessStatus: "idle" | "sending" | "sent" | "error";
  portalAccessMessage: string | null;
  onResendPortalAccess?: () => void;
};

export function SellerEstimationResultSection({
  locale = "fr",
  valuation,
  form,
  thankYouAccessToken,
  portalAccessEmail,
  portalAccessStatus,
  portalAccessMessage,
  onResendPortalAccess,
}: SellerEstimationResultSectionProps) {
  const router = useRouter();
  const copy = {
    fr: {
      title: "Votre estimation est prête",
      range: "Fourchette estimée",
      value: "Valeur estimée (indicative)",
      pending:
        "Estimation en cours de finalisation. Un conseiller vous partage la fourchette précise très rapidement.",
      why: "Pourquoi confier la vente à Sillage Immo ?",
      next: "Votre prochain pas (recommandé)",
      portal: "Accès à votre espace client",
      portalHint: "Ouvrez le lien reçu par email pour activer ou retrouver votre espace client vendeur.",
      portalSending: "Envoi du lien en cours...",
      resend: "Renvoyer mon lien d'accès",
      finalize: "Finaliser et être rappelé par un conseiller",
    },
    en: {
      title: "Your valuation is ready",
      range: "Estimated range",
      value: "Estimated value (indicative)",
      pending: "Your valuation is being finalized. One of our advisors will share the detailed range very soon.",
      why: "Why entrust your sale to Sillage Immo?",
      next: "Your next step (recommended)",
      portal: "Access to your client portal",
      portalHint: "Open the email link to activate or recover your seller portal.",
      portalSending: "Sending the link...",
      resend: "Resend my access link",
      finalize: "Finalize and receive a callback from an advisor",
    },
    es: {
      title: "Su valoración está lista",
      range: "Rango estimado",
      value: "Valor estimado (orientativo)",
      pending: "Su valoración se está finalizando. Un asesor le compartirá muy pronto la horquilla detallada.",
      why: "¿Por qué confiar la venta a Sillage Immo?",
      next: "Su siguiente paso (recomendado)",
      portal: "Acceso a su espacio cliente",
      portalHint: "Abra el enlace recibido por email para activar o recuperar su espacio cliente vendedor.",
      portalSending: "Enviando el enlace...",
      resend: "Reenviar mi enlace de acceso",
      finalize: "Finalizar y ser llamado por un asesor",
    },
    ru: {
      title: "Ваша оценка готова",
      range: "Оценочный диапазон",
      value: "Оценочная стоимость (ориентировочно)",
      pending: "Оценка находится на финальной стадии. Наш консультант очень скоро сообщит вам точный диапазон.",
      why: "Почему стоит доверить продажу Sillage Immo?",
      next: "Ваш следующий шаг (рекомендуется)",
      portal: "Доступ к клиентскому пространству",
      portalHint: "Откройте ссылку из письма, чтобы активировать или восстановить ваше пространство продавца.",
      portalSending: "Отправляем ссылку...",
      resend: "Отправить ссылку повторно",
      finalize: "Завершить и получить обратный звонок от консультанта",
    },
  }[locale];
  const formatLocalizedEur = (value: number) => formatCurrency(value, locale, "EUR");

  return (
    <section className="rounded-2xl border border-[rgba(20,20,70,0.2)] bg-[#f4ece4] p-6 space-y-3">
      <h2 className="sillage-section-title">{copy.title}</h2>
      <p className="text-sm opacity-75">
        {valuation.addressLabel ?? form.propertyAddress} {valuation.cityZipCode ?? form.postalCode}{" "}
        {valuation.cityName ?? form.city}
      </p>
      <p className="text-sm">
        {valuation.valuationPriceLow !== null || valuation.valuationPriceHigh !== null ? (
          <>
            {copy.range} :{" "}
            <strong>
              {valuation.valuationPriceLow !== null ? formatLocalizedEur(valuation.valuationPriceLow) : "-"} -{" "}
              {valuation.valuationPriceHigh !== null ? formatLocalizedEur(valuation.valuationPriceHigh) : "-"}
            </strong>
          </>
        ) : valuation.valuationPrice !== null ? (
          <>
            {copy.value} : <strong>{formatLocalizedEur(valuation.valuationPrice)}</strong>
          </>
        ) : (
          <>{copy.pending}</>
        )}
      </p>
      <div className="rounded-xl border border-[rgba(20,20,70,0.22)] bg-[rgba(244,236,228,0.9)] p-4 space-y-2">
        <h3 className="text-sm font-semibold">{copy.why}</h3>
        <ul className="text-sm space-y-2 list-disc pl-5">
          <li>
            Positionnement premium local à Nice et sur la Côte d&apos;Azur pour capter des acheteurs
            qualifiés.
          </li>
          <li>
            Stratégie de mise en vente sur mesure (prix, présentation, ciblage, diffusion) pour
            accélérer les visites utiles.
          </li>
          <li>
            Accompagnement complet : diagnostics, documents syndic, cadrage juridique et négociation.
          </li>
        </ul>
        <p className="text-xs opacity-70">
          Objectif : vous aider à vendre au bon prix, dans le bon délai, avec un pilotage clair à
          chaque étape.
        </p>
      </div>
      <div className="rounded-xl border border-[rgba(20,20,70,0.22)] p-4 space-y-1">
        <p className="text-sm font-medium">{copy.next}</p>
        <p className="text-sm opacity-80">
          Finalisez votre demande pour recevoir un appel de cadrage avec un interlocuteur unique et un
          plan de commercialisation sur-mesure.
        </p>
      </div>
      {portalAccessStatus !== "idle" || portalAccessMessage ? (
        <div className="rounded-xl border border-[rgba(20,20,70,0.22)] bg-[rgba(244,236,228,0.9)] p-4 space-y-2">
          <p className="text-sm font-medium">{copy.portal}</p>
          {portalAccessMessage ? <p className="text-sm opacity-80">{portalAccessMessage}</p> : null}
          {portalAccessStatus === "sent" && portalAccessEmail ? (
            <p className="text-xs opacity-70">
              {copy.portalHint}
            </p>
          ) : null}
          {portalAccessStatus === "sending" ? (
            <p className="text-xs opacity-70">{copy.portalSending}</p>
          ) : null}
          {portalAccessStatus === "error" && onResendPortalAccess ? (
            <button
              type="button"
              className="rounded border border-[#141446]/20 px-4 py-2 text-sm text-[#141446]"
              onClick={onResendPortalAccess}
            >
              {copy.resend}
            </button>
          ) : null}
        </div>
      ) : null}
      <SellerResultChat accessToken={thankYouAccessToken} locale={locale} />
      <button
        type="button"
        className="sillage-btn rounded px-4 py-2 text-sm"
        onClick={() =>
          router.push(
            `${localizePath("/merci-vendeur", locale)}?access=${encodeURIComponent(thankYouAccessToken)}`
          )
        }
      >
        {copy.finalize}
      </button>
    </section>
  );
}
